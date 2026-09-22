import { EventEmitter } from 'events'
import { join } from 'path'
import { app, shell } from 'electron'
import { createRequire } from 'module'
import { checkScreenRecordingPermission } from './permission-check.js'

const require = createRequire(import.meta.url)

interface ScreenCaptureKitNative {
  startCapture(callback: (audioData: Buffer) => void): boolean
  stopCapture(): void
  checkAvailability(): boolean
}

let native: ScreenCaptureKitNative | null = null

try {
  // Use app.getAppPath() to get the correct path in production and development
  const appPath = app.getAppPath()
  const modulePath = join(appPath, 'native/macos/build/Release/screencapturekit.node')
  native = require(modulePath)
  console.log('ScreenCaptureKit native module loaded from:', modulePath)
} catch (error) {
  console.log('ScreenCaptureKit not available:', error)
}

export class SystemAudioMacOS extends EventEmitter {
  private isRecording = false

  async checkAvailability(): Promise<boolean> {
    if (!native) {
      return false
    }
    try {
      return native.checkAvailability()
    } catch (error) {
      console.error('Error checking ScreenCaptureKit availability:', error)
      return false
    }
  }

  async start(): Promise<void> {
    if (!native) throw new Error('ScreenCaptureKit not available. Requires macOS 13+')
    if (this.isRecording) throw new Error('Already recording')

    // Check Screen Recording permission before attempting capture
    const hasPermission = await checkScreenRecordingPermission()
    if (!hasPermission) {
      // Open System Settings to the right panel automatically
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
      throw new Error(
        'Screen Recording permission required.\n\n' +
        'System Settings has been opened — enable your terminal or Electron app, then try again.'
      )
    }

    console.log('Starting ScreenCaptureKit audio capture...')

    return new Promise((resolve, reject) => {
      let started = false

      native!.startCapture((firstArg: Buffer | string | null) => {
        // First call: null = success, string = error message
        if (!started) {
          started = true
          if (firstArg === null || firstArg === undefined) {
            // Success
            this.isRecording = true
            this.emit('started')
            console.log('[SCK] System audio capture started')
            resolve()
          } else {
            // Error string from native layer
            const msg = String(firstArg)
            console.error('[SCK] Failed to start:', msg)
            this.isRecording = false

            let friendly = msg
            if (msg.includes('permission') || msg.includes('denied')) {
              friendly = 'Screen Recording permission denied.\n\nGo to System Settings → Privacy & Security → Screen Recording and enable iTerm or Electron, then restart.'
            }
            reject(new Error(friendly))
          }
          return
        }

        // Subsequent calls: audio data buffers
        // ScreenCaptureKit delivers float32 PCM. Convert to int16 so the rest
        // of the pipeline (VAD, WAV creation, Whisper) gets the expected format.
        const float32buf = firstArg as Buffer
        const int16buf = this.float32ToInt16(float32buf)
        this.emit('audio-data', int16buf)
        this.emit('volume-level', this.calculateVolumeFloat32(float32buf))
      })
    })
  }

  stop(): void {
    if (!native || !this.isRecording) {
      return
    }

    try {
      native.stopCapture()
      this.isRecording = false
      this.emit('stopped')
      console.log('System audio capture stopped')
    } catch (error) {
      console.error('Error stopping system audio:', error)
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  // Convert float32 PCM (from ScreenCaptureKit) → int16 PCM (Whisper expects int16)
  private float32ToInt16(float32buf: Buffer): Buffer {
    const numSamples = Math.floor(float32buf.length / 4)
    const out = Buffer.allocUnsafe(numSamples * 2)
    for (let i = 0; i < numSamples; i++) {
      const f = float32buf.readFloatLE(i * 4)
      const clamped = Math.max(-1, Math.min(1, f))
      out.writeInt16LE(Math.round(clamped * 32767), i * 2)
    }
    return out
  }

  // Volume from float32 samples directly (accurate, no format confusion)
  private calculateVolumeFloat32(float32buf: Buffer): number {
    const numSamples = Math.floor(float32buf.length / 4)
    if (numSamples === 0) return 0
    let sum = 0
    for (let i = 0; i < numSamples; i++) {
      const f = float32buf.readFloatLE(i * 4)
      sum += f * f
    }
    return Math.min(1.0, Math.sqrt(sum / numSamples) * 3)
  }
}
