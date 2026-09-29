import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Trash2, Mic, Upload, CheckCircle2, Loader2, ScanFace } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'

interface SpeakerProfile {
  id: string
  name: string
  description?: string
  sampleCount: number
  lastSeenAt?: string
  createdAt: string
}

export default function PeopleDirectory() {
  const [people, setPeople] = useState<SpeakerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  useEffect(() => {
    load()
    const onProgress = (_: any, data: { message: string; done?: boolean }) => {
      setProgress(data.message)
      if (data.done) setTimeout(() => setProgress(null), 3000)
    }
    window.electron.ipcRenderer.on('speakers:progress', onProgress)
    return () => window.electron.ipcRenderer.removeListener('speakers:progress', onProgress)
  }, [])

  const load = async () => {
    setLoading(true)
    try { setPeople(await window.api.speakers.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const deletePerson = async (id: string) => {
    await window.api.speakers.delete(id)
    setPeople(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#07080f' }}>
      <div className="border-b px-8 pt-7 pb-5" style={{ borderColor: '#1c2030', background: '#0e1016' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Users size={20} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h1 className="font-semibold text-lg" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>People</h1>
              <p style={{ fontSize: '0.75rem', color: '#475569' }}>Voice database — recognized automatically in all recordings</p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
          >
            <Plus size={15} /> Add Person
          </button>
        </div>
      </div>

      {progress && (
        <div className="px-8 py-3 flex items-center gap-3" style={{ background: '#1e1b4b', borderBottom: '1px solid #312e81' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '0.8rem', color: '#c7d2fe' }}>{progress}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-7">
        {creating && (
          <CreatePersonForm
            onCreated={async (profile) => { setPeople(prev => [profile, ...prev]); setCreating(false) }}
            onCancel={() => setCreating(false)}
          />
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8" style={{ color: '#475569' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : people.length === 0 && !creating ? (
          <EmptyState onAdd={() => setCreating(true)} />
        ) : (
          <div className="space-y-3 max-w-2xl">
            {people.map(p => (
              <PersonCard key={p.id} person={p} onDelete={() => deletePerson(p.id)} onSampleAdded={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Create Form ───────────────────────────────────────────────────────────────

function CreatePersonForm({ onCreated, onCancel }: { onCreated: (p: SpeakerProfile) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const profile = await window.api.speakers.create(name.trim(), description.trim() || undefined)
      onCreated(profile)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4 max-w-2xl mb-5" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe' }}>New Person</div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name (e.g. Panos, John Smith)"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        style={{ background: '#141720', border: '1px solid #1c2030', color: '#e2e8f0' }}
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Optional note (e.g. CEO, teammate)"
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
        style={{ background: '#141720', border: '1px solid #1c2030', color: '#94a3b8' }}
      />

      {error && <p style={{ fontSize: '0.75rem', color: '#f87171' }}>{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#141720', color: '#64748b' }}>Cancel</button>
        <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#4f46e5', color: 'white' }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ── Person Card ───────────────────────────────────────────────────────────────

function PersonCard({ person, onDelete, onSampleAdded }: { person: SpeakerProfile; onDelete: () => void; onSampleAdded: () => void }) {
  const { meetings } = useMeetingStore()
  const [expanded, setExpanded] = useState(false)
  const [addingSource, setAddingSource] = useState<'meeting' | 'file' | null>(null)
  const [meetingId, setMeetingId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const meetingsWithRecording = meetings.filter((m: any) => m.durationSeconds && m.durationSeconds > 3)

  const lastSeen = person.lastSeenAt
    ? new Date(person.lastSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'

  const handleAddSample = async () => {
    setAddError(null)
    let audioPath: string | null = null

    if (addingSource === 'meeting') {
      if (!meetingId) { setAddError('Select a meeting'); return }
      audioPath = await window.api.audio.getRecordingPath(meetingId)
      if (!audioPath) { setAddError('No audio recording for this meeting'); return }
    } else {
      const files = fileRef.current?.files
      if (!files || files.length === 0) { setAddError('Select an audio file'); return }
      audioPath = (files[0] as any).path
    }

    setAdding(true)
    try {
      await window.api.speakers.registerSample(person.id, audioPath!, addingSource === 'meeting' ? meetingId : undefined)
      setAddingSource(null); setMeetingId('')
      onSampleAdded()
    } catch (e: any) { setAddError(e.message) }
    finally { setAdding(false) }
  }

  return (
    <div className="rounded-2xl transition-all" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '1rem' }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{person.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
            {person.description && <span style={{ color: '#64748b', marginRight: 8 }}>{person.description}</span>}
            {person.sampleCount} voice sample{person.sampleCount !== 1 ? 's' : ''} · Last seen: {lastSeen}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {person.sampleCount > 0 && (
            <span className="flex items-center gap-1" style={{ fontSize: '0.7rem', color: '#34d399' }}>
              <CheckCircle2 size={11} /> Active
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#2e3450' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#2e3450')}
          ><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: '#1c2030' }}>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 12, paddingTop: 12 }}>
            Add voice samples so this person is recognized in recordings.
            {person.sampleCount === 0 && ' At least one sample is needed.'}
            {person.sampleCount > 0 && ` ${person.sampleCount} sample${person.sampleCount !== 1 ? 's' : ''} → more = better accuracy.`}
          </div>

          <input ref={fileRef} type="file" accept=".wav,.mp3,.m4a,.ogg,.flac" className="hidden" />

          {!addingSource && (
            <div className="flex gap-2">
              <button
                onClick={() => setAddingSource('meeting')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                style={{ background: '#141720', border: '1px solid #1c2030', color: '#94a3b8' }}
              ><ScanFace size={13} /> From meeting</button>
              <button
                onClick={() => { setAddingSource('file'); fileRef.current?.click() }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                style={{ background: '#141720', border: '1px solid #1c2030', color: '#94a3b8' }}
              ><Upload size={13} /> Upload file</button>
            </div>
          )}

          {addingSource === 'meeting' && (
            <div className="space-y-3">
              <select
                value={meetingId}
                onChange={e => setMeetingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                style={{ background: '#141720', border: '1px solid #1c2030', color: '#e2e8f0' }}
              >
                <option value="">— Select meeting —</option>
                {meetingsWithRecording.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title} ({Math.round((m.durationSeconds || 0) / 60)}m)</option>
                ))}
              </select>
              {addError && <p style={{ fontSize: '0.72rem', color: '#f87171' }}>{addError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setAddingSource(null); setAddError(null) }} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#141720', color: '#64748b' }}>Cancel</button>
                <button onClick={handleAddSample} disabled={adding} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: '#4f46e5', color: 'white' }}>
                  {adding ? <><Loader2 size={11} className="animate-spin" /> Processing…</> : <><Mic size={11} /> Register Voice</>}
                </button>
              </div>
            </div>
          )}

          {addingSource === 'file' && (
            <div className="space-y-2">
              {addError && <p style={{ fontSize: '0.72rem', color: '#f87171' }}>{addError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setAddingSource(null); setAddError(null) }} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#141720', color: '#64748b' }}>Cancel</button>
                <button onClick={handleAddSample} disabled={adding} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ background: '#4f46e5', color: 'white' }}>
                  {adding ? <><Loader2 size={11} className="animate-spin" /> Processing…</> : <><Upload size={11} /> Register Sample</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="max-w-md space-y-4 pt-4">
      <div style={{ color: '#2e3450', fontSize: '0.85rem' }}>
        No people registered yet.
      </div>
      <div className="rounded-2xl p-6 space-y-3" style={{ background: '#0e1016', border: '1px solid #1c2030' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c7d2fe' }}>How it works</div>
        <ol className="space-y-2" style={{ fontSize: '0.78rem', color: '#64748b', paddingLeft: 16 }}>
          <li>Add a person by name</li>
          <li>Register their voice from any meeting recording or uploaded file</li>
          <li>The voice fingerprint is stored permanently</li>
          <li>In future recordings, they're identified automatically — even years later</li>
        </ol>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
        >
          <Plus size={14} /> Add First Person
        </button>
      </div>
    </div>
  )
}
