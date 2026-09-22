import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import Store from 'electron-store'
import type { TranscriptSegment } from '../../types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = app.isPackaged
  ? dirname(app.getPath('exe'))
  : join(__dirname, '../../../')

const venvPython = join(projectRoot, 'venv/bin/python3')
const pythonPath = existsSync(venvPython) ? venvPython : '/opt/homebrew/bin/python3'
const serverScript = join(projectRoot, 'whisper_server.py')

const store = new Store()

export type WhisperModelSize =
  | 'tiny' | 'tiny.en'
  | 'base' | 'base.en'
  | 'small' | 'small.en'
  | 'medium' | 'medium.en'
  | 'large' | 'large-v2' | 'large-v3'

export class WhisperLocalService {
  private modelSize: string = 'small'
  private process: ChildProcess | null = null
  private pendingResolve: ((result: any) => void) | null = null
  private pendingReject: ((err: Error) => void) | null = null
  private timeoutHandle: NodeJS.Timeout | null = null
  private stdoutBuffer = ''
  private sessionStartTime = 0

  setModel(size: WhisperModelSize) {
    if (this.modelSize !== size) {
      this.killProcess()
    }
    this.modelSize = size
  }

  setSessionStart(time: number) {
    this.sessionStartTime = time
  }

  private ensureProcess(): ChildProcess {
    if (this.process && !this.process.killed) return this.process

    console.log(`[Whisper] Python path: ${pythonPath} (exists: ${existsSync(pythonPath)})`)
    console.log(`[Whisper] Server script: ${serverScript} (exists: ${existsSync(serverScript)})`)
    console.log(`[Whisper] Project root: ${projectRoot}`)

    if (!existsSync(pythonPath)) {
      throw new Error(`Python not found at: ${pythonPath}\nRun: python3 -m venv venv && source venv/bin/activate && pip install openai-whisper`)
    }
    if (!existsSync(serverScript)) {
      throw new Error(`whisper_server.py not found at: ${serverScript}`)
    }

    console.log(`[Whisper] Starting persistent server (model: ${this.modelSize})`)
    this.process = spawn(pythonPath, [serverScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

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
        } catch (e) {
          console.log('[Whisper server stdout]', line)
        }
      }
    })

    this.process.stderr!.on('data', (data: Buffer) => {
      console.log('[Whisper server]', data.toString().trim())
    })

    this.process.on('exit', (code) => {
      console.log(`[Whisper] Server exited with code ${code}`)
      this.process = null
      if (this.pendingReject) {
        this.pendingReject(new Error(`Whisper server exited unexpectedly (code ${code})`))
        this.pendingReject = null
        this.pendingResolve = null
      }
    })

    return this.process
  }

  async transcribe(
    audioBuffer: ArrayBuffer,
    meetingId: string,
    timestamp: number,
    language?: string
  ): Promise<TranscriptSegment | TranscriptSegment[]> {
    const wavBuffer = this.createWavFile(new Uint8Array(audioBuffer))
    const tempPath = join(tmpdir(), `whisnotes-${Date.now()}.wav`)
    writeFileSync(tempPath, wavBuffer)

    try {
      const lang = (language === 'auto' || !language) ? 'auto' : language
      const enableDiarization = store.get('enableDiarization', false) as boolean
      const result = await this.sendRequest(tempPath, lang, this.modelSize, enableDiarization)

      if (!result.success) {
        throw new Error(result.error || 'Transcription failed')
      }

      const sessionStart = this.sessionStartTime

      // If diarized, return one segment per whisperx segment
      if (result.diarized && Array.isArray(result.segments) && result.segments.length > 0) {
        return result.segments.map((s: any) => ({
          id: randomUUID(),
          meetingId,
          timestamp: sessionStart ? Math.round(s.start) : 0,
          text: s.text.trim(),
          language: result.language || language || 'en',
          confidence: typeof s.confidence === 'number' ? s.confidence : 0.9,
          speakerId: typeof s.speakerId === 'number' ? s.speakerId : null,
          isImportant: false,
          createdAt: new Date(),
        }))
      }

      // Plain transcription — single segment per chunk
      const elapsedSecs = sessionStart ? (timestamp - sessionStart) / 1000 : 0

      return {
        id: randomUUID(),
        meetingId,
        timestamp: Math.round(elapsedSecs),
        text: result.text.trim(),
        language: result.language || language || 'en',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.9,
        speakerId: null,
        isImportant: false,
        createdAt: new Date(),
      }
    } finally {
      try { unlinkSync(tempPath) } catch {}
    }
  }

  private sendRequest(audioPath: string, language: string, model: string, diarize: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = this.ensureProcess()
      this.pendingResolve = resolve
      this.pendingReject = reject

      const request = `${audioPath}|${language}|${model}|${diarize ? '1' : '0'}\n`
      proc.stdin!.write(request)

      this.timeoutHandle = setTimeout(() => {
        this.timeoutHandle = null
        if (this.pendingReject) {
          this.pendingReject(new Error('Transcription timed out (120s)'))
          this.pendingResolve = null
          this.pendingReject = null
          this.killProcess()
        }
      }, 120000)
    })
  }

  killProcess() {
    if (this.process && !this.process.killed) {
      this.process.kill()
      this.process = null
    }
  }

  private createWavFile(pcmData: Uint8Array): Buffer {
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16
    const dataSize = pcmData.length
    const buffer = Buffer.alloc(44 + dataSize)

    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(36 + dataSize, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28)
    buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32)
    buffer.writeUInt16LE(bitsPerSample, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataSize, 40)
    Buffer.from(pcmData).copy(buffer, 44)

    return buffer
  }
}
