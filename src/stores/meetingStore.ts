import { create } from 'zustand'
import type { Meeting, AnalysisResult } from '../types'

interface MeetingStore {
  meetings: Meeting[]
  currentMeeting?: Meeting
  currentAnalysis?: AnalysisResult
  setMeetings: (meetings: Meeting[]) => void
  setCurrentMeeting: (meeting: Meeting | undefined) => void
  setCurrentAnalysis: (analysis: AnalysisResult | undefined) => void
  addMeeting: (meeting: Meeting) => void
  updateMeeting: (id: string, data: Partial<Meeting>) => void
  removeMeeting: (id: string) => void
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],

  setMeetings: (meetings) => set({ meetings }),

  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  addMeeting: (meeting) =>
    set((state) => ({ meetings: [meeting, ...state.meetings] })),

  updateMeeting: (id, data) =>
    set((state) => {
      const meetings = state.meetings.map((m) => m.id === id ? { ...m, ...data } : m)
      const currentMeeting = state.currentMeeting?.id === id
        ? { ...state.currentMeeting, ...data }
        : state.currentMeeting
      return { meetings, currentMeeting }
    }),

  removeMeeting: (id) =>
    set((state) => ({
      meetings: state.meetings.filter((m) => m.id !== id),
    })),
}))
