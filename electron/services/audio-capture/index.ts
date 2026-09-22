import { platform } from 'os'
import type { AudioDevice, AudioChunk } from '../../types/index.js'
import { EventEmitter } from 'events'
import { MicrophoneCapture } from './microphone.js'
import { SystemAudioMacOS } from './system-audio-macos.js'
import { SystemAudioLinux } from './system-audio-linux.js'
import { SystemAudioWindows } from './system-audio-windows.js'
import { BrowserWindow, app } from 'electron'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

export type AudioSource = 'microphone' | 'system-audio'

// VAD (Voice Activity Detection) constants — tuned for real-time feel
const SILENCE_RMS_THRESHOLD = 0.01   // slightly more sensitive (handles low-gain mics)
const SILENCE_BEFORE_SEND_MS = 400   // fire 400ms after a pause (was 700)
const MIN_SPEECH_MS = 200            // accept short phrases (was 300)
const MAX_CHUNK_MS = 8000            // break long speech every 8s (was 15s)

export class AudioCaptureService extends EventEmitter {
  private isCapturing = false
  private currentDeviceId?: string
  private currentMeetingId?: string
  private currentSource: AudioSource = 'microphone'
  private microphone: MicrophoneCapture | null = null
  private systemAudio: SystemAudioMacOS | null = null
  private linuxAudio: SystemAudioLinux | null = null
  private windowsAudio: SystemAudioWindows | null = null

  // VAD state
  private speechBuffer: Buffer[] = []
  private isSpeaking = false
  private speechStartTime = 0
  private lastSpeechTime = 0
  private silenceTimer: NodeJS.Timeout | null = null

  // Full recording buffer for audio playback
  private fullRecordingBuffer: Buffer[] = []

  async initialize(): Promise<void> {
    console.log(`Initializing audio capture for platform: ${platform()}`)

    this.microphone = new MicrophoneCapture()
    this.setupMicrophoneListeners()

    if (platform() === 'darwin') {
      this.systemAudio = new SystemAudioMacOS()
      this.setupSystemAudioListeners()
      const available = await this.systemAudio.checkAvailability()
      console.log(`ScreenCaptureKit available: ${available}`)
    }

    if (platform() === 'linux') {
      this.linuxAudio = new SystemAudioLinux()
      this.linuxAudio.on('audio-data', (chunk: Buffer) => this.handleAudioData(chunk))
      this.linuxAudio.on('volume-level', (level: number) => this.sendToRenderer('audio:volume', level))
      this.linuxAudio.on('error', (error: Error) => { console.error('Linux audio error:', error); this.stopCapture() })
    }

    if (platform() === 'win32') {
      this.windowsAudio = new SystemAudioWindows()
      this.windowsAudio.on('audio-data', (chunk: Buffer) => this.handleAudioData(chunk))
      this.windowsAudio.on('volume-level', (level: number) => this.sendToRenderer('audio:volume', level))
      this.windowsAudio.on('error', (error: Error) => { console.error('Windows audio error:', error); this.stopCapture() })
    }
  }

  private setupMicrophoneListeners(): void {
    if (!this.microphone) return
    this.microphone.on('audio-data', (chunk: Buffer) => this.handleAudioData(chunk))
    this.microphone.on('volume-level', (level: number) => this.sendToRenderer('audio:volume', level))
    this.microphone.on('error', (error: Error) => { console.error('Microphone error:', error); this.stopCapture() })
  }

  private setupSystemAudioListeners(): void {
    if (!this.systemAudio) return
    this.systemAudio.on('audio-data', (chunk: Buffer) => this.handleAudioData(chunk))
    this.systemAudio.on('volume-level', (level: number) => this.sendToRenderer('audio:volume', level))
    this.systemAudio.on('error', (error: Error) => { console.error('System audio error:', error); this.stopCapture() })
  }

  async listDevices(): Promise<AudioDevice[]> {
    const devices: AudioDevice[] = [
      { id: 'microphone', name: 'Microphone (Your Voice)', kind: 'audioinput', isDefault: true },
    ]

    if (this.systemAudio && process.platform === 'darwin') {
      const available = await this.systemAudio.checkAvailability()
      if (available) {
        devices.push({ id: 'system-audio', name: 'System Audio (Meetings, Videos)', kind: 'audioinput', isDefault: false })
      }
    }

    if (process.platform === 'linux') {
      try {
        const out = execSync('pactl list sources short 2>/dev/null', { timeout: 3000 }).toString()
        for (const line of out.split('\n')) {
          const parts = line.trim().split(/\s+/)
          const sourceName = parts[1]
          if (sourceName && sourceName.includes('.monitor')) {
            devices.push({
              id: `linux-monitor:${sourceName}`,
              name: `System Audio — ${sourceName.replace('.monitor', '')}`,
              kind: 'audioinput',
              isDefault: false,
            })
          }
        }
      } catch { /* pactl not available */ }
    }

    if (process.platform === 'win32') {
      devices.push({ id: 'system-audio-win', name: 'System Audio (All Apps)', kind: 'audioinput', isDefault: false })
    }

    return devices
  }

