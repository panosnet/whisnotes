import { ipcMain } from 'electron'
import { AudioCaptureService } from '../services/audio-capture/index.js'
import { MeetingRepository } from '../services/database/repositories/meetings.js'
import { streamProcessor } from '../services/stream-processor.js'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'

const audioCaptureService = new AudioCaptureService()
const meetingRepo = new MeetingRepository()

audioCaptureService.initialize().catch(err => {
  console.error('Failed to initialize audio service:', err)
})

audioCaptureService.on('audio-chunk-ready', async (chunk) => {
  await streamProcessor.processAudioChunk(chunk)
})

// Save recording path when audio is saved to disk
audioCaptureService.on('recording-saved', (filePath: string, meetingId: string) => {
  try {
    meetingRepo.update(meetingId, { recordingPath: filePath } as any)
    console.log(`🎵 Recording path saved for meeting ${meetingId}`)
  } catch (err) {
    console.error('Failed to save recording path:', err)
  }
})

export function registerAudioHandlers() {
  ipcMain.handle('audio:list-devices', async () => {
    return await audioCaptureService.listDevices()
  })

  // language is now a 3rd argument so per-recording language reaches Whisper
  ipcMain.handle('audio:start-capture', async (_event, deviceId: string, meetingId: string, language: string = 'auto') => {
    streamProcessor.setMeetingId(meetingId, language)
    const result = await audioCaptureService.startCapture(deviceId, meetingId)
    ipcMain.emit('internal:recording-started')
    return result
  })

  ipcMain.handle('audio:stop-capture', async () => {
    await audioCaptureService.stopCapture()
    streamProcessor.stop()
    ipcMain.emit('internal:recording-stopped')
  })

  ipcMain.handle('audio:get-recording-path', (_event, meetingId: string) => {
    const filePath = join(app.getPath('userData'), 'recordings', `${meetingId}.wav`)
    return existsSync(filePath) ? filePath : null
  })
}
