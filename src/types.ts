export interface Meeting {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  sourceApp: string
  language: string
  createdAt: Date
  // Extended metadata
  timezone?: string
  location?: string
  participants?: string[]
  notes?: string
  description?: string
  durationSeconds?: number
  transcriptCount?: number
  isStarred?: boolean
  isArchived?: boolean
  recordingDevice?: string
  audioQuality?: string
  calendarEventId?: string
  updatedAt?: Date
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

export interface AudioDevice {
  id: string
  name: string
  kind: 'audioinput' | 'audiooutput'
  isDefault: boolean
}

export type Language = 'auto' | 'en' | 'el' | 'cs'
