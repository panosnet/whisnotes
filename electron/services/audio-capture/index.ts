import { platform } from 'os'
import type { AudioDevice, AudioChunk } from '../../types/index.js'
import { EventEmitter } from 'events'
import { MicrophoneCapture } from './microphone.js'
import { SystemAudioMacOS } from './system-audio-macos.js'
import { BrowserWindow } from 'electron'

export type AudioSource = 'microphone' | 'system-audio'

// VAD (Voice Activity Detection) constants — tuned for real-time feel
const SILENCE_RMS_THRESHOLD = 0.01   // slightly more sensitive (handles low-gain mics)
const SILENCE_BEFORE_SEND_MS = 400   // fire 400ms after a pause (was 700)
const MIN_SPEECH_MS = 200            // accept short phrases (was 300)
const MAX_CHUNK_MS = 8000            // break long speech every 8s (was 15s)

export class AudioCaptureService extends EventEmitter {
  private isCapturing = false
  private currentDeviceId?: string
  private currentSource: AudioSource = 'microphone'
  private microphone: MicrophoneCapture | null = null
  private systemAudio: SystemAudioMacOS | null = null

  // VAD state
  private speechBuffer: Buffer[] = []
  private isSpeaking = false
  private speechStartTime = 0
  private lastSpeechTime = 0
  private silenceTimer: NodeJS.Timeout | null = null

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
        devices.push({
          id: 'system-audio',
          name: 'System Audio (Meetings, Videos)',
          kind: 'audioinput',
          isDefault: false,
        })
      }
    }

    return devices
  }

  async startCapture(deviceId: string): Promise<void> {
    if (this.isCapturing) throw new Error('Already capturing audio')
    if (!this.microphone) await this.initialize()

    console.log(`Starting audio capture from: ${deviceId}`)
    this.currentDeviceId = deviceId
    this.resetVAD()

    try {
      if (deviceId === 'system-audio') {
        if (!this.systemAudio) throw new Error('System audio not available on this platform')
        this.currentSource = 'system-audio'
        await this.systemAudio.start()
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

    if (this.currentSource === 'system-audio' && this.systemAudio) {
      this.systemAudio.stop()
    } else if (this.microphone) {
      this.microphone.stop()
    }

    // Flush any remaining audio (regardless of isSpeaking state)
    if (this.speechBuffer.length > 0) {
      console.log(`🛑 Stop requested — flushing ${this.speechBuffer.length} buffered chunks`)
      this.flushSpeechChunk()
    }

    this.isCapturing = false
    this.currentDeviceId = undefined
    this.currentSource = 'microphone'
    this.resetVAD()
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

    // Always accumulate audio
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
