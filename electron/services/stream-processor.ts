import { EventEmitter } from 'events'
import { WhisperTranscriptionService } from './ai/whisper-client.js'
import { WhisperLocalService } from './ai/whisper-local.js'
import { TranscriptRepository } from './database/repositories/transcripts.js'
import type { AudioChunk } from '../types/index.js'
import { BrowserWindow } from 'electron'
import Store from 'electron-store'

const store = new Store()

interface QueueItem {
  chunk: AudioChunk
  language: string
  meetingId: string
}

export class StreamProcessor extends EventEmitter {
  private whisperApiService: WhisperTranscriptionService
  private whisperLocalService: WhisperLocalService
  private transcriptRepo: TranscriptRepository
  private currentMeetingId: string | null = null
  private currentLanguage: string = 'auto'
  private sessionStartTime: number = 0
  private isProcessing = false
  private queue: QueueItem[] = []

  constructor() {
    super()
    this.whisperApiService = new WhisperTranscriptionService()
    this.whisperLocalService = new WhisperLocalService()
    this.transcriptRepo = new TranscriptRepository()
    if (!store.has('whisperMode')) store.set('whisperMode', 'local')
  }

  setMeetingId(meetingId: string, language: string = 'auto'): void {
    this.currentMeetingId = meetingId
    this.currentLanguage = language
    this.sessionStartTime = Date.now()
    this.whisperLocalService.setSessionStart(this.sessionStartTime)
    console.log(`Stream processor set to meeting: ${meetingId} (lang: ${language})`)
  }

  async processAudioChunk(chunk: AudioChunk, _language?: string): Promise<void> {
    if (!this.currentMeetingId) {
      console.warn('processAudioChunk called with no meetingId — skipping')
      return
    }

    const meetingId = this.currentMeetingId
    const language = this.currentLanguage // use per-recording language, not global setting
    this.queue.push({ chunk, language, meetingId })
    console.log(`🎙️ Chunk queued (queue: ${this.queue.length})`)

    if (!this.isProcessing) this.drainQueue()
  }

  private async drainQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      await this.processOne(item)
    }

    this.isProcessing = false
  }

  private async processOne(item: QueueItem): Promise<void> {
    const { chunk, language, meetingId } = item

    try {
      const whisperMode = store.get('whisperMode', 'local') as string
      const modelSize = store.get('whisperModelSize', 'small') as string

      console.log(`🔊 Transcribing (${whisperMode}/${modelSize}) lang:${language}...`)

      let result: any

      if (whisperMode === 'local') {
        this.whisperLocalService.setModel(modelSize as any)
        result = await this.whisperLocalService.transcribe(chunk.buffer, meetingId, chunk.timestamp, language)
      } else {
        result = await this.whisperApiService.transcribe(chunk.buffer, meetingId, chunk.timestamp, language)
      }

      // Diarized results come back as an array; plain as a single segment
      const segments = Array.isArray(result) ? result : [result]
      const { ipcMain } = await import('electron')

      for (const segment of segments) {
        if (!segment.text?.trim()) continue
        const savedSegment = this.transcriptRepo.create(segment)
        this.sendToRenderer('transcript:segment', savedSegment)
        ipcMain.emit('internal:new-segment')
        console.log(`✅ Transcript: "${savedSegment.text}"`)
      }

    } catch (error: any) {
      console.error('❌ Transcription error:', error.message)
      this.sendToRenderer('transcript:error', { message: error.message })
    }
  }

  stop(): void {
    this.currentMeetingId = null
    console.log(`Stream processor stopped (${this.queue.length} chunks still queued)`)
  }

  shutdown(): void {
    this.stop()
    this.queue = []
    this.whisperLocalService.killProcess()
    console.log('Stream processor shut down')
  }

  private sendToRenderer(channel: string, data: any): void {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
  }
}

export const streamProcessor = new StreamProcessor()
