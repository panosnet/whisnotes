/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      audio: {
        listDevices: () => Promise<any[]>
        startCapture: (deviceId: string, meetingId: string, language?: string) => Promise<any>
        stopCapture: () => Promise<void>
        onAudioData: (callback: (data: ArrayBuffer) => void) => void
        getRecordingPath: (meetingId: string) => Promise<string | null>
        onVolumeLevel: (callback: (level: number) => void) => void
    getRecordingPath: (meetingId: string) => Promise<string | null>
      }
      transcription: {
        onSegment: (callback: (segment: any) => void) => void
        translate: (text: string, targetLang: string) => Promise<string>
        getByMeeting: (meetingId: string) => Promise<any[]>
        updateText: (id: string, text: string) => Promise<boolean>
      }
      meetings: {
        create: (title: string, sourceApp: string, language: string) => Promise<any>
        getAll: () => Promise<any[]>
        getById: (id: string) => Promise<any>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<void>
        search: (query: string) => Promise<any[]>
      }
      analysis: {
        analyze: (meetingId: string) => Promise<any>
        getResults: (meetingId: string) => Promise<any>
      }
      settings: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<boolean>
        getAll: () => Promise<any>
      }
      export: {
        toJSON: (meetingId: string) => Promise<any>
        toText: (meetingId: string) => Promise<any>
        toPDF: (meetingId: string) => Promise<any>
      }
      notes: {
        create: (note: any) => Promise<any>
        getByMeeting: (meetingId: string) => Promise<any[]>
        getBySegment: (segmentId: string) => Promise<any[]>
        update: (id: string, content: string) => Promise<any>
        togglePin: (id: string) => Promise<any>
        delete: (id: string) => Promise<void>
      }
      calendar: {
        create: (event: any) => Promise<any>
        getAll: () => Promise<any[]>
        getByDateRange: (start: Date, end: Date) => Promise<any[]>
        getByMeeting: (meetingId: string) => Promise<any[]>
        update: (id: string, data: any) => Promise<any>
        delete: (id: string) => Promise<void>
      }
      tags: {
        create: (name: string, color?: string) => Promise<any>
        getAll: () => Promise<any[]>
        getByMeeting: (meetingId: string) => Promise<any[]>
        addToMeeting: (meetingId: string, tagName: string, color?: string) => Promise<any>
        removeFromMeeting: (meetingId: string, tagId: string) => Promise<any>
        delete: (id: string) => Promise<void>
      }
      voice: {
        listProfiles: () => Promise<any[]>
        createProfile: (name: string, samplePath: string, meetingId?: string) => Promise<any>
        deleteProfile: (id: string) => Promise<boolean>
        synthesize: (text: string, voiceId: string) => Promise<{ path: string; durationSecs: number }>
        saveSynthesis: (sourcePath: string) => Promise<string | null>
        realtimeStart: (voiceId: string) => Promise<{ success: boolean }>
        realtimeChunk: (pcmBase64: string) => Promise<{ audiob64: string }>
        realtimeStop: () => Promise<{ success: boolean }>
        checkBlackhole: () => Promise<{ installed: boolean; entries: string[] }>
        openBlackholeUrl: () => Promise<void>
      }
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
    electron: {
      ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => void
        removeListener: (channel: string, listener: (...args: any[]) => void) => void
      }
    }
  }
}

export {}
