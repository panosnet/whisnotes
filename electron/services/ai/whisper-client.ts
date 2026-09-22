import OpenAI from 'openai'
import type { TranscriptSegment } from '../../types/index.js'
import { randomUUID } from 'crypto'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store()

export class WhisperTranscriptionService {
  private client: OpenAI | null = null
  private apiKey: string | null = null

  constructor() {
    // Load API key from settings
    const savedKey = store.get('openaiApiKey') as string
    if (savedKey) {
      this.initialize(savedKey)
    }
  }

  initialize(apiKey: string) {
    this.apiKey = apiKey
    this.client = new OpenAI({ apiKey })
    console.log('Whisper client initialized')
  }

  async transcribe(
    audioBuffer: ArrayBuffer,
    meetingId: string,
    timestamp: number,
    language?: string,
    enableSpeakerDiarization: boolean = false
  ): Promise<TranscriptSegment> {
    if (!this.client) {
      // Try to load API key again
      const savedKey = store.get('openaiApiKey') as string
      if (savedKey) {
        this.initialize(savedKey)
      } else {
        throw new Error('Whisper client not initialized. Please set OpenAI API key in settings.')
      }
    }

    try {
      // Convert ArrayBuffer to WAV file
      const wavBuffer = this.createWavFile(new Uint8Array(audioBuffer))

      // Save to temporary file (Whisper API requires file input)
      const tempPath = join(tmpdir(), `whisnotes-${Date.now()}.wav`)
      writeFileSync(tempPath, wavBuffer)

      // Create File object for API
      const fileBuffer = Buffer.from(wavBuffer)
      const file = new File([fileBuffer], 'audio.wav', { type: 'audio/wav' })

      console.log(`Transcribing audio chunk: ${audioBuffer.byteLength} bytes`)

      // Call Whisper API
      const response = await this.client!.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: language === 'auto' ? undefined : language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      })

      // Clean up temp file
      try {
        unlinkSync(tempPath)
      } catch (e) {
        // Ignore cleanup errors
      }

      console.log(`Transcription result: "${response.text}"`)

      // Parse segments if available (for speaker diarization)
      let speakerId: number | undefined
      let speakerName: string | undefined

      // Note: Whisper API doesn't directly provide speaker diarization in current version
      // This would need additional processing or a different service

      return {
        id: randomUUID(),
        meetingId,
        timestamp,
        text: response.text,
        language: response.language || language || 'en',
        confidence: 0.95, // Whisper doesn't provide confidence scores
        speakerId,
        speakerName,
        isImportant: false,
        createdAt: new Date(),
      }
    } catch (error: any) {
      console.error('Transcription error:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  async *streamTranscribe(
    audioChunks: AsyncIterable<{ buffer: ArrayBuffer; timestamp: number }>,
    meetingId: string,
    language?: string
  ): AsyncGenerator<TranscriptSegment> {
    for await (const chunk of audioChunks) {
      try {
        const segment = await this.transcribe(
          chunk.buffer,
          meetingId,
          chunk.timestamp,
          language
        )
        yield segment
      } catch (error) {
        console.error('Transcription error:', error)
        // Continue with next chunk even if one fails
      }
    }
  }

  private createWavFile(pcmData: Uint8Array): Buffer {
    // Create WAV file header for 16kHz mono 16-bit PCM
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16

    const dataSize = pcmData.length
    const fileSize = 44 + dataSize

    const buffer = Buffer.alloc(44 + dataSize)

    // RIFF header
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(fileSize - 8, 4)
    buffer.write('WAVE', 8)

    // fmt chunk
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16) // Chunk size
    buffer.writeUInt16LE(1, 20) // Audio format (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28) // Byte rate
    buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32) // Block align
    buffer.writeUInt16LE(bitsPerSample, 34)

    // data chunk
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataSize, 40)

    // Copy PCM data
    Buffer.from(pcmData).copy(buffer, 44)

    return buffer
  }
}

