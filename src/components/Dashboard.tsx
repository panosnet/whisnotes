import { useState, useEffect } from 'react'
import { Mic, FileText, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'
import type { Meeting } from '../types'

interface EnvStatus {
  sox: boolean
  python: boolean
  whisper: boolean
  checked: boolean
}

interface DashboardProps {
  onStartRecording: () => void
  onOpenMeeting: () => void
}

export default function Dashboard({ onStartRecording, onOpenMeeting }: DashboardProps) {
  const { meetings, setCurrentMeeting } = useMeetingStore()
  const [env, setEnv] = useState<EnvStatus>({ sox: false, python: false, whisper: false, checked: false })

  const recentMeetings = [...meetings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const thisMonth = new Date()
  const monthMeetings = meetings.filter(m => {
    const d = new Date(m.createdAt)
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
  })

  const totalSeconds = monthMeetings.reduce((s, m) => s + (m.durationSeconds || 0), 0)

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  useEffect(() => {
    window.api.invoke('env:check').then((result: any) => {
      if (result) setEnv({ ...result, checked: true })
    }).catch(() => {
      // Fail safe: if check itself errors, show warnings not false success
      setEnv({ sox: false, python: false, whisper: false, checked: true })
    })
  }, [])

  const handleMeetingClick = (meeting: Meeting) => {
    setCurrentMeeting(meeting)
    onOpenMeeting()
  }

  const allGood = env.sox && env.python && env.whisper

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            WhisNotes
          </h1>
          <p className="text-slate-400 mt-1">AI-powered meeting transcription</p>
        </div>

        {/* Environment Status (only if something is wrong) */}
        {env.checked && !allGood && (
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5 space-y-3">
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <AlertCircle size={18} />
              Setup Required
            </div>
            <div className="space-y-2 text-sm">
              <StatusRow ok={env.sox} label="SoX audio tool" fix="brew install sox" />
              <StatusRow ok={env.python} label="Python venv" fix="python3 -m venv venv && source venv/bin/activate" />
              <StatusRow ok={env.whisper} label="OpenAI Whisper" fix="source venv/bin/activate && pip install openai-whisper" />
            </div>
          </div>
        )}

        {/* Record Button */}
        <button
          onClick={onStartRecording}
          className="w-full py-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 rounded-2xl font-semibold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-900/50"
        >
          <Mic size={28} />
          Start Recording
        </button>

        {/* Month Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm mb-1">Meetings this month</div>
            <div className="text-3xl font-bold text-white">{monthMeetings.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-slate-400 text-sm mb-1">Total recorded time</div>
            <div className="text-3xl font-bold text-white">{formatDuration(totalSeconds)}</div>
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-primary-400" />
            Recent Meetings
          </h2>

          {recentMeetings.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Mic size={40} className="mx-auto mb-3 opacity-30" />
              <p>No recordings yet. Hit "Start Recording" to begin!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMeetings.map(meeting => (
                <button
                  key={meeting.id}
                  onClick={() => handleMeetingClick(meeting)}
                  className="w-full text-left bg-slate-900 border border-slate-800 hover:border-primary-600/50 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{meeting.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                        <span>{new Date(meeting.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {meeting.durationSeconds && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(meeting.durationSeconds)}
                          </span>
                        )}
                        <span className="uppercase text-xs">{meeting.language}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Status (compact, only when everything is OK) */}
        {env.checked && allGood && (
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> SoX</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Python</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Whisper</span>
            <span className="ml-auto">All systems ready ✓</span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusRow({ ok, label, fix }: { ok: boolean; label: string; fix: string }) {
  return (
    <div className="flex items-start gap-3">
      {ok
        ? <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
        : <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
      }
      <div>
        <div className={ok ? 'text-slate-300' : 'text-amber-300'}>{label}</div>
        {!ok && <code className="text-xs text-slate-400">{fix}</code>}
      </div>
    </div>
  )
}
