import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Sparkles, Download, Languages, Clock, MapPin, Users, Star, Trash2, FileText, Pencil, Check, X as XIcon, Volume2 } from 'lucide-react'
import { useMeetingStore } from '../stores/meetingStore'
import NotesPanel from './NotesPanel'
import TagsPanel from './TagsPanel'
import type { Meeting, TranscriptSegment } from '../types'

interface MeetingDetailProps {
  meeting: Meeting
  onBack: () => void
}

export default function MeetingDetail({ meeting, onBack }: MeetingDetailProps) {
  const { currentAnalysis, setCurrentAnalysis, removeMeeting } = useMeetingStore()
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  // Derive from prop so re-renders with updated meeting reflect correctly
  const isStarred = meeting.isStarred || false
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [recordingPath, setRecordingPath] = useState<string | null>(null)
  const [currentAudioTime, setCurrentAudioTime] = useState(0)
  const [speakerNames, setSpeakerNames] = useState<Record<number, string>>({})
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    loadMeetingData()
  }, [meeting.id])

  const loadMeetingData = async () => {
    // Clear stale analysis from previous meeting
    setCurrentAnalysis(undefined)
    setSegments([])

    // Load transcript segments
    try {
      const segs = await window.api.transcription.getByMeeting(meeting.id)
      setSegments(segs || [])
    } catch (err) {
      console.error('Failed to load transcript segments:', err)
    }

    // Load analysis if exists
    try {
      const analysis = await window.api.analysis.getResults(meeting.id)
      if (analysis) setCurrentAnalysis(analysis)
    } catch (err) {
      console.error('Failed to load analysis:', err)
    }

    // Load recording path for audio playback
    try {
      const path = await window.api.audio.getRecordingPath(meeting.id)
      setRecordingPath(path || null)
    } catch { /* no recording */ }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const analysis = await window.api.analysis.analyze(meeting.id)
      setCurrentAnalysis(analysis)
    } catch (error: any) {
      console.error('Analysis failed:', error)
      setAnalyzeError(error.message || 'Analysis failed. Check your Anthropic API key in Settings.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleToggleStar = async () => {
    const newVal = !isStarred
    try {
      await window.api.meetings.update(meeting.id, { isStarred: newVal })
      // Sync to store — this updates meeting.isStarred so the derived value above updates
      useMeetingStore.getState().updateMeeting(meeting.id, { isStarred: newVal })
    } catch {
      // rollback is automatic since isStarred is derived from meeting prop
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.meetings.delete(meeting.id)
      removeMeeting(meeting.id)
      onBack()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete meeting')
      setShowDeleteConfirm(false)
    }
  }

  const fmtTs = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(Math.floor(secs % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  const handleCopy = async (format: 'text' | 'markdown') => {
    let content = ''
    if (format === 'markdown') {
      content = `# ${meeting.title}\n\n`
      content += `**Date:** ${new Date(meeting.startTime).toLocaleString()}\n\n`
      content += `## Transcript\n\n`
      content += segments.map(s => `\`[${fmtTs(s.timestamp)}]\` ${s.text}`).join('\n\n')
    } else {
      content = segments.map(s => `[${fmtTs(s.timestamp)}] ${s.text}`).join('\n')
    }
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Fallback for when clipboard API is unavailable
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  const handleToggleTranslation = async () => {
    const next = !showTranslation
    setShowTranslation(next)
    if (!next) return

    if (segments.some(s => !s.translation)) {
      setIsTranslating(true)
      setAnalyzeError(null)

      try {
        // Translate away from the source language; default to English
        const src = meeting.language
        const targetLang = (!src || src === 'auto' || src === 'en') ? 'el' : 'en'

        const updated = await Promise.all(
          segments.map(async s => {
            if (s.translation) return s
            try {
              const translation = await window.api.transcription.translate(s.text, targetLang)
              return { ...s, translation }
            } catch {
              return s
            }
          })
        )
        setSegments(updated)
      } catch (err: any) {
        setShowTranslation(false)
        setAnalyzeError(err.message || 'Translation failed. Configure an AI provider in Settings.')
      } finally {
        setIsTranslating(false)
      }
    }
  }

  const handleEditSegment = async (id: string, text: string) => {
    try {
      await window.api.transcription.updateText(id, text)
      setSegments(prev => prev.map(s => s.id === id ? { ...s, text } : s))
    } catch (err: any) {
      console.error('Failed to update segment:', err)
    }
  }

  const handleExport = async (format: 'json' | 'text' | 'pdf' | 'srt' | 'md') => {
    setExportError(null)
    try {
      let result: any
      if (format === 'json') result = await window.api.export.toJSON(meeting.id)
      else if (format === 'text') result = await window.api.export.toText(meeting.id)
      else if (format === 'srt') result = await window.api.invoke('export:srt', meeting.id)
      else if (format === 'md') result = await window.api.invoke('export:md', meeting.id)
      else result = await window.api.export.toPDF(meeting.id)

      if (result?.canceled) return
      if (!result?.success) throw new Error(result?.error || 'Export failed')
    } catch (error: any) {
      console.error('Export failed:', error)
      setExportError(error.message || 'Export failed')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#07080f]">
      {/* Header */}
      <div className="bg-ink-900 border-b border-ink-700 p-6">
        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-ink-900 border border-ink-600 rounded-xl p-6 max-w-sm mx-4 space-y-4">
              <h3 className="font-semibold text-lg">Delete this recording?</h3>
              <p className="text-slate-400 text-sm">This permanently deletes the meeting, transcript, and all notes.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-ink-800 hover:bg-slate-700 rounded-lg">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStar}
              className={`p-2 rounded-lg transition-colors ${isStarred ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-ink-800'}`}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star size={20} fill={isStarred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-ink-800 transition-colors"
              title="Delete recording"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
            <div className="space-y-1 text-slate-400">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatDate(meeting.startTime)}</span>
                {meeting.timezone && meeting.timezone !== 'UTC' && (
                  <span className="text-xs text-slate-500">({meeting.timezone})</span>
                )}
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{meeting.location}</span>
                </div>
              )}
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>{meeting.participants.length} participant(s)</span>
                </div>
              )}
            </div>
            {/* Tags */}
            <div className="mt-3">
              <TagsPanel meetingId={meeting.id} />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleToggleTranslation}
              disabled={isTranslating}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${showTranslation ? 'bg-primary-600 text-white' : 'bg-ink-800 hover:bg-slate-700'}`}
            >
              <Languages size={18} />
              {isTranslating ? 'Translating…' : 'Translation'}
            </button>

            <div className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                className="px-4 py-2 bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                Export
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-ink-800 border border-ink-600 rounded-lg shadow-lg z-10"
                  onMouseLeave={() => setExportOpen(false)}
                >
                  {([
                    { fmt: 'text', label: 'Text (.txt)' },
                    { fmt: 'md',   label: 'Markdown (.md)' },
                    { fmt: 'json', label: 'JSON (.json)' },
                    { fmt: 'srt',  label: 'Subtitles (.srt)' },
                    { fmt: 'pdf',  label: 'PDF (.pdf)' },
                  ] as const).map(({ fmt, label }) => (
                    <button
                      key={fmt}
                      onClick={() => { handleExport(fmt as any); setExportOpen(false) }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-700 text-sm first:rounded-t-lg last:rounded-b-lg"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={18} />
              {isAnalyzing ? 'Analyzing...' : currentAnalysis ? 'Re-analyze' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Error banners */}
        {analyzeError && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
            <span className="flex-1">{analyzeError}</span>
            <button onClick={() => setAnalyzeError(null)} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}
        {exportError && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
            <span className="flex-1">Export failed: {exportError}</span>
            <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}
        {deleteError && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
            <span className="flex-1">{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Meeting Metadata */}
          {meeting.notes && (
            <div className="bg-ink-900 border border-ink-700 rounded-lg p-4">
              <p className="text-slate-300">{meeting.notes}</p>
            </div>
          )}

          {/* Audio Player */}
          {recordingPath && (
            <div className="bg-ink-900 border border-ink-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium">
                <Volume2 size={18} className="text-primary-400" />
                Recording
              </div>
              <audio
                ref={audioRef}
                controls
                src={`file://${recordingPath}`}
                className="w-full"
                onTimeUpdate={() => setCurrentAudioTime(audioRef.current?.currentTime || 0)}
                style={{ accentColor: '#6366f1' }}
              />
            </div>
          )}

          {/* Notes Panel */}
          <NotesPanel meetingId={meeting.id} />

          {/* Analysis Results */}
          {currentAnalysis && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-primary-500" />
                  Summary
                </h2>
                <p className="text-slate-300 leading-relaxed">{currentAnalysis.summary}</p>
              </div>

              {/* Key Points */}
              <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-3">Key Points</h2>
                <ul className="space-y-2">
                  {currentAnalysis.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-primary-500 mt-1">•</span>
                      <span className="text-slate-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Items */}
              {currentAnalysis.actionItems.length > 0 && (
                <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-3">Action Items</h2>
                  <div className="space-y-2">
                    {currentAnalysis.actionItems.map((item, index) => (
                      <div
                        key={index}
                        className={`px-4 py-3 rounded-lg border ${getPriorityColor(item.priority)}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="flex-1">{item.text}</span>
                          <span className="text-xs uppercase font-medium ml-2">
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              {currentAnalysis.topics.length > 0 && (
                <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-3">Topics Discussed</h2>
                  <div className="flex flex-wrap gap-2">
                    {currentAnalysis.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-primary-500/20 text-primary-300 border border-primary-500/30 rounded-full text-sm"
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Transcript */}
          <div className="bg-ink-900 border border-ink-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Full Transcript</h2>
              {segments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{segments.length} segments</span>
                  <button
                    onClick={() => handleCopy('text')}
                    className="px-3 py-1.5 text-xs bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                    title="Copy transcript to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => handleCopy('markdown')}
                    className="px-3 py-1.5 text-xs bg-ink-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Copy as Markdown"
                  >
                    ⬇ Markdown
                  </button>
                </div>
              )}
            </div>
            {segments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No transcript segments available for this meeting.
              </p>
            ) : (
              <div className="space-y-2">
                {segments.map((segment) => {
                  // Highlight the segment closest to current audio time
                  const isActive = audioRef.current && recordingPath
                    ? segment.timestamp <= currentAudioTime && (
                        segments.findIndex(s => s.id === segment.id) === segments.length - 1 ||
                        segments[segments.findIndex(s => s.id === segment.id) + 1]?.timestamp > currentAudioTime
                      )
                    : false
                  return (
                    <SegmentRow
                      key={segment.id}
                      segment={segment}
                      showTranslation={showTranslation}
                      isActive={!!isActive}
                      speakerNames={speakerNames}
                      onEdit={(id, text) => handleEditSegment(id, text)}
                      onSeek={recordingPath && audioRef.current
                        ? (ts) => { if (audioRef.current) audioRef.current.currentTime = ts }
                        : undefined}
                      onRenameSpeaker={(speakerId, name) =>
                        setSpeakerNames(prev => ({ ...prev, [speakerId]: name }))
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const SPEAKER_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500',
  'bg-teal-500', 'bg-red-500', 'bg-yellow-500',
]

// ── Inline-editable segment row ───────────────────────────────────────────────
function SegmentRow({
  segment,
  showTranslation,
  isActive,
  speakerNames,
  onEdit,
  onSeek,
  onRenameSpeaker,
}: {
  segment: TranscriptSegment
  showTranslation: boolean
  isActive: boolean
  speakerNames: Record<number, string>
  onEdit: (id: string, text: string) => Promise<void>
  onSeek?: (timestamp: number) => void
  onRenameSpeaker?: (speakerId: number, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(segment.text)
  const [renamingSpk, setRenamingSpk] = useState(false)
  const [spkDraft, setSpkDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fmtTs = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(Math.floor(secs % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  const save = async () => {
    if (draft.trim() && draft !== segment.text) {
      await onEdit(segment.id, draft.trim())
    }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(segment.text)
    setEditing(false)
  }

  const speakerId = segment.speakerId != null ? Number(segment.speakerId) : null
  const speakerColor = speakerId != null ? SPEAKER_COLORS[speakerId % SPEAKER_COLORS.length] : null
  const speakerLabel = speakerId != null
    ? (speakerNames[speakerId] || `Speaker ${speakerId + 1}`)
    : null

  return (
    <div className={`group flex gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive ? 'ring-2 ring-primary-500 bg-primary-900/20' : 'hover:bg-ink-800/50'
    }`}>
      {/* Speaker indicator bar */}
      {speakerColor && (
        <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${speakerColor} opacity-70`} />
      )}

      {/* Timestamp — clickable to seek */}
      <span
        className={`flex-shrink-0 font-mono text-xs pt-1 w-12 ${
          onSeek ? 'text-primary-400 cursor-pointer hover:text-primary-300' : 'text-slate-500'
        }`}
        onClick={() => onSeek?.(segment.timestamp)}
        title={onSeek ? 'Seek to this moment' : undefined}
      >
        {fmtTs(segment.timestamp)}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {/* Speaker badge */}
        {speakerLabel && !editing && (
          <div className="flex items-center gap-1 mb-1">
            {renamingSpk ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={spkDraft}
                  onChange={e => setSpkDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onRenameSpeaker?.(speakerId!, spkDraft.trim() || `Speaker ${speakerId! + 1}`)
                      setRenamingSpk(false)
                    }
                    if (e.key === 'Escape') setRenamingSpk(false)
                  }}
                  onBlur={() => setRenamingSpk(false)}
                  className="text-xs px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-white w-28 focus:outline-none"
                  placeholder={speakerLabel}
                />
              </div>
            ) : (
              <button
                onClick={() => { setSpkDraft(speakerNames[speakerId!] || ''); setRenamingSpk(true) }}
                className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${speakerColor} hover:opacity-90 transition-opacity`}
                title="Click to rename speaker"
              >
                {speakerLabel}
              </button>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
              className="w-full bg-slate-700 border border-primary-500/50 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={Math.max(2, draft.split('\n').length)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={save} className="px-3 py-1 bg-primary-600 hover:bg-primary-700 rounded text-xs flex items-center gap-1">
                <Check size={12} /> Save
              </button>
              <button onClick={cancel} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs flex items-center gap-1">
                <XIcon size={12} /> Cancel
              </button>
              <span className="text-xs text-slate-500 self-center">Cmd+Enter to save</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-slate-300 text-sm leading-relaxed flex-1">{segment.text}</p>
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all flex-shrink-0"
              title="Edit segment"
            >
              <Pencil size={12} className="text-slate-400" />
            </button>
          </div>
        )}

        {showTranslation && segment.translation && !editing && (
          <p className="text-slate-500 text-xs italic mt-1">{segment.translation}</p>
        )}
      </div>
    </div>
  )
}
