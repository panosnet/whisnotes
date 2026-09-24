import { useState, useEffect, useRef } from 'react'
import { Wand2, Plus, Play, Square, Save, Trash2, Mic, Volume2, RefreshCw, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'

interface VoiceProfile {
  id: string
  name: string
  samplePath?: string
  provider: 'local' | 'elevenlabs'
  durationSecs?: number
  sourceMeetingId?: string
  createdAt: string
}

type Tab = 'library' | 'tts' | 'realtime'

export default function VoiceStudio() {
  const [tab, setTab] = useState<Tab>('library')
  const [profiles, setProfiles] = useState<VoiceProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<string | null>(null)

  useEffect(() => {
    loadProfiles()

    const onProgress = (_: any, data: { message: string; done?: boolean }) => {
      setProgress(data.message)
      if (data.done) setTimeout(() => setProgress(null), 3000)
    }
    window.electron.ipcRenderer.on('voice:clone-progress', onProgress)
    return () => window.electron.ipcRenderer.removeListener('voice:clone-progress', onProgress)
  }, [])

  const loadProfiles = async () => {
    setLoading(true)
    try { setProfiles(await window.api.voice.listProfiles()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const deleteProfile = async (id: string) => {
    await window.api.voice.deleteProfile(id)
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#07080f' }}>
      {/* Header */}
      <div className="border-b px-8 pt-7 pb-0" style={{ borderColor: '#1c2030', background: '#0e1016' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Wand2 size={20} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="font-semibold text-lg" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>Voice Studio</h1>
            <p style={{ fontSize: '0.75rem', color: '#475569' }}>Clone voices · Synthesise speech · Real-time transformation</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {([['library', 'Voice Library'], ['tts', 'Text to Speech'], ['realtime', 'Real-time']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-4 py-2.5 text-sm transition-all border-b-2"
              style={{
                borderColor: tab === id ? '#6366f1' : 'transparent',
                color: tab === id ? '#818cf8' : '#475569',
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress banner */}
      {progress && (
        <div className="px-8 py-3 flex items-center gap-3" style={{ background: '#1e1b4b', borderBottom: '1px solid #312e81' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '0.8rem', color: '#c7d2fe' }}>{progress}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        {tab === 'library' && (
          <LibraryTab
            profiles={profiles}
            loading={loading}
            onDelete={deleteProfile}
            onRefresh={loadProfiles}
          />
        )}
        {tab === 'tts' && <TTSTab profiles={profiles} />}
        {tab === 'realtime' && <RealtimeTab profiles={profiles} />}
      </div>
    </div>
  )
}

// ── Library Tab ───────────────────────────────────────────────────────────────

function LibraryTab({ profiles, loading, onDelete, onRefresh }: {
  profiles: VoiceProfile[], loading: boolean
  onDelete: (id: string) => void, onRefresh: () => void
}) {
  const { meetings } = useMeetingStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [source, setSource] = useState<'meeting' | 'file'>('meeting')
  const [meetingId, setMeetingId] = useState('')
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const meetingsWithRecording = meetings.filter((m: any) => m.durationSeconds && m.durationSeconds > 3)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter a name for the voice profile'); return }
    setError(null); setCloning(true)

    try {
      let samplePath = ''

      if (source === 'meeting') {
        if (!meetingId) { setError('Select a meeting'); setCloning(false); return }
        // Recordings are stored as userData/recordings/{meetingId}.wav
        const info = await window.api.invoke('get-system-info')
        samplePath = `${info?.userDataPath || ''}/recordings/${meetingId}.wav`
        // Fallback: use audio:get-recording-path
        const recPath = await window.api.audio.getRecordingPath(meetingId)
        if (recPath) samplePath = recPath
        else { setError('This meeting has no audio recording. Record with audio playback enabled.'); setCloning(false); return }
      } else {
        const files = fileRef.current?.files
        if (!files || files.length === 0) { setError('Select an audio file'); setCloning(false); return }
        samplePath = (files[0] as any).path
      }

      await window.api.voice.createProfile(name.trim(), samplePath, source === 'meeting' ? meetingId : undefined)
      await onRefresh()
      setCreating(false); setName(''); setMeetingId('')
    } catch (err: any) {
      setError(err.message || 'Failed to create voice profile')
    } finally {
      setCloning(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Create button */}
      {!creating && (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
        >
          <Plus size={16} /> Create Voice Profile
        </button>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>New Voice Profile</div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>Profile name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John from standup"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ background: '#141720', border: '1px solid #1c2030', color: '#e2e8f0' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>Audio source</label>
            <div className="flex gap-2">
              {(['meeting', 'file'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all capitalize"
                  style={{
                    background: source === s ? 'rgba(99,102,241,0.15)' : '#141720',
                    border: `1px solid ${source === s ? '#4f46e5' : '#1c2030'}`,
                    color: source === s ? '#818cf8' : '#475569',
                  }}
                >{s === 'meeting' ? 'Meeting recording' : 'Upload file'}</button>
              ))}
            </div>
          </div>

          {source === 'meeting' && (
            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>
                Select meeting (needs {'>'}3s of audio)
              </label>
              <select
                value={meetingId}
                onChange={e => setMeetingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#141720', border: '1px solid #1c2030', color: '#e2e8f0' }}
              >
                <option value="">— Choose a meeting —</option>
                {meetingsWithRecording.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({Math.round((m.durationSeconds || 0) / 60)}m)
                  </option>
                ))}
              </select>
              {meetingsWithRecording.length === 0 && (
                <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: 4 }}>
                  No meetings with recordings yet. Record a meeting first.
                </p>
              )}
            </div>
          )}

          {source === 'file' && (
            <div>
              <input ref={fileRef} type="file" accept=".wav,.mp3,.m4a,.ogg,.flac" className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                style={{ background: '#141720', border: '1px solid #1c2030', color: '#94a3b8' }}
              >
                <Upload size={14} /> Choose audio file
              </button>
              <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>WAV, MP3, M4A · 3s minimum · 30s+ recommended</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#1a0f0f', border: '1px solid #7f1d1d' }}>
              <AlertCircle size={14} style={{ color: '#f87171', marginTop: 1 }} />
              <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setCreating(false); setError(null) }}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ background: '#141720', color: '#64748b' }}
            >Cancel</button>
            <button
              onClick={handleCreate}
              disabled={cloning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: '#4f46e5', color: 'white' }}
            >
              {cloning ? <><Loader2 size={14} className="animate-spin" /> Cloning…</> : <><Wand2 size={14} /> Create Profile</>}
            </button>
          </div>
        </div>
      )}

      {/* Profile list */}
      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: '#475569' }}>
          <Loader2 size={16} className="animate-spin" /> Loading voices…
        </div>
      ) : profiles.length === 0 ? (
        <div style={{ color: '#2e3450', fontSize: '0.85rem', paddingTop: 8 }}>
          No voice profiles yet. Create one from a meeting recording.
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3 rounded-xl group transition-all"
              style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Volume2 size={16} style={{ color: '#6366f1' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 1 }}>
                  {p.durationSecs ? `${p.durationSecs.toFixed(0)}s sample · ` : ''}
                  {p.provider === 'elevenlabs' ? 'ElevenLabs' : 'Local XTTS'} ·{' '}
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => onDelete(p.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                style={{ color: '#475569' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              ><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TTS Tab ───────────────────────────────────────────────────────────────────

function TTSTab({ profiles }: { profiles: VoiceProfile[] }) {
  const [voiceId, setVoiceId] = useState('')
  const [text, setText] = useState('')
  const [synthesising, setSynthesising] = useState(false)
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const onProgress = (_: any, data: { status: string; path?: string }) => {
      if (data.status === 'done' && data.path) { setAudioPath(data.path); setSynthesising(false) }
    }
    window.electron.ipcRenderer.on('voice:synthesis-progress', onProgress)
    return () => window.electron.ipcRenderer.removeListener('voice:synthesis-progress', onProgress)
  }, [])

  const handleSynthesize = async () => {
    if (!voiceId) { setError('Select a voice'); return }
    if (!text.trim()) { setError('Enter some text'); return }
    setError(null); setSynthesising(true); setAudioPath(null)
    try {
      await window.api.voice.synthesize(text.trim(), voiceId)
    } catch (err: any) {
      setError(err.message || 'Synthesis failed'); setSynthesising(false)
    }
  }

  const handleSave = async () => {
    if (!audioPath) return
    const saved = await window.api.voice.saveSynthesis(audioPath)
    if (saved) console.log('Saved to', saved)
  }

  if (profiles.length === 0) return (
    <div style={{ color: '#475569', fontSize: '0.85rem' }}>
      Create a voice profile first in the Voice Library tab.
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>Voice</label>
        <select
          value={voiceId}
          onChange={e => setVoiceId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: '#0e1016', border: '1px solid #1c2030', color: '#e2e8f0' }}
        >
          <option value="">— Select voice —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>Text to synthesise</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type what you want the voice to say…"
          rows={5}
          className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: '#0e1016', border: '1px solid #1c2030', color: '#e2e8f0', lineHeight: 1.6 }}
        />
        <div style={{ fontSize: '0.7rem', color: '#2e3450', textAlign: 'right', marginTop: 4 }}>
          {text.length} chars
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#1a0f0f', border: '1px solid #7f1d1d' }}>
          <AlertCircle size={14} style={{ color: '#f87171', marginTop: 1 }} />
          <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSynthesize}
          disabled={synthesising}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: '#4f46e5', color: 'white' }}
        >
          {synthesising ? <><Loader2 size={14} className="animate-spin" /> Synthesising…</> : <><Play size={14} /> Synthesise</>}
        </button>

        {audioPath && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: '#0e1016', border: '1px solid #1c2030', color: '#94a3b8' }}
          >
            <Save size={14} /> Save WAV
          </button>
        )}
      </div>

      {audioPath && (
        <div className="rounded-xl p-4" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 8 }}>Generated audio</div>
          <audio ref={audioRef} controls src={`file://${audioPath}`} className="w-full" />
        </div>
      )}
    </div>
  )
}

