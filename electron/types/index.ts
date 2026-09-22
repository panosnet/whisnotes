export interface Meeting {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  sourceApp: string
  language: string
  timezone: string
  location?: string
  participants?: string[]
  durationSeconds?: number
  recordingDevice?: string
  audioQuality?: string
  notes?: string
  tags?: string[]
  isStarred: boolean
  isArchived: boolean
  calendarEventId?: string
  createdAt: Date
  updatedAt: Date
}

export interface TranscriptSegment {
  id: string
  meetingId: string
  timestamp: number
  text: string
  language: string
  translation?: string
  confidence: number
  speakerId?: number
  speakerName?: string
  isImportant: boolean
  notes?: string
  createdAt: Date
}

export interface AnalysisResult {
  id: string
  meetingId: string
  summary: string
  keyPoints: string[]
  actionItems: ActionItem[]
  topics: Topic[]
  speakers?: SpeakerInfo[]
  createdAt: Date
}

export interface ActionItem {
  text: string
  assignee?: string
  dueDate?: Date
  priority: 'high' | 'medium' | 'low'
  isCompleted?: boolean
}

export interface Topic {
  name: string
  segments: number[]
  relevance: number
}

export interface SpeakerInfo {
  id: number
  name?: string
  segmentCount: number
}

export interface Note {
  id: string
  meetingId?: string
  segmentId?: string
  content: string
  type: 'general' | 'question' | 'action' | 'decision' | 'idea'
  color?: string
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CalendarEvent {
  id: string
  meetingId?: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  timezone: string
  location?: string
  attendees?: string[]
  reminderMinutes?: number
  recurrenceRule?: string
  externalId?: string
  externalSource?: string
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: Date
}

export interface AudioDevice {
  id: string
  name: string
  kind: 'audioinput' | 'audiooutput'
  isDefault: boolean
}

export interface AppSettings {
  openaiApiKey?: string
  anthropicApiKey?: string
  defaultLanguage: string
  autoDetectLanguage: boolean
  theme: 'light' | 'dark' | 'system'
  audioDeviceId?: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  calendarIntegration?: 'google' | 'outlook' | 'apple' | 'none'
  whisperMode: 'local' | 'api'
  whisperModelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large'
}

export interface AudioChunk {
  buffer: ArrayBuffer
  timestamp: number
  sampleRate: number
}

export interface MeetingMetadata {
  totalDuration: number
  totalSegments: number
  wordCount: number
  speakerCount: number
  languagesDetected: string[]
  averageConfidence: number
  recordingQuality: 'excellent' | 'good' | 'fair' | 'poor'
  fileSize?: number
}
