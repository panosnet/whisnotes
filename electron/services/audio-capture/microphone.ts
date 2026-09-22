import { EventEmitter } from 'events'
import { createRequire } from 'module'

// Ensure Homebrew paths are available inside Electron
process.env.PATH = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  process.env.PATH || '',
].join(':')

// Use createRequire for CommonJS modules in ESM context
const require = createRequire(import.meta.url)

export interface MicrophoneOptions {
  sampleRate?: number
  channels?: number
  device?: string
}

export class MicrophoneCapture extends EventEmitter {
  private recording: any = null
  private isRecording = false

  async start(options: MicrophoneOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    const sampleRate = options.sampleRate || 16000
    const channels = options.channels || 1

    try {
      const record = require('node-record-lpcm16')

      this.recording = record.record({
        sampleRate,
        channels,
        recorder: 'sox',
        device: options.device || null,
        silence: '0.0',
        thresholdStart: null,
        thresholdStop: null,
      })

      const audioStream = this.recording.stream()

      audioStream.on('data', (chunk: Buffer) => {
        this.emit('audio-data', chunk)
        this.emit('volume-level', this.calculateVolume(chunk))
      })

      audioStream.on('error', (error: Error) => {
        console.error('Microphone stream error:', error)
        this.emit('error', error)
        this.stop()
      })

      this.isRecording = true
      console.log(`Microphone recording started: ${sampleRate}Hz, ${channels} channel(s)`)
      this.emit('started')

    } catch (error: any) {
      console.error('Failed to start microphone:', error)
      throw new Error(`Failed to start microphone: ${error.message}`)
    }
  }

  stop(): void {
    if (!this.isRecording) return

    if (this.recording) {
      try {
        this.recording.stop()
      } catch (e) {
        // ignore stop errors
      }
      this.recording = null
    }

    this.isRecording = false
    this.emit('stopped')
    console.log('Microphone recording stopped')
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  private calculateVolume(buffer: Buffer): number {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i] / 32768.0
      sum += s * s
    }
    return Math.min(1.0, Math.sqrt(sum / (samples.length || 1)) * 3)
  }
}

