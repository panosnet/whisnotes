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
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="border-b px-8 pt-7 pb-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Wand2 size={20} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="font-semibold text-lg" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>Voice Studio</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clone voices · Synthesise speech · Real-time transformation</p>
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
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>New Voice Profile</div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Profile name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John from standup"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Audio source</label>
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
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Select meeting (needs {'>'}3s of audio)
              </label>
              <select
                value={meetingId}
                onChange={e => setMeetingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <option value="">— Choose a meeting —</option>
                {meetingsWithRecording.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({Math.round((m.durationSeconds || 0) / 60)}m)
                  </option>
                ))}
              </select>
              {meetingsWithRecording.length === 0 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
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
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: '#94a3b8' }}
              >
                <Upload size={14} /> Choose audio file
              </button>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>WAV, MP3, M4A · 3s minimum · 30s+ recommended</p>
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
              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
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
        <div className="flex items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading voices…
        </div>
      ) : profiles.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', paddingTop: 8 }}>
          No voice profiles yet. Create one from a meeting recording.
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3 rounded-xl group transition-all"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Volume2 size={16} style={{ color: '#6366f1' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {p.durationSecs ? `${p.durationSecs.toFixed(0)}s sample · ` : ''}
                  {p.provider === 'elevenlabs' ? 'ElevenLabs' : 'Local XTTS'} ·{' '}
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => onDelete(p.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)' }}
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null)   // blob URL — works from any origin
  const [rawPath, setRawPath] = useState<string | null>(null)   // file path for saving
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Clean up blob URL on unmount
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }, [blobUrl])

  useEffect(() => {
    const onProgress = (_: any, data: { status: string; path?: string }) => {
      if (data.status === 'done' && data.path) {
        setRawPath(data.path)
        setSynthesising(false)
        // Load as blob to avoid file:// origin restriction in dev mode
        window.api.invoke('audio:read-file', data.path).then((buf: any) => {
          if (buf) {
            setBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
            const blob = new Blob([new Uint8Array(buf)], { type: 'audio/wav' })
            setBlobUrl(URL.createObjectURL(blob))
          }
        }).catch(() => setRawPath(data.path!))
      }
    }
    window.electron.ipcRenderer.on('voice:synthesis-progress', onProgress)
    return () => window.electron.ipcRenderer.removeListener('voice:synthesis-progress', onProgress)
  }, [])

  const handleSynthesize = async () => {
    if (!voiceId) { setError('Select a voice'); return }
    if (!text.trim()) { setError('Enter some text'); return }
    setError(null); setSynthesising(true); setBlobUrl(null); setRawPath(null)
    try {
      await window.api.voice.synthesize(text.trim(), voiceId)
    } catch (err: any) {
      setError(err.message || 'Synthesis failed'); setSynthesising(false)
    }
  }

  const handleSave = async () => {
    if (!rawPath) return
    await window.api.voice.saveSynthesis(rawPath)
  }

  if (profiles.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Create a voice profile first in the Voice Library tab.
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Voice</label>
        <select
          value={voiceId}
          onChange={e => setVoiceId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">— Select voice —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Text to synthesise</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type what you want the voice to say…"
          rows={5}
          className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: 1.6 }}
        />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'right', marginTop: 4 }}>
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

        {rawPath && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: '#94a3b8' }}
          >
            <Save size={14} /> Save WAV
          </button>
        )}
      </div>

      {blobUrl && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Generated audio</div>
          <audio ref={audioRef} controls src={blobUrl} className="w-full" autoPlay />
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
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  // Audio pipeline refs — live for the duration of a real-time session
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const processorRef   = useRef<ScriptProcessorNode | null>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const isActiveRef    = useRef(false)  // ref so onaudioprocess closure always reads current value

  useEffect(() => {
    window.api.voice.checkBlackhole().then(r => setBlackholeInstalled(r.installed))
    // Clean up on unmount
    return () => { stopPipeline() }
  }, [])

  const stopPipeline = () => {
    isActiveRef.current = false  // stops onaudioprocess from sending new chunks
    processorRef.current?.disconnect()
    processorRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }

  const handleToggle = async () => {
    if (!voiceId) { setError('Select a voice'); return }
    setError(null)

    if (running) {
      stopPipeline()
      await window.api.voice.realtimeStop()
      setRunning(false)
      setLatencyMs(null)
      return
    }

    try {
      await window.api.voice.realtimeStart(voiceId)
      isActiveRef.current = true

      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
      })
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = ctx

      const src = ctx.createMediaStreamSource(stream)
      // 3200 samples = 200ms at 16 kHz
      const proc = ctx.createScriptProcessor(3200, 1, 1)
      processorRef.current = proc

      proc.onaudioprocess = async (e) => {
        if (!isActiveRef.current) return  // ref guard — not stale state closure
        const float32 = e.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32767))
        }
        // Safe chunked base64 — btoa(...spread) exceeds arg limit at large buffers
        const bytes = new Uint8Array(int16.buffer)
        let b64str = ''
        for (let i = 0; i < bytes.length; i += 1024) {
          b64str += String.fromCharCode(...bytes.subarray(i, i + 1024))
        }
        const b64 = btoa(b64str)
        const t0 = Date.now()
        try {
          const res = await window.api.voice.realtimeChunk(b64)
          setLatencyMs(Date.now() - t0)
          if (res?.audiob64) {
            // Decode and play converted audio
            const pcmBytes = Uint8Array.from(atob(res.audiob64), c => c.charCodeAt(0))
            const int16Out = new Int16Array(pcmBytes.buffer)
            const float32Out = new Float32Array(int16Out.length)
            for (let i = 0; i < int16Out.length; i++) float32Out[i] = int16Out[i] / 32768
            const outBuf = ctx.createBuffer(1, float32Out.length, 16000)
            outBuf.copyToChannel(float32Out, 0)
            const srcOut = ctx.createBufferSource()
            srcOut.buffer = outBuf
            srcOut.connect(ctx.destination)
            srcOut.start()
          }
        } catch { /* chunk error — keep running */ }
      }

      src.connect(proc)
      proc.connect(ctx.destination)
      setRunning(true)
    } catch (err: any) {
      setError(err.message || 'Failed to start')
      stopPipeline()
    }
  }

  if (profiles.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Create a voice profile first in the Voice Library tab.
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      {/* BlackHole status */}
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c7d2fe', marginBottom: 12 }}>
          Virtual Audio Device (BlackHole)
        </div>
        {blackholeInstalled === null ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Checking…</div>
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
            <div className="rounded-lg p-3 font-mono" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              brew install --cask blackhole-2ch
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.api.voice.openBlackholeUrl()}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: 'var(--bg-raised)', color: '#94a3b8' }}
              >More info →</button>
              <button
                onClick={() => window.api.voice.checkBlackhole().then(r => setBlackholeInstalled(r.installed))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: 'var(--bg-raised)', color: '#94a3b8' }}
              ><RefreshCw size={11} /> Recheck</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Voice to use</label>
        <select
          value={voiceId}
          onChange={e => setVoiceId(e.target.value)}
          disabled={running}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
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
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
        style={{ background: running ? '#7f1d1d' : '#4f46e5', color: 'white' }}
      >
        {running ? <><Square size={14} /> Stop Real-time</> : <><Mic size={14} /> Start Real-time Conversion</>}
      </button>

      {running && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: '#f97316', fontSize: '0.78rem' }}>
              <div className="w-2 h-2 rounded-full rec-pulse" style={{ background: '#f97316' }} />
              Transforming mic input in real-time
            </div>
            {latencyMs !== null && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {latencyMs}ms
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Converted audio plays through your <strong style={{ color: '#94a3b8' }}>default output</strong>.
            {blackholeInstalled
              ? <> To route into calls: set <strong style={{ color: '#94a3b8' }}>BlackHole 2ch</strong> as your output in System Settings, then as microphone in Zoom/Meet.</>
              : <> Install BlackHole to route transformed audio into calls.</>
            }
          </p>
        </div>
      )}
    </div>
  )
}
