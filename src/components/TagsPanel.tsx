import { useState, useEffect, useRef } from 'react'
import { Tag, Plus, X } from 'lucide-react'

interface TagItem {
  id: string
  name: string
  color?: string
}

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

function randomColor() {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export default function TagsPanel({ meetingId }: { meetingId: string }) {
  const [tags, setTags] = useState<TagItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<TagItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadTags() }, [meetingId])

  const loadTags = async () => {
    try {
      const meetingTags = await window.api.tags.getByMeeting(meetingId)
      setTags(meetingTags || [])
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  const handleInputChange = async (value: string) => {
    setInputValue(value)
    if (!value.trim()) { setSuggestions([]); return }
    try {
      const all = await window.api.tags.getAll()
      const existing = tags.map(t => t.id)
      setSuggestions(
        (all || []).filter((t: TagItem) =>
          t.name.toLowerCase().includes(value.toLowerCase()) &&
          !existing.includes(t.id)
        ).slice(0, 5)
      )
    } catch {}
  }

  const addTag = async (name: string, color?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue(''); setIsAdding(false); setSuggestions([])
      return
    }
    try {
      await window.api.tags.addToMeeting(meetingId, trimmed, color || randomColor())
      await loadTags()
    } catch (err) { console.error('Failed to add tag:', err) }
    setInputValue(''); setIsAdding(false); setSuggestions([])
  }

  const removeTag = async (tagId: string) => {
    try {
      await window.api.tags.removeFromMeeting(meetingId, tagId)
      setTags(prev => prev.filter(t => t.id !== tagId))
    } catch (err) { console.error('Failed to remove tag:', err) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag size={14} className="text-slate-500 flex-shrink-0" />

      {tags.map(tag => (
        <span
          key={tag.id}
          className="group flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all"
          style={{ backgroundColor: tag.color || '#6366f1' }}
        >
          {tag.name}
          <button
            onClick={() => removeTag(tag.id)}
            className="opacity-0 group-hover:opacity-100 hover:bg-black/20 rounded-full p-0.5 transition-all"
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {isAdding ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addTag(inputValue)
              if (e.key === 'Escape') { setIsAdding(false); setInputValue(''); setSuggestions([]) }
            }}
            onBlur={() => { setTimeout(() => { setIsAdding(false); setInputValue(''); setSuggestions([]) }, 200) }}
            placeholder="Add tag…"
            className="w-28 px-2.5 py-1 bg-slate-700 border border-slate-600 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-white placeholder-slate-400"
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-ink-800 border border-ink-600 rounded-lg shadow-xl z-10 overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onMouseDown={() => addTag(s.name, s.color)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#6366f1' }} />
                  <span className="text-sm text-white">{s.name}</span>
                </button>
              ))}
              {inputValue.trim() && !suggestions.some(s => s.name.toLowerCase() === inputValue.toLowerCase()) && (
                <button
                  onMouseDown={() => addTag(inputValue)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors text-left border-t border-ink-600"
                >
                  <Plus size={12} className="text-primary-400" />
                  <span className="text-sm text-primary-300">Create "{inputValue}"</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-slate-400 hover:text-white hover:bg-slate-700 border border-ink-600 hover:border-slate-600 transition-all"
        >
          <Plus size={11} /> Tag
        </button>
      )}
    </div>
  )
}
