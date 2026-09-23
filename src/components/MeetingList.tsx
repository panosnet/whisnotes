import { useState, useEffect } from 'react'
import { Search, Calendar, Globe, Trash2, Clock, Loader2 } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'
import type { Meeting } from '../types'
import MeetingDetail from './MeetingDetail'

export default function MeetingList() {
  const { meetings, setMeetings, currentMeeting, setCurrentMeeting, removeMeeting } = useMeetingStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    // Only reload from backend when store is empty (avoids double-load with App.tsx)
    if (meetings.length === 0) loadMeetings()
    else { setFilteredMeetings(meetings); setIsLoading(false) }
  }, [])

  // Debounced search — skip debounce when query is empty for instant feedback
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMeetings(meetings)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await window.api.meetings.search(searchQuery)
        setFilteredMeetings(results)
      } catch {
        setFilteredMeetings(meetings.filter(m =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, meetings])

  const loadMeetings = async () => {
    setIsLoading(true)
    try {
      const allMeetings = await window.api.meetings.getAll()
      setMeetings(allMeetings)
      setFilteredMeetings(allMeetings)
    } catch (err) {
      console.error('Failed to load meetings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  const confirmDelete = async (id: string) => {
    try {
      await window.api.meetings.delete(id)
      removeMeeting(id)
      if (currentMeeting?.id === id) setCurrentMeeting(undefined)
    } catch (err: any) {
      console.error('Failed to delete meeting:', err)
    }
    setDeleteConfirm(null)
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatDuration = (secs?: number) => {
    if (!secs) return null
    const m = Math.floor(secs / 60)
    const h = Math.floor(m / 60)
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
  }

  if (currentMeeting) {
    return <MeetingDetail meeting={currentMeeting} onBack={() => setCurrentMeeting(undefined)} />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-ink-900 border border-ink-600 rounded-xl p-6 max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Delete meeting?</h3>
            <p className="text-slate-400 text-sm">This will permanently delete the recording and its transcript.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => confirmDelete(deleteConfirm)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-ink-900 border-b border-ink-700 p-6">
        <h2 className="text-2xl font-bold mb-4">Your Meetings</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings and transcripts..."
            className="w-full pl-10 pr-4 py-2 bg-ink-800 border border-ink-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Meeting List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 size={20} className="animate-spin" />
            Loading meetings…
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {searchQuery
              ? `No meetings match "${searchQuery}"`
              : 'No meetings yet. Start recording to create your first meeting.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => setCurrentMeeting(meeting)}
                className="bg-ink-800 border border-ink-600 hover:border-primary-600/50 rounded-xl p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {meeting.isStarred && <span className="text-yellow-400 mr-1">★</span>}
                      {meeting.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(meeting.startTime)}</span>
                      <span className="flex items-center gap-1"><Globe size={13} />{meeting.language?.toUpperCase()}</span>
                      {formatDuration(meeting.durationSeconds) && (
                        <span className="flex items-center gap-1"><Clock size={13} />{formatDuration(meeting.durationSeconds)}</span>
                      )}
                      {meeting.sourceApp && (
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{meeting.sourceApp}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(meeting.id, e)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
