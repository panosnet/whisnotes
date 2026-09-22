declare module 'node-record-lpcm16' {
  import { Readable } from 'stream'

  export interface RecordingOptions {
    sampleRate?: number
    channels?: number
    audioType?: string
    threshold?: number
    thresholdStart?: number | null
    thresholdEnd?: number | null
    silence?: string
    recorder?: string
    device?: string | null
    [key: string]: any
  }

  export interface Recording extends Readable {
    stop(): void
    pause(): void
    resume(): void
  }

  export function record(options?: RecordingOptions): Recording | null
}
