import { ipcMain } from 'electron'
import { registerAudioHandlers } from './audio.js'
import { registerTranscriptionHandlers } from './transcription.js'
import { registerMeetingHandlers } from './meetings.js'
import { registerAnalysisHandlers } from './analysis.js'
import { registerSettingsHandlers } from './settings.js'
import { registerNoteHandlers } from './notes.js'
import { registerCalendarHandlers } from './calendar.js'
import { registerTagHandlers } from './tags.js'
import { registerSystemInfoHandlers } from './system-info.js'
import { registerModelHandlers } from './models.js'
import { registerExportHandlers } from './export.js'

export function registerIPCHandlers() {
  registerAudioHandlers()
  registerTranscriptionHandlers()
  registerMeetingHandlers()
  registerAnalysisHandlers()
  registerSettingsHandlers()
  registerNoteHandlers()
  registerCalendarHandlers()
  registerTagHandlers()
  registerSystemInfoHandlers()
  registerModelHandlers()
  registerExportHandlers()
}
