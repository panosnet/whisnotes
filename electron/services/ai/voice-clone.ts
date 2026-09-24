import { spawn, ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { app, BrowserWindow } from 'electron'
import Store from 'electron-store'

const store = new Store()
const __dirname = dirname(fileURLToPath(import.meta.url))

const projectRoot = app.isPackaged
  ? dirname(app.getPath('exe'))
  : join(__dirname, '../../../')

const venvPython = join(projectRoot, 'venv/bin/python3')
const ttsScript  = join(projectRoot, 'tts_server.py')
const voicesDir  = join(app.getPath('userData'), 'voices')
const synthDir   = join(app.getPath('userData'), 'voice-synthesis')

mkdirSync(voicesDir, { recursive: true })
mkdirSync(synthDir,  { recursive: true })

// ── Persistent TTS subprocess ─────────────────────────────────────────────────

export class VoiceCloneService {
  private process: ChildProcess | null = null
  private pendingResolve: ((r: any) => void) | null = null
  private pendingReject:  ((e: Error) => void) | null = null
  private timeoutHandle: NodeJS.Timeout | null = null
  private stdoutBuffer = ''

  private sendToAll(channel: string, data: any) {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
  }

  private ensureProcess(): ChildProcess {
    if (this.process && !this.process.killed) return this.process

    if (!existsSync(venvPython)) throw new Error('Python venv not found. Run: python3 -m venv venv')
    if (!existsSync(ttsScript))  throw new Error('tts_server.py not found')

    const env = {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      VOICES_DIR: voicesDir,
    }

    this.process = spawn(venvPython, [ttsScript], { stdio: ['pipe', 'pipe', 'pipe'], env })

    this.process.stdout!.on('data', (data: Buffer) => {
      this.stdoutBuffer += data.toString()
      const lines = this.stdoutBuffer.split('\n')
      this.stdoutBuffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const result = JSON.parse(line)
          if (this.pendingResolve && typeof result.success === 'boolean') {
            if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null }
            this.pendingResolve(result)
            this.pendingResolve = null
            this.pendingReject = null
          }
        } catch { /* non-JSON progress output */ }
      }
    })

    this.process.stderr!.on('data', (d: Buffer) => {
      const msg = d.toString().trim()
      console.log('[tts-server]', msg)
      this.sendToAll('voice:clone-progress', { message: msg })
    })

    this.process.on('exit', (code) => {
      this.process = null
      if (this.pendingReject) {
        this.pendingReject(new Error(`TTS server exited (code ${code})`))
        this.pendingResolve = null; this.pendingReject = null
      }
    })

    return this.process
  }

  private request(line: string, timeoutMs = 120_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = this.ensureProcess()
      this.pendingResolve = resolve
      this.pendingReject  = reject
      proc.stdin!.write(line + '\n')
      this.timeoutHandle = setTimeout(() => {
        this.timeoutHandle = null
        this.pendingResolve = null; this.pendingReject = null
        this.killProcess()
        reject(new Error('TTS request timed out'))
      }, timeoutMs)
    })
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async cloneVoice(sampleWavPath: string, voiceId: string): Promise<{ voiceId: string; durationSecs: number }> {
    const provider = store.get('ttsProvider', 'local') as string

    if (provider === 'elevenlabs') {
      return this.cloneWithElevenLabs(sampleWavPath, voiceId)
    }

    // Local Coqui XTTS
    if (!existsSync(venvPython)) throw new Error('Python venv not found')
    const result = await this.request(`CLONE|${sampleWavPath}|${voiceId}`, 30_000)
    if (!result.success) throw new Error(result.error || 'Voice cloning failed')
    return { voiceId: result.voice_id, durationSecs: result.duration_secs }
  }

  async synthesize(text: string, voiceId: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    const provider = store.get('ttsProvider', 'local') as string

    if (provider === 'elevenlabs') {
      return this.synthesizeWithElevenLabs(text, voiceId, outputPath)
    }

    const result = await this.request(`SPEAK|${text}|${voiceId}|${outputPath}`, 60_000)
    if (!result.success) throw new Error(result.error || 'Synthesis failed')
    return { path: result.path, durationSecs: result.duration_secs }
  }

  async startRealtime(voiceId: string): Promise<void> {
    const result = await this.request(`STREAM_START|${voiceId}`, 30_000)
    if (!result.success) throw new Error(result.error || 'Failed to start real-time mode')
  }

  async processRealtimeChunk(pcmBase64: string): Promise<string> {
    const result = await this.request(`STREAM_CHUNK|${pcmBase64}`, 10_000)
    if (!result.success) throw new Error(result.error || 'Chunk processing failed')
    return result.audio_b64
  }

  async stopRealtime(): Promise<void> {
    if (!this.process) return
    await this.request('STREAM_STOP', 5_000)
  }

  killProcess() {
    if (this.process && !this.process.killed) { this.process.kill(); this.process = null }
  }

  getSynthDir() { return synthDir }
  getVoicesDir() { return voicesDir }

  // ── ElevenLabs provider ────────────────────────────────────────────────────

  private async cloneWithElevenLabs(sampleWavPath: string, voiceId: string): Promise<{ voiceId: string; durationSecs: number }> {
    const apiKey = store.get('elevenlabsApiKey', '') as string
    if (!apiKey) throw new Error('ElevenLabs API key not set. Go to Settings → Voice Cloning.')

    const { createReadStream } = await import('fs')
    const { default: FormData } = await import('form-data')
    const https = await import('https')

    const form = new FormData()
    form.append('name', voiceId)
    form.append('files', createReadStream(sampleWavPath))

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.elevenlabs.io',
        path: '/v1/voices/add',
        method: 'POST',
        headers: { ...form.getHeaders(), 'xi-api-key': apiKey },
      }, (res) => {
        let data = ''
        res.on('data', (c: any) => data += c)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.voice_id) resolve({ voiceId: json.voice_id, durationSecs: 0 })
            else reject(new Error(json.detail?.message || 'ElevenLabs cloning failed'))
          } catch { reject(new Error('Invalid ElevenLabs response')) }
        })
      })
      req.on('error', reject)
      form.pipe(req)
    })
  }

  private async synthesizeWithElevenLabs(text: string, voiceId: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    const apiKey = store.get('elevenlabsApiKey', '') as string
    if (!apiKey) throw new Error('ElevenLabs API key not set.')

    const https = await import('https')
    const { writeFileSync } = await import('fs')
    const body = JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const req = https.request({
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          try { writeFileSync(outputPath, buf) } catch (e) { reject(e); return }
          resolve({ path: outputPath, durationSecs: 0 })
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

export const voiceCloneService = new VoiceCloneService()
