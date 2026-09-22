import { ipcMain } from 'electron'
import { TranslationService } from '../services/ai/translation.js'
import { TranscriptRepository } from '../services/database/repositories/transcripts.js'

const translationService = new TranslationService()
const transcriptRepo = new TranscriptRepository()

export function registerTranscriptionHandlers() {
  ipcMain.handle('transcript:translate', async (_event, text: string, targetLang: string) => {
    return await translationService.translate(text, 'auto', targetLang)
  })

  ipcMain.handle('transcript:get-by-meeting', (_event, meetingId: string) => {
    return transcriptRepo.getByMeetingId(meetingId)
  })

  ipcMain.handle('transcript:update-text', (_event, id: string, text: string) => {
    return transcriptRepo.updateText(id, text)
  })

  ipcMain.handle('transcript:search', (_event, query: string) => {
    return transcriptRepo.search(query)
  })
}
