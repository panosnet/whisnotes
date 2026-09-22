import { ipcMain } from 'electron'
import { AIAnalysisService } from '../services/ai/analysis.js'
import { AnalysisRepository } from '../services/database/repositories/analysis.js'

const analysisService = new AIAnalysisService()
const analysisRepo = new AnalysisRepository()

export function registerAnalysisHandlers() {
  ipcMain.handle('analysis:analyze', async (_event, meetingId: string) => {
    const result = await analysisService.analyzeMeeting(meetingId)
    try {
      await analysisRepo.save(result)
    } catch (saveErr: any) {
      console.error('Failed to persist analysis:', saveErr)
      // Return result anyway so the UI can show it, but flag it
      return { ...result, _saveError: 'Analysis could not be saved: ' + saveErr.message }
    }
    return result
  })

  ipcMain.handle('analysis:get-results', async (_event, meetingId: string) => {
    return await analysisRepo.getByMeetingId(meetingId)
  })
}
