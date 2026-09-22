// Preload script - must be CommonJS for Electron contextBridge
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Audio capture
  audio: {
    listDevices: () => ipcRenderer.invoke('audio:list-devices'),
    startCapture: (deviceId, meetingId, language) => ipcRenderer.invoke('audio:start-capture', deviceId, meetingId, language),
    stopCapture: () => ipcRenderer.invoke('audio:stop-capture'),
    onVolumeLevel: (callback) => ipcRenderer.on('audio:volume', (_e, level) => callback(level)),
    onAudioData: (callback) => ipcRenderer.on('audio:data', (_e, data) => callback(data)),
  },

  // Transcription
  transcription: {
    onSegment: (callback) => ipcRenderer.on('transcript:segment', (_e, segment) => callback(segment)),
    translate: (text, targetLang) => ipcRenderer.invoke('transcript:translate', text, targetLang),
    getByMeeting: (meetingId) => ipcRenderer.invoke('transcript:get-by-meeting', meetingId),
    updateText: (id, text) => ipcRenderer.invoke('transcript:update-text', id, text),
  },

  // Meetings
  meetings: {
    create: (title, sourceApp, language) => ipcRenderer.invoke('meeting:create', title, sourceApp, language),
    getAll: () => ipcRenderer.invoke('meeting:get-all'),
    getById: (id) => ipcRenderer.invoke('meeting:get-by-id', id),
    update: (id, data) => ipcRenderer.invoke('meeting:update', id, data),
    delete: (id) => ipcRenderer.invoke('meeting:delete', id),
    search: (query) => ipcRenderer.invoke('meeting:search', query),
  },

  // Analysis
  analysis: {
    analyze: (meetingId) => ipcRenderer.invoke('analysis:analyze', meetingId),
    getResults: (meetingId) => ipcRenderer.invoke('analysis:get-results', meetingId),
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
  },

  // Export
  export: {
    toJSON: (meetingId) => ipcRenderer.invoke('export:json', meetingId),
    toText: (meetingId) => ipcRenderer.invoke('export:text', meetingId),
    toPDF: (meetingId) => ipcRenderer.invoke('export:pdf', meetingId),
  },

  // Notes
  notes: {
    create: (note) => ipcRenderer.invoke('note:create', note),
    getByMeeting: (meetingId) => ipcRenderer.invoke('note:get-by-meeting', meetingId),
    getBySegment: (segmentId) => ipcRenderer.invoke('note:get-by-segment', segmentId),
    update: (id, content) => ipcRenderer.invoke('note:update', id, content),
    togglePin: (id) => ipcRenderer.invoke('note:toggle-pin', id),
    delete: (id) => ipcRenderer.invoke('note:delete', id),
  },

  // Calendar
  calendar: {
    create: (event) => ipcRenderer.invoke('calendar:create', event),
    getAll: () => ipcRenderer.invoke('calendar:get-all'),
    getByDateRange: (start, end) => ipcRenderer.invoke('calendar:get-by-date-range', start, end),
    getByMeeting: (meetingId) => ipcRenderer.invoke('calendar:get-by-meeting', meetingId),
    update: (id, data) => ipcRenderer.invoke('calendar:update', id, data),
    delete: (id) => ipcRenderer.invoke('calendar:delete', id),
  },

  // Tags
  tags: {
    create: (name, color) => ipcRenderer.invoke('tag:create', name, color),
    getAll: () => ipcRenderer.invoke('tag:get-all'),
    getByMeeting: (meetingId) => ipcRenderer.invoke('tag:get-by-meeting', meetingId),
    addToMeeting: (meetingId, tagName, color) => ipcRenderer.invoke('tag:add-to-meeting', meetingId, tagName, color),
    removeFromMeeting: (meetingId, tagId) => ipcRenderer.invoke('tag:remove-from-meeting', meetingId, tagId),
    delete: (id) => ipcRenderer.invoke('tag:delete', id),
  },

  // Generic invoke (system-info, models, etc.)
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
})

// IPC event listener for download progress, recording shortcuts, etc.
const ALLOWED_PUSH_CHANNELS = new Set([
  'models:download-progress', 'models:download-done', 'models:download-error',
  'audio:volume', 'transcript:segment', 'transcript:error',
  'shortcut:toggle-recording',
])

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel, listener) => {
      if (ALLOWED_PUSH_CHANNELS.has(channel)) ipcRenderer.on(channel, listener)
    },
    removeListener: (channel, listener) => {
      if (ALLOWED_PUSH_CHANNELS.has(channel)) ipcRenderer.removeListener(channel, listener)
    },
  },
})
