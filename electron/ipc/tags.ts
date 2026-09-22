import { ipcMain } from 'electron'
import { TagRepository } from '../services/database/repositories/tags.js'

const tagRepo = new TagRepository()

export function registerTagHandlers() {
  ipcMain.handle('tag:create', async (_event, name: string, color?: string) => {
    return tagRepo.create(name, color)
  })

  ipcMain.handle('tag:get-all', async () => {
    return tagRepo.getAll()
  })

  ipcMain.handle('tag:get-by-meeting', async (_event, meetingId: string) => {
    return tagRepo.getByMeetingId(meetingId)
  })

  ipcMain.handle('tag:add-to-meeting', async (_event, meetingId: string, tagName: string, color?: string) => {
    tagRepo.addToMeeting(meetingId, tagName, color)
    return true
  })

  ipcMain.handle('tag:remove-from-meeting', async (_event, meetingId: string, tagId: string) => {
    return tagRepo.removeFromMeeting(meetingId, tagId)
  })

  ipcMain.handle('tag:delete', async (_event, id: string) => {
    return tagRepo.delete(id)
  })
}
