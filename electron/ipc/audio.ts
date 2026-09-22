import { ipcMain } from 'electron'
import { AudioCaptureService } from '../services/audio-capture/index.js'
import { streamProcessor } from '../services/stream-processor.js'

const audioCaptureService = new AudioCaptureService()

audioCaptureService.initialize().catch(err => {
  console.error('Failed to initialize audio service:', err)
})

audioCaptureService.on('audio-chunk-ready', async (chunk) => {
  await streamProcessor.processAudioChunk(chunk)
})

export function registerAudioHandlers() {
  ipcMain.handle('audio:list-devices', async () => {
    return await audioCaptureService.listDevices()
  })

  // language is now a 3rd argument so per-recording language reaches Whisper
  ipcMain.handle('audio:start-capture', async (_event, deviceId: string, meetingId: string, language: string = 'auto') => {
    streamProcessor.setMeetingId(meetingId, language)
    const result = await audioCaptureService.startCapture(deviceId)
    // Notify main process to show the floating overlay
    ipcMain.emit('internal:recording-started')
    return result
  })

  ipcMain.handle('audio:stop-capture', async () => {
    await audioCaptureService.stopCapture()
    streamProcessor.stop()
    ipcMain.emit('internal:recording-stopped')
  })
}
