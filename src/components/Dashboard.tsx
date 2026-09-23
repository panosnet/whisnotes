import { useState, useEffect } from 'react'
import { Mic, ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'
import type { Meeting } from '../types'

interface EnvStatus { sox: boolean; python: boolean; whisper: boolean; checked: boolean }
interface DashboardProps { onStartRecording: () => void; onOpenMeeting: () => void }

export default function Dashboard({ onStartRecording, onOpenMeeting }: DashboardProps) {
  const { meetings, setCurrentMeeting } = useMeetingStore()
  const [env, setEnv] = useState<EnvStatus>({ sox: false, python: false, whisper: false, checked: false })

  const recent = [...meetings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const now = new Date()
  const monthMeetings = meetings.filter(m => {
    const d = new Date(m.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalSecs = monthMeetings.reduce((s, m) => s + (m.durationSeconds || 0), 0)

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  useEffect(() => {
    window.api.invoke('env:check').then((r: any) => {
      if (r) setEnv({ ...r, checked: true })
    }).catch(() => setEnv({ sox: false, python: false, whisper: false, checked: true }))
  }, [])

  const allReady = env.sox && env.python && env.whisper

  const openMeeting = (m: Meeting) => { setCurrentMeeting(m); onOpenMeeting() }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#07080f' }}>
      <div className="max-w-2xl mx-auto px-8 py-12 space-y-10">

        {/* Wordmark */}
        <div>
          <h1
            className="font-semibold tracking-tight"
            style={{ fontSize: '1.1rem', color: '#6366f1', letterSpacing: '-0.01em' }}
          >
            WhisNotes
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
            Local AI transcription — private by default
          </p>
        </div>

        {/* Primary action — the one bold moment on this screen */}
        <button
          onClick={onStartRecording}
          className="w-full flex items-center gap-5 rounded-2xl transition-all group"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            padding: '28px 32px',
          }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{ width: 48, height: 48, background: '#4f46e5' }}
          >
            <Mic size={22} color="white" />
          </div>
          <div className="text-left flex-1">
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#e0e7ff' }}>
              Start Recording
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6366f1', marginTop: 2 }}>
              Microphone or system audio · ⌘⌥R from any app
            </div>
          </div>
          <ChevronRight
            size={18}
            color="#4f46e5"
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>

        {/* Setup issues — only shown when something's wrong */}
        {env.checked && !allReady && (
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: '#120e00', border: '1px solid #422006' }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fb923c' }}>
              Setup needed before recording
            </div>
            <SetupRow ok={env.sox}     label="SoX"    fix="brew install sox" />
            <SetupRow ok={env.python}  label="Python venv" fix="python3 -m venv venv && source venv/bin/activate" />
            <SetupRow ok={env.whisper} label="Whisper"  fix="pip install openai-whisper" />
          </div>
        )}

        {/* Month stats — two numbers, no more */}
        {monthMeetings.length > 0 && (
          <div className="flex gap-6">
            <Stat value={monthMeetings.length} label="recordings this month" />
            <div style={{ width: 1, background: '#1c2030' }} />
            <Stat value={fmtDuration(totalSecs)} label="total recorded" />
          </div>
        )}

        {/* Recent meetings */}
        {recent.length > 0 && (
          <div>
            <div
              style={{ fontSize: '0.72rem', color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}
            >
              Recent
            </div>
            <div className="space-y-1">
              {recent.map(m => (
                <MeetingRow key={m.id} meeting={m} onClick={() => openMeeting(m)} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recent.length === 0 && env.checked && (
          <div style={{ color: '#2e3450', fontSize: '0.85rem', paddingTop: 16 }}>
            No recordings yet. Hit Start Recording to begin.
          </div>
        )}

        {/* System status — compact footer when everything is fine */}
        {env.checked && allReady && (
          <div className="flex items-center gap-4 pt-2" style={{ color: '#2e3450', fontSize: '0.7rem' }}>
            <span>SoX ✓</span><span>Python ✓</span><span>Whisper ✓</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#e0e7ff', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function SetupRow({ ok, label, fix }: { ok: boolean; label: string; fix: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok
        ? <CheckCircle2 size={14} color="#10b981" className="mt-0.5 flex-shrink-0" />
        : <XCircle     size={14} color="#fb923c" className="mt-0.5 flex-shrink-0" />}
      <div>
        <span style={{ fontSize: '0.78rem', color: ok ? '#94a3b8' : '#e2e8f0' }}>{label}</span>
        {!ok && (
          <code
            style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: 2, fontFamily: 'JetBrains Mono, Menlo, monospace' }}
          >{fix}</code>
        )}
      </div>
    </div>
  )
}

function MeetingRow({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const date = new Date(meeting.createdAt)
  const isToday = date.toDateString() === new Date().toDateString()
  const dateStr = isToday
    ? `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group transition-all"
      style={{ color: '#94a3b8' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#0e1016')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {meeting.isStarred && (
        <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>★</span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 500 }}
        >
          {meeting.title}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {meeting.durationSeconds && (
          <span className="flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
            <Clock size={11} />
            {Math.round(meeting.durationSeconds / 60)}m
          </span>
        )}
        <span style={{ fontSize: '0.72rem' }}>{dateStr}</span>
        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}
