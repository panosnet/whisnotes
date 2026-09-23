import { useState, useEffect } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MessageSquare,
  FileText,
  Star,
  Mic,
  Monitor,
  X,
  Sparkles
} from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'
import type { Meeting } from '../types'

interface CalendarEvent {
  id: string
  meetingId?: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  timezone: string
  location?: string
  attendees?: string[]
}

interface DaySummary {
  date: Date
  meetingCount: number
  totalDuration: number
  recordingSource: 'microphone' | 'system-audio' | 'both'
  hasStarred: boolean
  transcriptCount: number
  meetings: Meeting[]
}

export default function EnhancedCalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [daySummaries, setDaySummaries] = useState<Map<string, DaySummary>>(new Map())
  const [monthStats, setMonthStats] = useState({
    totalMeetings: 0,
    totalDuration: 0,
    avgMeetingsPerDay: 0,
    mostProductiveDay: '',
    starredCount: 0
  })
  const { setCurrentMeeting, meetings } = useMeetingStore()

  // loadEvents depends only on date (calendar events from backend)
  useEffect(() => { loadEvents() }, [currentDate])
  // loadMeetingsForMonth depends on both date and meetings store
  useEffect(() => { loadMeetingsForMonth() }, [currentDate, meetings])

  const loadEvents = async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    try {
      const calendarEvents = await window.api.calendar.getByDateRange(start, end)
      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error loading calendar events:', error)
    }
  }

  const loadMeetingsForMonth = async () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    // Get meetings for the month
    const monthMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.createdAt)
      return meetingDate >= start && meetingDate <= end
    })

    // Create day summaries
    const summaries = new Map<string, DaySummary>()
    monthMeetings.forEach(meeting => {
      const dateKey = new Date(meeting.createdAt).toDateString()
      const existing = summaries.get(dateKey)

      if (existing) {
        existing.meetingCount++
        existing.totalDuration += meeting.durationSeconds || 0
        existing.transcriptCount += meeting.transcriptCount || 0
        if (meeting.isStarred) existing.hasStarred = true
        existing.meetings.push(meeting)
      } else {
        summaries.set(dateKey, {
          date: new Date(meeting.createdAt),
          meetingCount: 1,
          totalDuration: meeting.durationSeconds || 0,
          recordingSource: meeting.recordingDevice as any || 'microphone',
          hasStarred: meeting.isStarred || false,
          transcriptCount: meeting.transcriptCount || 0,
          meetings: [meeting]
        })
      }
    })

    setDaySummaries(summaries)

    // Calculate month stats
    const totalDuration = monthMeetings.reduce((sum, m) => sum + (m.durationSeconds || 0), 0)
    const daysWithMeetings = summaries.size
    const starredCount = monthMeetings.filter(m => m.isStarred).length

    // Find most productive day
    let maxMeetings = 0
    let mostProductiveDay = ''
    summaries.forEach((summary, dateKey) => {
      if (summary.meetingCount > maxMeetings) {
        maxMeetings = summary.meetingCount
        mostProductiveDay = new Date(dateKey).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      }
    })

    setMonthStats({
      totalMeetings: monthMeetings.length,
      totalDuration,
      avgMeetingsPerDay: daysWithMeetings > 0 ? monthMeetings.length / daysWithMeetings : 0,
      mostProductiveDay,
      starredCount
    })
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getSummaryForDay = (date: Date): DaySummary | undefined => {
    return daySummaries.get(date.toDateString())
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    setSelectedDay(null)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
  }

  const handleEventClick = async (event: CalendarEvent) => {
    if (event.meetingId) {
      const meeting = meetings.find(m => m.id === event.meetingId)
      if (meeting) {
        setCurrentMeeting(meeting)
      }
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Week navigation helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  const getWeekDays = () => {
    const start = getWeekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d
    })
  }
  const previousWeek = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })

  const monthName = view === 'week'
    ? `Week of ${getWeekStart(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = getDaysInMonth()

  return (
    <div className="h-full flex bg-[#07080f]">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-ink-900 border-b border-ink-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar size={24} className="text-primary-500" />
              Calendar
            </h2>
            <div className="flex gap-2">
              {(['month', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    view === v ? 'bg-primary-600' : 'bg-ink-800 hover:bg-slate-700'
                  }`}>{v}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{monthName}</h3>
            <div className="flex gap-2">
              <button
                onClick={view === 'week' ? previousWeek : previousMonth}
                className="p-2 bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  setCurrentDate(today)
                  setSelectedDay(today) // also open today's panel
                }}
                className="px-4 py-2 bg-ink-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Today
              </button>
              <button
                onClick={view === 'week' ? nextWeek : nextMonth}
                className="p-2 bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Month Statistics */}
          <div className="mt-4 grid grid-cols-5 gap-3">
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Total Meetings</div>
              <div className="text-xl font-bold text-white">{monthStats.totalMeetings}</div>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Total Time</div>
              <div className="text-xl font-bold text-white">{formatDuration(monthStats.totalDuration)}</div>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Avg/Day</div>
              <div className="text-xl font-bold text-white">{monthStats.avgMeetingsPerDay.toFixed(1)}</div>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Starred</div>
              <div className="text-xl font-bold text-yellow-400">{monthStats.starredCount}</div>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Most Active</div>
              <div className="text-sm font-bold text-white truncate">{monthStats.mostProductiveDay || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* ── Week View ─────────────────────────────────────────────────── */}
        {view === 'week' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map(date => {
                const isToday = date.toDateString() === new Date().toDateString()
                const summary = getSummaryForDay(date)
                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => setSelectedDay(date)}
                    className={`min-h-48 p-3 border rounded-xl cursor-pointer transition-all bg-ink-900 hover:bg-ink-800 ${
                      isToday ? 'ring-2 ring-primary-600 border-primary-600/50' : 'border-ink-700'
                    } ${selectedDay?.toDateString() === date.toDateString() ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex flex-col items-center mb-3">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-2xl font-bold mt-0.5 ${isToday ? 'text-primary-400' : 'text-white'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    {summary ? (
                      <div className="space-y-1.5">
                        {summary.meetings.slice(0, 4).map(m => (
                          <div
                            key={m.id}
                            onClick={e => { e.stopPropagation(); setCurrentMeeting(m) }}
                            className="text-xs p-1.5 bg-primary-600/20 border border-primary-600/30 rounded-lg hover:bg-primary-600/30 transition-colors truncate cursor-pointer"
                          >
                            <div className="font-medium text-primary-200 truncate">{m.title}</div>
                            {m.durationSeconds && (
                              <div className="text-primary-400 mt-0.5">{formatDuration(m.durationSeconds)}</div>
                            )}
                          </div>
                        ))}
                        {summary.meetingCount > 4 && (
                          <div className="text-xs text-slate-400 text-center">+{summary.meetingCount - 4} more</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 text-center mt-4">No meetings</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Month View ─────────────────────────────────────────────────── */}
        {view === 'month' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-400 pb-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDay(date) : []
              const daySummary = date ? getSummaryForDay(date) : undefined
              const isToday = date && date.toDateString() === new Date().toDateString()
              const isSelected = date && selectedDay && date.toDateString() === selectedDay.toDateString()

              return (
                <div
                  key={index}
                  onClick={() => date && handleDayClick(date)}
                  className={`min-h-32 p-3 border rounded-lg cursor-pointer transition-all ${
                    date ? 'bg-ink-900 hover:bg-ink-800' : 'bg-[#07080f]'
                  } ${isToday ? 'ring-2 ring-primary-600' : 'border-ink-700'} ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-sm font-medium ${isToday ? 'text-primary-500' : 'text-slate-400'}`}>
                          {date.getDate()}
                        </div>
                        {daySummary && (
                          <div className="flex items-center gap-1">
                            {daySummary.hasStarred && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                            {daySummary.recordingSource === 'system-audio' && (
                              <Monitor size={12} className="text-blue-400" />
                            )}
                            {daySummary.recordingSource === 'microphone' && (
                              <Mic size={12} className="text-green-400" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Day summary stats */}
                      {daySummary && (
                        <div className="mb-2 p-2 bg-gradient-to-br from-primary-900/20 to-purple-900/20 rounded border border-primary-800/30">
                          <div className="text-xs text-primary-300 font-medium">
                            {daySummary.meetingCount} meeting{daySummary.meetingCount !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={10} />
                            {formatDuration(daySummary.totalDuration)}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <MessageSquare size={10} />
                            {daySummary.transcriptCount} segments
                          </div>
                        </div>
                      )}

                      {/* Calendar events */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEventClick(event)
                            }}
                            className="text-xs p-1.5 bg-blue-600/20 border border-blue-600/30 rounded hover:bg-blue-600/30 transition-colors"
                          >
                            <div className="font-medium text-blue-300 truncate">{event.title}</div>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-slate-400 pl-1.5">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )} {/* end month view */}
      </div>

      {/* Sidebar - Day Details */}
      {selectedDay && (
        <div className="w-96 bg-ink-900 border-l border-ink-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-ink-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {selectedDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-sm text-slate-400">
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-2 hover:bg-ink-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Day Summary */}
          {(() => {
            const summary = getSummaryForDay(selectedDay)
            if (!summary) {
              return (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No meetings this day</p>
                  </div>
                </div>
              )
            }

            return (
              <div className="flex-1 overflow-y-auto">
                {/* Summary Stats */}
                <div className="p-4 space-y-3">
                  <div className="bg-gradient-to-br from-primary-900/30 to-purple-900/30 rounded-lg p-4 border border-primary-800/30">
                    <div className="flex items-center gap-2 text-primary-300 mb-2">
                      <Sparkles size={16} />
                      <span className="font-medium">Day Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-400">Meetings</div>
                        <div className="text-white font-semibold">{summary.meetingCount}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Duration</div>
                        <div className="text-white font-semibold">{formatDuration(summary.totalDuration)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Transcripts</div>
                        <div className="text-white font-semibold">{summary.transcriptCount}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Source</div>
                        <div className="text-white font-semibold capitalize flex items-center gap-1">
                          {summary.recordingSource === 'system-audio' && <Monitor size={14} />}
                          {summary.recordingSource === 'microphone' && <Mic size={14} />}
                          {summary.recordingSource === 'system-audio' ? 'System' : 'Mic'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meetings List */}
                  <div>
                    <h4 className="font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <FileText size={16} />
                      Meetings
                    </h4>
                    <div className="space-y-2">
                      {summary.meetings.map(meeting => (
                        <div
                          key={meeting.id}
                          onClick={() => setCurrentMeeting(meeting)}
                          className="bg-ink-800 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors border border-ink-600"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-white flex items-center gap-2">
                                {meeting.title}
                                {meeting.isStarred && (
                                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {new Date(meeting.createdAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>

                          {meeting.description && (
                            <p className="text-sm text-slate-400 mb-2 line-clamp-2">{meeting.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {meeting.durationSeconds && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDuration(meeting.durationSeconds)}
                              </div>
                            )}
                            {meeting.transcriptCount && (
                              <div className="flex items-center gap-1">
                                <MessageSquare size={12} />
                                {meeting.transcriptCount} segments
                              </div>
                            )}
                            {meeting.language && (
                              <div className="uppercase">
                                {meeting.language}
                              </div>
                            )}
                          </div>

                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-ink-600">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Users size={12} />
                                {meeting.participants.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
