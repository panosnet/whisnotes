import { useEffect, useRef } from 'react'
import { Languages } from 'lucide-react'
import { useTranscriptStore } from '../stores/transcriptStore'
import type { TranscriptSegment } from '../types'

interface TranscriptDisplayProps {
  segments: TranscriptSegment[]
}

export default function TranscriptDisplay({ segments }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { showTranslation, toggleTranslation } = useTranscriptStore()

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Only auto-scroll if already near the bottom (don't hijack manual scroll)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [segments])

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h3 className="font-semibold text-lg">Live Transcript</h3>
        <button
          onClick={toggleTranslation}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
            showTranslation
              ? 'bg-primary-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Languages size={16} />
          {showTranslation ? 'Hide' : 'Show'} Translation
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {segments.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <p>No transcript yet. Start recording to see live transcription.</p>
          </div>
        ) : (
          segments.map((segment) => (
            <div
              key={segment.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <div className="flex items-start gap-3">
                {segment.speakerId != null && (
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                    ['bg-blue-500','bg-green-500','bg-orange-500','bg-purple-500','bg-pink-500'][Number(segment.speakerId) % 5]
                  } opacity-70`} />
                )}
                <span className="text-xs text-slate-500 font-mono mt-1 w-10 flex-shrink-0">
                  {formatTimestamp(segment.timestamp)}
                </span>
                <div className="flex-1">
                  {segment.speakerId != null && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full text-white font-medium mb-1 ${
                      ['bg-blue-500','bg-green-500','bg-orange-500','bg-purple-500','bg-pink-500'][Number(segment.speakerId) % 5]
                    }`}>
                      Speaker {Number(segment.speakerId) + 1}
                    </span>
                  )}
                  <p className="text-white leading-relaxed">{segment.text}</p>
                  {showTranslation && segment.translation && (
                    <p className="mt-2 text-slate-400 text-sm italic border-l-2 border-primary-600 pl-3">
                      {segment.translation}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-700 rounded">
                      {segment.language.toUpperCase()}
                    </span>
                    <span>Confidence: {(segment.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
