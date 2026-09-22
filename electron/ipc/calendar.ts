import { ipcMain } from 'electron'
import { CalendarRepository } from '../services/database/repositories/calendar.js'
import type { CalendarEvent } from '../types/index.js'

const calendarRepo = new CalendarRepository()

export function registerCalendarHandlers() {
  ipcMain.handle('calendar:create', async (_event, event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    return calendarRepo.create(event)
  })

  ipcMain.handle('calendar:get-all', async () => {
    return calendarRepo.getAll()
  })

  ipcMain.handle('calendar:get-by-date-range', async (_event, startDate: unknown, endDate: unknown) => {
    // IPC serializes Date objects as ISO strings — convert back
    return calendarRepo.getByDateRange(new Date(startDate as string), new Date(endDate as string))
  })

  ipcMain.handle('calendar:get-by-meeting', async (_event, meetingId: string) => {
    return calendarRepo.getByMeetingId(meetingId)
  })

  ipcMain.handle('calendar:update', async (_event, id: string, data: Partial<CalendarEvent>) => {
    return calendarRepo.update(id, data)
  })

  ipcMain.handle('calendar:delete', async (_event, id: string) => {
    return calendarRepo.delete(id)
  })
}
