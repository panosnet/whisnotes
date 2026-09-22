import { ipcMain, BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { MeetingRepository } from '../services/database/repositories/meetings.js'
import { TranscriptRepository } from '../services/database/repositories/transcripts.js'

const meetingRepo = new MeetingRepository()
const transcriptRepo = new TranscriptRepository()

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

function fmtTime(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function registerExportHandlers() {
  ipcMain.handle('export:json', async (_event, meetingId: string) => {
    const win = getWindow()
    if (!win) return { success: false, error: 'No window available' }

    const meeting = meetingRepo.getById(meetingId)
    const segments = transcriptRepo.getByMeetingId(meetingId)

    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${meeting?.title || 'meeting'}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (!result.canceled && result.filePath) {
      try { writeFileSync(result.filePath, JSON.stringify({ meeting, segments }, null, 2), 'utf-8') }
      catch (e: any) { return { success: false, error: `Write failed: ${e.message}` } }
      return { success: true, path: result.filePath }
    }
    return { success: false, canceled: true }
  })

  ipcMain.handle('export:text', async (_event, meetingId: string) => {
    const win = getWindow()
    if (!win) return { success: false, error: 'No window available' }

    const meeting = meetingRepo.getById(meetingId)
    const segments = transcriptRepo.getByMeetingId(meetingId)

    const lines = [
      `Meeting: ${meeting?.title || 'Untitled'}`,
      `Date: ${meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Unknown'}`,
      `Language: ${meeting?.language || 'Unknown'}`,
      '',
      '--- Transcript ---',
      '',
      ...segments.map(s => `[${fmtTime(Math.round(s.timestamp))}] ${s.text}`),
    ]

    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${meeting?.title || 'meeting'}.txt`,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    })

    if (!result.canceled && result.filePath) {
      try { writeFileSync(result.filePath, lines.join('\n'), 'utf-8') }
      catch (e: any) { return { success: false, error: `Write failed: ${e.message}` } }
      return { success: true, path: result.filePath }
    }
    return { success: false, canceled: true }
  })

  ipcMain.handle('export:pdf', async (_event, meetingId: string) => {
    const win = getWindow()
    if (!win) return { success: false, error: 'No window available' }

    const meeting = meetingRepo.getById(meetingId)
    const segments = transcriptRepo.getByMeetingId(meetingId)

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #222; line-height: 1.6; }
  h1 { font-size: 1.6em; margin-bottom: 4px; }
  .meta { color: #666; font-size: 0.9em; margin-bottom: 24px; }
  .segment { margin-bottom: 10px; }
  .ts { color: #888; font-size: 0.82em; font-weight: bold; margin-right: 8px; font-family: monospace; }
</style>
</head><body>
<h1>${escHtml(meeting?.title || 'Untitled Meeting')}</h1>
<div class="meta">${meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : ''} &bull; ${escHtml(meeting?.language?.toUpperCase() || '')}</div>
<hr/>
${segments.map(s => `<div class="segment"><span class="ts">[${fmtTime(Math.round(s.timestamp))}]</span>${escHtml(s.text)}</div>`).join('\n')}
</body></html>`

    // Use a hidden window to render the HTML — destroy in finally so it never leaks
    const hidden = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } })
    let pdfData: Buffer
    try {
      await hidden.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      pdfData = await hidden.webContents.printToPDF({ printBackground: false })
    } finally {
      hidden.destroy()
    }

    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${meeting?.title || 'meeting'}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (!result.canceled && result.filePath) {
      try { writeFileSync(result.filePath, pdfData!) }
      catch (e: any) { return { success: false, error: `Write failed: ${e.message}` } }
      return { success: true, path: result.filePath }
    }
    return { success: false, canceled: true }
  })

  ipcMain.handle('export:srt', async (_event, meetingId: string) => {
    const win = getWindow()
    if (!win) return { success: false, error: 'No window available' }

    const meeting = meetingRepo.getById(meetingId)
    const segments = transcriptRepo.getByMeetingId(meetingId)

    const toSrtTime = (secs: number) => {
      const h = Math.floor(secs / 3600)
      const m = Math.floor((secs % 3600) / 60)
      const s = Math.floor(secs % 60)
      const ms = Math.round((secs - Math.floor(secs)) * 1000)
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`
    }

    const srt = segments.map((s, i) => {
      const start = s.timestamp
      const end = segments[i + 1]?.timestamp ?? start + 5
      return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${s.text}`
    }).join('\n\n')

    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${meeting?.title || 'meeting'}.srt`,
      filters: [{ name: 'SubRip Subtitle', extensions: ['srt'] }],
    })

    if (!result.canceled && result.filePath) {
      try { writeFileSync(result.filePath, srt, 'utf-8') }
      catch (e: any) { return { success: false, error: `Write failed: ${e.message}` } }
      return { success: true, path: result.filePath }
    }
    return { success: false, canceled: true }
  })

  ipcMain.handle('export:md', async (_event, meetingId: string) => {
    const win = getWindow()
    if (!win) return { success: false, error: 'No window available' }

    const meeting = meetingRepo.getById(meetingId)
    const segments = transcriptRepo.getByMeetingId(meetingId)

    const fmtTs = (secs: number) => {
      const m = String(Math.floor(secs / 60)).padStart(2, '0')
      const s = String(Math.floor(secs % 60)).padStart(2, '0')
      return `${m}:${s}`
    }

    const lines = [
      `# ${meeting?.title || 'Untitled Meeting'}`,
      '',
      `**Date:** ${meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : ''}  `,
      `**Language:** ${meeting?.language?.toUpperCase() || 'Unknown'}`,
      '',
      '## Transcript',
      '',
      ...segments.map(s => `\`[${fmtTs(s.timestamp)}]\` ${s.text}`),
    ]

    const md = lines.join('\n')
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${meeting?.title || 'meeting'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (!result.canceled && result.filePath) {
      try { writeFileSync(result.filePath, md, 'utf-8') }
      catch (e: any) { return { success: false, error: `Write failed: ${e.message}` } }
      return { success: true, path: result.filePath }
    }
    return { success: false, canceled: true }
  })

  console.log('Export IPC handlers registered')
}
