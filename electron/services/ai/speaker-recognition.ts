import { spawn, ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { app, BrowserWindow } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = app.isPackaged
  ? dirname(app.getPath('exe'))
  : join(__dirname, '../../../')

const venvPython   = join(projectRoot, 'venv/bin/python3')
const serverScript = join(projectRoot, 'speaker_server.py')
const embeddingsDir = join(app.getPath('userData'), 'speaker-embeddings')

mkdirSync(embeddingsDir, { recursive: true })

function sendToAll(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
}

export class SpeakerRecognitionService {
  private process: ChildProcess | null = null
  private pendingResolve: ((r: any) => void) | null = null
  private pendingReject:  ((e: Error) => void) | null = null
  private timeoutHandle: NodeJS.Timeout | null = null
  private stdoutBuffer = ''

  private ensureProcess(): ChildProcess {
    if (this.process && !this.process.killed) return this.process
    if (!existsSync(venvPython)) throw new Error('Python venv not found')
    if (!existsSync(serverScript)) throw new Error('speaker_server.py not found')

    const env = {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      EMBEDDINGS_DIR: embeddingsDir,
    }

    this.process = spawn(venvPython, [serverScript], { stdio: ['pipe', 'pipe', 'pipe'], env })

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
            this.pendingResolve = null; this.pendingReject = null
          }
        } catch {}
      }
    })

    this.process.stderr!.on('data', (d: Buffer) => {
      console.log('[speaker-server]', d.toString().trim())
    })

    this.process.on('exit', (code) => {
      this.process = null
      if (this.pendingReject) {
        this.pendingReject(new Error(`Speaker server exited (code ${code})`))
        this.pendingResolve = null; this.pendingReject = null
      }
    })

    return this.process
  }

  private request(line: string, timeoutMs = 60_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = this.ensureProcess()
      this.pendingResolve = resolve; this.pendingReject = reject
      proc.stdin!.write(line + '\n')
      this.timeoutHandle = setTimeout(() => {
        this.timeoutHandle = null
        this.pendingResolve = null; this.pendingReject = null
        this.killProcess()
        reject(new Error('Speaker recognition timed out'))
      }, timeoutMs)
    })
  }

  /** Register a voice sample for a known speaker */
  async registerSample(audioPath: string, speakerId: string): Promise<{ sampleCount: number; embeddingPath: string }> {
    const result = await this.request(`REGISTER|${audioPath}|${speakerId}`, 30_000)
    if (!result.success) throw new Error(result.error || 'Registration failed')
    return { sampleCount: result.sample_count, embeddingPath: result.embedding_path }
  }

  /** Identify a speaker from an audio file */
  async identify(audioPath: string): Promise<{ speakerId: string | null; confidence: number; identified: boolean }> {
    const result = await this.request(`IDENTIFY|${audioPath}`, 15_000)
    if (!result.success) throw new Error(result.error || 'Identification failed')
    return { speakerId: result.speaker_id, confidence: result.confidence, identified: result.identified }
  }

  /**
   * Identify all diarized speakers in a recording.
   * Segments: [{speaker_label, start, end}, ...]
   * Returns: { "SPEAKER_00": { speakerId, name, confidence } }
   */
  async identifyBatch(audioPath: string, segments: Array<{ speaker_label: string; start: number; end: number }>): Promise<Record<string, { speakerId: string | null; confidence: number; identified: boolean }>> {
    const segJson = JSON.stringify(segments)
    const result = await this.request(`IDENTIFY_BATCH|${audioPath}|${segJson}`, 60_000)
    if (!result.success) throw new Error(result.error || 'Batch identification failed')
    return result.identifications
  }

  /** Reload embeddings index (call after adding/removing speakers) */
  async reload(): Promise<number> {
    const result = await this.request('RELOAD', 10_000)
    return result.speaker_count || 0
  }

  getEmbeddingsDir() { return embeddingsDir }

  killProcess() {
    if (this.process && !this.process.killed) { this.process.kill(); this.process = null }
  }
}

export const speakerRecognitionService = new SpeakerRecognitionService()