  async startCapture(deviceId: string, meetingId?: string): Promise<void> {
    if (this.isCapturing) throw new Error('Already capturing audio')
    if (!this.microphone) await this.initialize()

    console.log(`Starting audio capture from: ${deviceId}`)
    this.currentDeviceId = deviceId
    this.currentMeetingId = meetingId
    this.fullRecordingBuffer = []
    this.resetVAD()

    try {
      if (deviceId === 'system-audio') {
        if (!this.systemAudio) throw new Error('System audio not available on this platform')
        this.currentSource = 'system-audio'
        await this.systemAudio.start()
      } else if (deviceId.startsWith('linux-monitor:')) {
        const monitorSource = deviceId.slice('linux-monitor:'.length)
        if (!this.linuxAudio) throw new Error('Linux audio not initialized')
        this.currentSource = 'system-audio'
        await this.linuxAudio.start(monitorSource)
      } else if (deviceId === 'system-audio-win') {
        if (!this.windowsAudio) throw new Error('Windows audio not initialized')
        this.currentSource = 'system-audio'
        await this.windowsAudio.start()
      } else {
        this.currentSource = 'microphone'
        await this.microphone!.start({ sampleRate: 16000, channels: 1 })
      }

      this.isCapturing = true
      console.log(`Audio capture started (${this.currentSource}) — VAD enabled`)

    } catch (error: any) {
      this.isCapturing = false
      this.currentSource = 'microphone'
      throw error
    }
  }

  async stopCapture(): Promise<void> {
    if (!this.isCapturing) return

    console.log('Stopping audio capture')

    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }

    if (this.currentSource === 'system-audio') {
      this.systemAudio?.stop()
      this.linuxAudio?.stop()
      this.windowsAudio?.stop()
    } else if (this.microphone) {
      this.microphone.stop()
    }

    // Flush any remaining VAD audio
    if (this.speechBuffer.length > 0) {
      console.log(`🛑 Stop requested — flushing ${this.speechBuffer.length} buffered chunks`)
      this.flushSpeechChunk()
    }

    // Save the full recording to disk for playback
    if (this.fullRecordingBuffer.length > 0 && this.currentMeetingId) {
      try {
        const combined = Buffer.concat(this.fullRecordingBuffer)
        const recordingsDir = join(app.getPath('userData'), 'recordings')
        if (!existsSync(recordingsDir)) mkdirSync(recordingsDir, { recursive: true })
        const filePath = join(recordingsDir, `${this.currentMeetingId}.wav`)
        writeFileSync(filePath, this.createWavBuffer(combined))
        console.log(`🎵 Recording saved: ${filePath}`)
        this.emit('recording-saved', filePath, this.currentMeetingId)
      } catch (err) {
        console.error('Failed to save recording:', err)
      }
    }

    this.fullRecordingBuffer = []
    this.isCapturing = false
    this.currentDeviceId = undefined
    this.currentMeetingId = undefined
    this.currentSource = 'microphone'
    this.resetVAD()
  }

  private createWavBuffer(pcmData: Buffer): Buffer {
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16
    const dataSize = pcmData.length
    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28)
    header.writeUInt16LE(numChannels * bitsPerSample / 8, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)
    return Buffer.concat([header, pcmData])
  }

  onAudioData(callback: (chunk: AudioChunk) => void): void {
    this.on('audio-chunk-ready', callback)
  }

  // ── VAD core ──────────────────────────────────────────────────────────────

  private resetVAD(): void {
    this.speechBuffer = []
    this.isSpeaking = false
    this.speechStartTime = 0
    this.lastSpeechTime = 0
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }
  }

  private handleAudioData(chunk: Buffer): void {
    const rms = this.calculateRMS(chunk)
    const now = Date.now()
    const isSpeech = rms > SILENCE_RMS_THRESHOLD

    // Accumulate full recording for playback
    this.fullRecordingBuffer.push(chunk)

    // Always accumulate VAD audio
    this.speechBuffer.push(chunk)

    if (isSpeech) {
      if (!this.isSpeaking) {
        this.isSpeaking = true
        this.speechStartTime = now
        console.log('🎤 Speech detected')
      }
      this.lastSpeechTime = now

      // Cancel any pending silence timer
      if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }

      // Hard cap: flush if chunk too long
      const speechDuration = now - this.speechStartTime
      if (speechDuration >= MAX_CHUNK_MS) {
        console.log('⏱️ Max chunk duration reached, flushing')
        this.flushSpeechChunk()
      }
    } else {
      // Silence — start timer if we were speaking
      if (this.isSpeaking && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          const speechMs = this.lastSpeechTime - this.speechStartTime
          if (speechMs >= MIN_SPEECH_MS) {
            console.log(`🔇 Silence detected after ${speechMs}ms speech — transcribing`)
            this.flushSpeechChunk()
          } else {
            // Too short — discard
            this.speechBuffer = []
            this.isSpeaking = false
          }
          this.silenceTimer = null
        }, SILENCE_BEFORE_SEND_MS)
      }
    }
  }

  private flushSpeechChunk(): void {
    if (this.speechBuffer.length === 0) return

    const combinedBuffer = Buffer.concat(this.speechBuffer)
    this.speechBuffer = []
    this.isSpeaking = false

    const audioChunk: AudioChunk = {
      buffer: combinedBuffer.buffer.slice(
        combinedBuffer.byteOffset,
        combinedBuffer.byteOffset + combinedBuffer.byteLength
      ),
      timestamp: Date.now(),
      sampleRate: 16000,
    }

    this.emit('audio-chunk-ready', audioChunk)
    console.log(`📤 Sent ${(combinedBuffer.length / 32000).toFixed(1)}s of audio to Whisper`)
  }

  private calculateRMS(buffer: Buffer): number {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i] / 32768.0
      sum += s * s
    }
    return Math.sqrt(sum / (samples.length || 1))
  }

  private sendToRenderer(channel: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
  }
}
