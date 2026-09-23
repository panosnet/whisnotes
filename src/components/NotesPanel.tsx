import { useState, useEffect } from 'react'
import { StickyNote, Pin, Trash2, Plus, Pencil, Check, X as XIcon } from 'lucide-react'

interface Note {
  id: string
  meetingId?: string
  segmentId?: string
  content: string
  type: 'general' | 'question' | 'action' | 'decision' | 'idea'
  color?: string
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

interface NotesPanelProps {
  meetingId: string
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', color: 'bg-slate-600' },
  { value: 'question', label: 'Question', color: 'bg-blue-600' },
  { value: 'action', label: 'Action', color: 'bg-green-600' },
  { value: 'decision', label: 'Decision', color: 'bg-purple-600' },
  { value: 'idea', label: 'Idea', color: 'bg-yellow-600' },
]

export default function NotesPanel({ meetingId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [newNoteType, setNewNoteType] = useState<Note['type']>('general')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    loadNotes()
  }, [meetingId])

  const loadNotes = async () => {
    try {
      const meetingNotes = await window.api.notes.getByMeeting(meetingId)
      setNotes(meetingNotes)
    } catch (err) {
      console.error('Failed to load notes:', err)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    const savedNote = newNote
    const savedType = newNoteType

    try {
      await window.api.notes.create({
        meetingId,
        content: savedNote,
        type: savedType,
        isPinned: false,
      })
      setNewNote('')
      setNewNoteType('general')
      setIsAdding(false)
      await loadNotes()
    } catch (err) {
      console.error('Failed to save note:', err)
      // Do not clear the form — user can try again
    }
  }

  const handleTogglePin = async (id: string) => {
    await window.api.notes.togglePin(id)
    await loadNotes()
  }

  const handleDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await window.api.notes.delete(id).catch(() => loadNotes())
  }

  const startEdit = (note: Note) => {
    setEditingId(note.id)
    setEditDraft(note.content)
  }

  const saveEdit = async (id: string) => {
    // Always close edit mode — if empty, just cancel without saving
    if (!editDraft.trim()) { setEditingId(null); return }
    try {
      await window.api.notes.update(id, editDraft.trim())
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editDraft.trim() } : n))
    } catch (err) { console.error('Failed to save note edit:', err) }
    setEditingId(null)
  }

  const getNoteTypeColor = (type: string) => {
    return NOTE_TYPES.find(t => t.value === type)?.color || 'bg-slate-600'
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <StickyNote size={20} className="text-yellow-500" />
          Notes
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-ink-800 border border-ink-600 rounded-lg">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }}
            placeholder="Write your note… (Cmd+Enter to save)"
            className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <select
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value as Note['type'])}
              className="px-3 py-1.5 bg-ink-900 border border-ink-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {NOTE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewNote('')
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedNotes.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No notes yet. Add your first note to remember important details.
          </p>
        ) : (
          sortedNotes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-ink-800 border border-ink-600 rounded-lg relative group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getNoteTypeColor(note.type)}`}>
                  {NOTE_TYPES.find(t => t.value === note.type)?.label}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(note)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleTogglePin(note.id)}
                    className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${note.isPinned ? 'text-yellow-500' : 'text-slate-400'}`}
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={14} />
                  </button>
                  <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(note.id) }}
                    className="w-full px-3 py-2 bg-ink-900 border border-primary-500/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(note.id)} className="px-2 py-1 bg-primary-500 rounded text-xs flex items-center gap-1"><Check size={11}/> Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-700 rounded text-xs flex items-center gap-1"><XIcon size={11}/> Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
