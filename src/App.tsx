import { useState, useEffect, useRef } from 'react'
import { Mic, Settings, FileText, Home, Calendar, Wand2 } from 'lucide-react'
import CaptureView from './components/CaptureView'
import MeetingList from './components/MeetingList'
import SettingsPanel from './components/SettingsPanel'
import EnhancedCalendarView from './components/EnhancedCalendarView'
import Dashboard from './components/Dashboard'
import VoiceStudio from './components/VoiceStudio'
import { useMeetingStore } from './stores/meetingStore'
import { useSettingsStore } from './stores/settingsStore'
import { useAudioStore } from './stores/audioStore'

type View = 'home' | 'capture' | 'meeting' | 'calendar' | 'voice' | 'settings'

const NAV = [
  { id: 'home'     as const, icon: Home,     label: 'Home'     },
  { id: 'capture'  as const, icon: Mic,      label: 'Record'   },
  { id: 'meeting'  as const, icon: FileText,  label: 'Meetings' },
  { id: 'calendar' as const, icon: Calendar, label: 'Calendar' },
  { id: 'voice'    as const, icon: Wand2,    label: 'Voice'    },
]

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  const prevViewRef = useRef<View>('home')
  const { currentMeeting, setMeetings, setCurrentMeeting } = useMeetingStore()
  const { theme, setTheme, setDefaultLanguage, setAutoDetect } = useSettingsStore()
  const { isCapturing } = useAudioStore()

  useEffect(() => {
    loadMeetings()
    loadPersistedSettings()
  }, [])

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

  useEffect(() => {
    const root = document.documentElement
    const apply = (t: string) => {
      if (t === 'light') { root.classList.remove('dark'); root.classList.add('light') }
      else if (t === 'dark') { root.classList.remove('light'); root.classList.add('dark') }
      else {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', dark); root.classList.toggle('light', !dark)
      }
    }
    apply(theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const h = () => apply('system')
      mq.addEventListener('change', h)
      return () => mq.removeEventListener('change', h)
    }
  }, [theme])

  useEffect(() => {
    if (currentMeeting && prevViewRef.current === 'calendar') setCurrentView('meeting')
  }, [currentMeeting])

  useEffect(() => { prevViewRef.current = currentView }, [currentView])

  useEffect(() => {
    const onShortcut = () => setCurrentView('capture')
    window.electron.ipcRenderer.on('shortcut:toggle-recording', onShortcut)
    return () => window.electron.ipcRenderer.removeListener('shortcut:toggle-recording', onShortcut)
  }, [])

  const loadMeetings = async () => {
    try { setMeetings(await window.api.meetings.getAll()) }
    catch (err) { console.error('Failed to load meetings:', err) }
  }

  return (
    <div className="flex h-screen text-slate-100" style={{ background: '#07080f' }}>

      {/* Sidebar — narrow rail with icon + label on active */}
      <nav
        className="flex flex-col items-center py-5 gap-1 border-r"
        style={{ width: 60, background: '#0e1016', borderColor: '#1c2030' }}
      >
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = currentView === id
          const isRec  = id === 'capture' && isCapturing

          return (
            <button
              key={id}
              onClick={() => {
                if (id === 'meeting') setCurrentMeeting(undefined)
                setCurrentView(id)
              }}
              title={id === 'capture' ? 'Record  ⌘⌥R' : label}
              className="relative flex flex-col items-center gap-0.5 w-11 py-2 rounded-lg transition-all"
              style={{
                color: active ? '#818cf8' : '#475569',
                background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
              }}
            >
              {/* Recording alive dot */}
              {isRec && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full rec-pulse"
                  style={{ background: '#f97316' }}
                />
              )}
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.04em', opacity: active ? 1 : 0.7 }}>
                {label}
              </span>
            </button>
          )
        })}

        <div className="flex-1" />

        {/* Settings */}
        <button
          onClick={() => setCurrentView('settings')}
          title="Settings"
          className="flex flex-col items-center gap-0.5 w-11 py-2 rounded-lg transition-all"
          style={{
            color: currentView === 'settings' ? '#818cf8' : '#475569',
            background: currentView === 'settings' ? 'rgba(99,102,241,0.1)' : 'transparent',
          }}
        >
          <Settings size={18} strokeWidth={currentView === 'settings' ? 2 : 1.5} />
          <span style={{ fontSize: '0.58rem', letterSpacing: '0.04em', opacity: 0.7 }}>Settings</span>
        </button>
      </nav>

      {/* Main */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'home'     && <Dashboard onStartRecording={() => setCurrentView('capture')} onOpenMeeting={() => setCurrentView('meeting')} />}
        {currentView === 'capture'  && <CaptureView onViewMeeting={() => setCurrentView('meeting')} />}
        {currentView === 'meeting'  && <MeetingList />}
        {currentView === 'calendar' && <EnhancedCalendarView />}
        {currentView === 'voice'    && <VoiceStudio />}
        {currentView === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

export default App