// ── Real-time Tab ─────────────────────────────────────────────────────────────

function RealtimeTab({ profiles }: { profiles: VoiceProfile[] }) {
  const [voiceId, setVoiceId] = useState('')
  const [blackholeInstalled, setBlackholeInstalled] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.voice.checkBlackhole().then(r => setBlackholeInstalled(r.installed))
  }, [])

  const handleToggle = async () => {
    if (!voiceId) { setError('Select a voice'); return }
    setError(null)
    if (running) {
      await window.api.voice.realtimeStop()
      setRunning(false)
    } else {
      try {
        await window.api.voice.realtimeStart(voiceId)
        setRunning(true)
      } catch (err: any) { setError(err.message || 'Failed to start') }
    }
  }

  if (profiles.length === 0) return (
    <div style={{ color: '#475569', fontSize: '0.85rem' }}>
      Create a voice profile first in the Voice Library tab.
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      {/* BlackHole status */}
      <div className="rounded-xl p-5" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c7d2fe', marginBottom: 12 }}>
          Virtual Audio Device (BlackHole)
        </div>
        {blackholeInstalled === null ? (
          <div style={{ color: '#475569', fontSize: '0.8rem' }}>Checking…</div>
        ) : blackholeInstalled ? (
          <div className="flex items-center gap-2" style={{ color: '#34d399', fontSize: '0.8rem' }}>
            <CheckCircle2 size={14} /> BlackHole 2ch detected — real-time mode available
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2" style={{ color: '#fb923c', fontSize: '0.8rem' }}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>BlackHole not found. Install it to route transformed audio into Zoom/Meet/Slack.</span>
            </div>
            <div className="rounded-lg p-3 font-mono" style={{ background: '#07080f', border: '1px solid #1c2030', fontSize: '0.72rem', color: '#64748b' }}>
              brew install --cask blackhole-2ch
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.api.voice.openBlackholeUrl()}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: '#1c2030', color: '#94a3b8' }}
              >More info →</button>
              <button
                onClick={() => window.api.voice.checkBlackhole().then(r => setBlackholeInstalled(r.installed))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: '#1c2030', color: '#94a3b8' }}
              ><RefreshCw size={11} /> Recheck</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: 6 }}>Voice to use</label>
        <select
          value={voiceId}
          onChange={e => setVoiceId(e.target.value)}
          disabled={running}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: '#0e1016', border: '1px solid #1c2030', color: '#e2e8f0' }}
        >
          <option value="">— Select voice —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#1a0f0f', border: '1px solid #7f1d1d' }}>
          <AlertCircle size={14} style={{ color: '#f87171', marginTop: 1 }} />
          <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={!blackholeInstalled}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
        style={{
          background: running ? '#7f1d1d' : '#4f46e5',
          color: 'white',
        }}
      >
        {running ? <><Square size={14} /> Stop Real-time</> : <><Mic size={14} /> Start Real-time Conversion</>}
      </button>

      {running && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
          <div className="flex items-center gap-2" style={{ color: '#f97316', fontSize: '0.78rem' }}>
            <div className="w-2 h-2 rounded-full rec-pulse" style={{ background: '#f97316' }} />
            Transforming mic input in real-time
          </div>
          <p style={{ fontSize: '0.72rem', color: '#475569' }}>
            In Zoom/Meet/Slack: set your microphone to <strong style={{ color: '#94a3b8' }}>BlackHole 2ch</strong> to use the transformed voice.
          </p>
        </div>
      )}
    </div>
  )
}
