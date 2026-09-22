import { create } from 'zustand'
import type { TranscriptSegment } from '../types'

interface TranscriptStore {
  segments: TranscriptSegment[]
  currentMeetingId?: string
  showTranslation: boolean
  targetLanguage: string
  addSegment: (segment: TranscriptSegment) => void
  clearSegments: () => void
  setCurrentMeeting: (meetingId: string) => void
  toggleTranslation: () => void
  setTargetLanguage: (lang: string) => void
  updateSegmentTranslation: (id: string, translation: string) => void
}

export const useTranscriptStore = create<TranscriptStore>((set) => ({
  segments: [],
  showTranslation: false,
  targetLanguage: 'en',

  addSegment: (segment) =>
    set((state) => ({
      // Deduplicate by id — guards against double-listener from React StrictMode
      segments: state.segments.some(s => s.id === segment.id)
        ? state.segments
        : [...state.segments, segment],
    })),

  clearSegments: () => set({ segments: [] }),

  setCurrentMeeting: (meetingId) =>
    set({ currentMeetingId: meetingId, segments: [] }),

  toggleTranslation: () =>
    set((state) => ({ showTranslation: !state.showTranslation })),

  setTargetLanguage: (lang) => set({ targetLanguage: lang }),

  updateSegmentTranslation: (id, translation) =>
    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === id ? { ...seg, translation } : seg
      ),
    })),
}))
