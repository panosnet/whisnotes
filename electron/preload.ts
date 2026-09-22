import { contextBridge, ipcRenderer } from 'electron'
import type {
  Meeting,
  TranscriptSegment,
  AnalysisResult,
  AudioDevice,
  AppSettings
} from './types/index.js'

const api = {
  // Audio capture
  audio: {
    listDevices: () => ipcRenderer.invoke('audio:list-devices'),
    startCapture: (deviceId: string, meetingId: string) => ipcRenderer.invoke('audio:start-capture', deviceId, meetingId),
    stopCapture: () => ipcRenderer.invoke('audio:stop-capture'),
    onAudioData: (callback: (data: ArrayBuffer) => void) => {
      ipcRenderer.on('audio:data', (_event, data) => callback(data))
    },
    onVolumeLevel: (callback: (level: number) => void) => {
      ipcRenderer.on('audio:volume', (_event, level) => callback(level))
    },
  },

  // Transcription
  transcription: {
    onSegment: (callback: (segment: TranscriptSegment) => void) => {
      ipcRenderer.on('transcript:segment', (_event, segment) => callback(segment))
    },
    translate: (text: string, targetLang: string) =>
      ipcRenderer.invoke('transcript:translate', text, targetLang),
  },

  // Meetings
  meetings: {
    create: (title: string, sourceApp: string, language: string) =>
      ipcRenderer.invoke('meeting:create', title, sourceApp, language),
    getAll: () => ipcRenderer.invoke('meeting:get-all'),
    getById: (id: string) => ipcRenderer.invoke('meeting:get-by-id', id),
    update: (id: string, data: Partial<Meeting>) =>
      ipcRenderer.invoke('meeting:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('meeting:delete', id),
    search: (query: string) => ipcRenderer.invoke('meeting:search', query),
  },

  // Analysis
  analysis: {
    analyze: (meetingId: string) => ipcRenderer.invoke('analysis:analyze', meetingId),
    getResults: (meetingId: string) => ipcRenderer.invoke('analysis:get-results', meetingId),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
  },

  // Export
  export: {
    toJSON: (meetingId: string) => ipcRenderer.invoke('export:json', meetingId),
    toText: (meetingId: string) => ipcRenderer.invoke('export:text', meetingId),
    toPDF: (meetingId: string) => ipcRenderer.invoke('export:pdf', meetingId),
  },

  // Notes
  notes: {
    create: (note: any) => ipcRenderer.invoke('note:create', note),
    getByMeeting: (meetingId: string) => ipcRenderer.invoke('note:get-by-meeting', meetingId),
    getBySegment: (segmentId: string) => ipcRenderer.invoke('note:get-by-segment', segmentId),
    update: (id: string, content: string) => ipcRenderer.invoke('note:update', id, content),
    togglePin: (id: string) => ipcRenderer.invoke('note:toggle-pin', id),
    delete: (id: string) => ipcRenderer.invoke('note:delete', id),
  },

  // Calendar
  calendar: {
    create: (event: any) => ipcRenderer.invoke('calendar:create', event),
    getAll: () => ipcRenderer.invoke('calendar:get-all'),
    getByDateRange: (start: Date, end: Date) => ipcRenderer.invoke('calendar:get-by-date-range', start, end),
    getByMeeting: (meetingId: string) => ipcRenderer.invoke('calendar:get-by-meeting', meetingId),
    update: (id: string, data: any) => ipcRenderer.invoke('calendar:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('calendar:delete', id),
  },

  // Tags
  tags: {
    create: (name: string, color?: string) => ipcRenderer.invoke('tag:create', name, color),
    getAll: () => ipcRenderer.invoke('tag:get-all'),
    getByMeeting: (meetingId: string) => ipcRenderer.invoke('tag:get-by-meeting', meetingId),
    addToMeeting: (meetingId: string, tagName: string, color?: string) =>
      ipcRenderer.invoke('tag:add-to-meeting', meetingId, tagName, color),
    removeFromMeeting: (meetingId: string, tagId: string) =>
      ipcRenderer.invoke('tag:remove-from-meeting', meetingId, tagId),
    delete: (id: string) => ipcRenderer.invoke('tag:delete', id),
  },
}

contextBridge.exposeInMainWorld('api', {
  audio:         api.audio,
  transcription: api.transcription,
  meetings:      api.meetings,
  analysis:      api.analysis,
  settings:      api.settings,
  export:        api.export,
  notes:         api.notes,
  calendar:      api.calendar,
  tags:          api.tags,
  // Generic invoke for system-info, models, etc.
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
})

// Expose ipcRenderer for event listening (download progress, etc.)
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, listener)
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener)
    },
  },
})

export type API = typeof api
