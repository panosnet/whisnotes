import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Languages, AlertCircle, Loader2, Clock, ChevronRight } from 'lucide-react'
import { useAudioStore } from '../stores/audioStore'
import { useTranscriptStore } from '../stores/transcriptStore'
import { useMeetingStore } from '../stores/meetingStore'
import TranscriptDisplay from './TranscriptDisplay'
import AudioVisualizer from './AudioVisualizer'
import type { Language } from '../types'

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'cs', name: 'Czech (Čeština)' },
]

export default function CaptureView({ onViewMeeting }: { onViewMeeting?: () => void }) {
  const { isCapturing, devices, selectedDeviceId, volumeLevel, setCapturing, setDevices, setSelectedDevice, setVolumeLevel } = useAudioStore()
  const { segments, currentMeetingId, setCurrentMeeting, clearSegments, addSegment } = useTranscriptStore()
  const { addMeeting, removeMeeting, setCurrentMeeting: setCurrentMeetingStore } = useMeetingStore()

  const [language, setLanguage] = useState<Language>('auto')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [justStoppedMeetingId, setJustStoppedMeetingId] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartRef = useRef<number>(0)
  const lastMeetingRef = useRef<any>(null)
  const isCapturingRef = useRef(isCapturing)
  // Refs for values used in handleStopCapture — prevents stale closures via global shortcut
  const currentMeetingIdRef = useRef(currentMeetingId)
  const elapsedSecondsRef = useRef(elapsedSeconds)

  // Stable refs so removeListener always matches the original function object,
  // even across React StrictMode's double-mount/unmount cycle.
  const handleVolumeRef = useRef((_: any, level: number) => setVolumeLevel(level))
  const handleSegmentRef = useRef((_: any, segment: any) => {
    addSegment(segment)
    setIsProcessing(false)
  })
  const handleErrorRef = useRef((_: any, data: { message: string }) => {
    setIsProcessing(false)
    setError(`Transcription error: ${data.message}`)
  })

  // Keep refs in sync so shortcut closure always has fresh values
  useEffect(() => { isCapturingRef.current = isCapturing }, [isCapturing])
  useEffect(() => { currentMeetingIdRef.current = currentMeetingId }, [currentMeetingId])
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds }, [elapsedSeconds])

  useEffect(() => {
    loadDevices()

    const onVolume  = handleVolumeRef.current
    const onSegment = handleSegmentRef.current
    const onError   = handleErrorRef.current
    const onShortcut = () => {
      // Read ref — not the stale closure value
      if (isCapturingRef.current) handleStopCapture()
      else handleStartCapture()
    }

    window.electron.ipcRenderer.on('audio:volume',           onVolume)
    window.electron.ipcRenderer.on('transcript:segment',     onSegment)
    window.electron.ipcRenderer.on('transcript:error',       onError)
    window.electron.ipcRenderer.on('shortcut:toggle-recording', onShortcut)

    return () => {
      window.electron.ipcRenderer.removeListener('audio:volume',              onVolume)
      window.electron.ipcRenderer.removeListener('transcript:segment',        onSegment)
      window.electron.ipcRenderer.removeListener('transcript:error',          onError)
      window.electron.ipcRenderer.removeListener('shortcut:toggle-recording', onShortcut)
      if (timerRef.current) clearInterval(timerRef.current)
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
    }
  }, [])

  const loadDevices = async () => {
    try {
      const deviceList = await window.api.audio.listDevices()
      setDevices(deviceList)
      if (deviceList.length > 0 && !selectedDeviceId) {
        const defaultDevice = deviceList.find((d: any) => d.isDefault) || deviceList[0]
        setSelectedDevice(defaultDevice.id)
      }
    } catch (err: any) {
      setError(`Could not load audio devices: ${err.message}`)
    }
  }

  const handleStartCapture = async () => {
    if (!selectedDeviceId) {
      setError('Please select an audio device')
      return
    }

    setError(null)

    try {
      const title = meetingTitle || `Meeting ${new Date().toLocaleString()}`
      const meeting = await window.api.meetings.create(title, 'manual', language)

      addMeeting(meeting)
      lastMeetingRef.current = meeting
      setCurrentMeeting(meeting.id)
      setJustStoppedMeetingId(null)
      clearSegments()

      sessionStartRef.current = Date.now()
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000))
      }, 1000)

      // Pass language so Whisper transcribes in the right language
      await window.api.audio.startCapture(selectedDeviceId, meeting.id, language)
      setCapturing(true)
    } catch (err: any) {
      console.error('Failed to start capture:', err)
      // Clean up the orphaned meeting record
      if (lastMeetingRef.current) {
        await window.api.meetings.delete(lastMeetingRef.current.id).catch(() => {})
        removeMeeting(lastMeetingRef.current.id)
        lastMeetingRef.current = null
      }
      const msg = err.message || 'Unknown error'
      if (msg.includes('sox') || msg.includes('SoX')) {
        setError('SoX audio tool not found. Install it with: brew install sox')
      } else if (msg.includes('python') || msg.includes('whisper')) {
        setError('Python/Whisper not found. Run: source venv/bin/activate && pip install openai-whisper')
      } else if (msg.includes('Screen Recording') || msg.includes('permission')) {
        setError('Screen Recording permission needed. Go to System Settings → Privacy & Security → Screen Recording')
      } else {
        setError(`Failed to start recording: ${msg}`)
      }
      setCapturing(false)
    }
  }

  const handleStopCapture = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsProcessing(true)

    try {
      await window.api.audio.stopCapture()
      setCapturing(false)

      // Use refs so this works correctly from global shortcut (stale closure safe)
      const meetingId = currentMeetingIdRef.current
      const elapsed = elapsedSecondsRef.current
      if (meetingId) {
        await window.api.meetings.update(meetingId, {
          endTime: new Date(),
          durationSeconds: elapsed,
        })
        setJustStoppedMeetingId(meetingId)
      }
    } catch (err: any) {
      setError(`Error stopping recording: ${err.message}`)
      setIsProcessing(false)
    }

    // Clear processing state after 30s max — tracked so it's cancelled on unmount
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current)
    processingTimerRef.current = setTimeout(() => {
      processingTimerRef.current = null
      setIsProcessing(false)
    }, 30000)
  }

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-4">Record Meeting</h2>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-1">Recording failed</div>
              <div className="font-mono">{error}</div>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meeting Title */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Meeting Title</label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Optional - auto-generated if empty"
              disabled={isCapturing}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50"
            />
          </div>

          {/* Audio Device */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Audio Source</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isCapturing}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50"
            >
              {devices.length === 0 && <option value="">Loading devices...</option>}
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              <Languages className="inline mr-1" size={16} />
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              disabled={isCapturing}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center gap-4">
          {!isCapturing ? (
            <button
              onClick={handleStartCapture}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Mic size={20} />
              Start Recording
            </button>
          ) : (
            <button
              onClick={handleStopCapture}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2 animate-pulse"
            >
              <Square size={20} />
              Stop Recording
            </button>
          )}

          <AudioVisualizer level={volumeLevel} isActive={isCapturing} />

          {isCapturing && (
            <div className="ml-auto flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-red-400" />
                <span className="font-mono text-red-300">{formatTime(elapsedSeconds)}</span>
              </div>
              <span>{segments.length} segments</span>
            </div>
          )}

          {isProcessing && !isCapturing && (
            <div className="ml-auto flex items-center gap-2 text-sm text-blue-300">
              <Loader2 size={16} className="animate-spin" />
              Transcribing speech…
            </div>
          )}

          {!isCapturing && !isProcessing && justStoppedMeetingId && (
            <button
              onClick={() => {
                const m = lastMeetingRef.current
                if (m) {
                  setCurrentMeetingStore(m)
                  onViewMeeting?.() // navigate to meeting view
                }
              }}
              className="ml-auto flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              View Recording <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      <div className="flex-1 overflow-hidden">
        <TranscriptDisplay segments={segments} />
      </div>
    </div>
  )
}
