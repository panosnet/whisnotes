import { ipcMain } from 'electron'
import { MeetingRepository } from '../services/database/repositories/meetings.js'
import type { Meeting } from '../types/index.js'

const meetingRepo = new MeetingRepository()

export function registerMeetingHandlers() {
  ipcMain.handle('meeting:create', async (_event, title: string, sourceApp: string, language: string) => {
    return await meetingRepo.create(title, sourceApp, language)
  })

  ipcMain.handle('meeting:get-all', async () => {
    return await meetingRepo.getAll()
  })

  ipcMain.handle('meeting:get-by-id', async (_event, id: string) => {
    return await meetingRepo.getById(id)
  })

  ipcMain.handle('meeting:update', async (_event, id: string, data: Partial<Meeting>) => {
    return await meetingRepo.update(id, data)
  })

  ipcMain.handle('meeting:delete', async (_event, id: string) => {
    return await meetingRepo.delete(id)
  })

  ipcMain.handle('meeting:search', async (_event, query: string) => {
    return await meetingRepo.search(query)
  })
}
