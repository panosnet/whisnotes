import { ipcMain } from 'electron'
import { NoteRepository } from '../services/database/repositories/notes.js'
import type { Note } from '../types/index.js'

const noteRepo = new NoteRepository()

export function registerNoteHandlers() {
  ipcMain.handle('note:create', async (_event, note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    return noteRepo.create(note)
  })

  ipcMain.handle('note:get-by-meeting', async (_event, meetingId: string) => {
    return noteRepo.getByMeetingId(meetingId)
  })

  ipcMain.handle('note:get-by-segment', async (_event, segmentId: string) => {
    return noteRepo.getBySegmentId(segmentId)
  })

  ipcMain.handle('note:update', async (_event, id: string, content: string) => {
    return noteRepo.update(id, content)
  })

  ipcMain.handle('note:toggle-pin', async (_event, id: string) => {
    return noteRepo.togglePin(id)
  })

  ipcMain.handle('note:delete', async (_event, id: string) => {
    return noteRepo.delete(id)
  })
}
