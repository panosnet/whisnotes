import { useState, useEffect, useRef } from 'react'
import { Mic, Settings, FileText, Home, Calendar } from 'lucide-react'
import CaptureView from './components/CaptureView'
import MeetingList from './components/MeetingList'
import SettingsPanel from './components/SettingsPanel'
import EnhancedCalendarView from './components/EnhancedCalendarView'
import Dashboard from './components/Dashboard'
import { useMeetingStore } from './stores/meetingStore'
import { useSettingsStore } from './stores/settingsStore'

type View = 'home' | 'capture' | 'meeting' | 'calendar' | 'settings'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  // Track previous view so calendar → meeting navigation only fires when meeting is opened FROM calendar
  const prevViewRef = useRef<View>('home')
  const { currentMeeting, setMeetings, setCurrentMeeting } = useMeetingStore()
  const { theme, setTheme, setDefaultLanguage, setAutoDetect } = useSettingsStore()

  useEffect(() => {
    loadMeetings()
    loadPersistedSettings()
  }, [])

  // Load persisted theme/language into Zustand store so they apply on every startup
  const loadPersistedSettings = async () => {
    try {
      const [savedTheme, savedLang, savedAutoDetect] = await Promise.all([
        window.api.settings.get('theme'),
        window.api.settings.get('defaultLanguage'),
        window.api.settings.get('autoDetectLanguage'),
      ])
      if (savedTheme) setTheme(savedTheme as any)
      if (savedLang) setDefaultLanguage(savedLang as string)
      if (savedAutoDetect !== undefined) setAutoDetect(savedAutoDetect as boolean)
    } catch (err) {
      console.error('Failed to load persisted settings:', err)
    }
  }

  // Apply theme to DOM + listen for OS theme changes
  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (t: string) => {
      if (t === 'light') {
        root.classList.remove('dark'); root.classList.add('light')
      } else if (t === 'dark') {
        root.classList.remove('light'); root.classList.add('dark')
      } else {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', dark)
        root.classList.toggle('light', !dark)
      }
    }
    applyTheme(theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // Navigate to meeting detail when a meeting is opened from the calendar.
  // Only fire when the user is currently on the calendar view — not on every meeting selection.
  useEffect(() => {
    if (currentMeeting && prevViewRef.current === 'calendar') {
      setCurrentView('meeting')
    }
  }, [currentMeeting])

  // Track view changes
  useEffect(() => {
    prevViewRef.current = currentView
  }, [currentView])

  // Navigate to capture view when global shortcut fires (CaptureView handles the actual toggle)
  useEffect(() => {
    const onShortcut = () => setCurrentView('capture')
    window.electron.ipcRenderer.on('shortcut:toggle-recording', onShortcut)
    return () => window.electron.ipcRenderer.removeListener('shortcut:toggle-recording', onShortcut)
  }, [])

  const loadMeetings = async () => {
    try {
      const allMeetings = await window.api.meetings.getAll()
      setMeetings(allMeetings)
    } catch (err) {
      console.error('Failed to load meetings:', err)
    }
  }

  const navBtn = (view: View, icon: React.ReactNode, title: string, onClick?: () => void) => (
    <button
      onClick={() => { onClick?.(); setCurrentView(view) }}
      className={`p-3 rounded-lg transition-colors ${
        currentView === view
          ? 'bg-primary-600 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
      title={title}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 space-y-4">
        {navBtn('home',     <Home size={24} />,     'Home')}
        {navBtn('capture',  <Mic size={24} />,      'Record ⌘⌥R')}
        {navBtn('meeting',  <FileText size={24} />, 'Meetings', () => setCurrentMeeting(undefined))}
        {navBtn('calendar', <Calendar size={24} />, 'Calendar')}
        <div className="flex-1" />
        {navBtn('settings', <Settings size={24} />, 'Settings')}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'home' && (
          <Dashboard
            onStartRecording={() => setCurrentView('capture')}
            onOpenMeeting={() => setCurrentView('meeting')}
          />
        )}

        {currentView === 'capture' && <CaptureView onViewMeeting={() => setCurrentView('meeting')} />}

        {currentView === 'meeting' && <MeetingList />}

        {currentView === 'calendar' && <EnhancedCalendarView />}

        {currentView === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

export default App
