import { useState, useEffect } from 'react'
import {
  Key, Globe, Palette, Save, Cpu,
  CheckCircle2, AlertCircle, XCircle, Info,
  Download, RefreshCw, Bot, Mic, ChevronDown, ChevronRight, X
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

interface DownloadState {
  percent: number
  mbDone: number
  mbTotal: number
  done?: boolean
  error?: string
}

// ── Types ──────────────────────────────────────────────────────────────────
interface SystemInfo {
  platform: string; cpuCores: number; cpuModel: string
  totalRAM: number; hasGPU: boolean; gpuInfo?: string
  recommendedModel: string; canRunLarge: boolean; canRunMedium: boolean
}

interface WhisperModel {
  value: string; label: string; description: string
  size: string; params: string; speed: number; quality: number
  languages: string; bestFor: string[]; ramRequired: number
}

// ── Whisper Model Catalogue ────────────────────────────────────────────────
const WHISPER_MODELS: WhisperModel[] = [
  { value: 'tiny',      label: 'Tiny',       description: 'Fastest, basic quality',                   size: '75 MB',   params: '39M',    speed: 10, quality: 6,  languages: '99+', bestFor: ['Quick notes', 'Low-end hardware', 'Real-time'], ramRequired: 2 },
  { value: 'tiny.en',   label: 'Tiny EN',    description: 'Fastest, English-only, better than tiny',  size: '75 MB',   params: '39M',    speed: 10, quality: 7,  languages: 'EN',  bestFor: ['English-only', 'Real-time'], ramRequired: 2 },
  { value: 'base',      label: 'Base',       description: 'Good balance of speed and quality',         size: '142 MB',  params: '74M',    speed: 9,  quality: 7,  languages: '99+', bestFor: ['International meetings', 'Most laptops'], ramRequired: 3 },
  { value: 'base.en',   label: 'Base EN',    description: 'Fast, accurate for English',               size: '142 MB',  params: '74M',    speed: 9,  quality: 8,  languages: 'EN',  bestFor: ['English meetings', 'Fast processing'], ramRequired: 3 },
  { value: 'small',     label: 'Small ⭐',   description: 'Recommended — great quality, reasonable speed', size: '466 MB',  params: '244M',   speed: 7,  quality: 8,  languages: '99+', bestFor: ['General use', 'Professional meetings', 'Multiple languages'], ramRequired: 4 },
  { value: 'small.en',  label: 'Small EN',   description: 'Excellent English quality',                size: '466 MB',  params: '244M',   speed: 7,  quality: 9,  languages: 'EN',  bestFor: ['English meetings', 'High accuracy'], ramRequired: 4 },
  { value: 'medium',    label: 'Medium',     description: 'High quality, handles accents well',       size: '1.5 GB',  params: '769M',   speed: 5,  quality: 9,  languages: '99+', bestFor: ['Professional', 'Complex vocabulary', 'Accents'], ramRequired: 6 },
  { value: 'medium.en', label: 'Medium EN',  description: 'Best English accuracy, technical terms',   size: '1.5 GB',  params: '769M',   speed: 5,  quality: 9,  languages: 'EN',  bestFor: ['Technical meetings', 'Legal/medical'], ramRequired: 6 },
  { value: 'large',     label: 'Large',      description: 'Highest quality, very slow',               size: '2.9 GB',  params: '1550M',  speed: 3,  quality: 10, languages: '99+', bestFor: ['Maximum accuracy', 'Difficult audio'], ramRequired: 8 },
  { value: 'large-v2',  label: 'Large V2',   description: 'Improved large, better hallucination handling', size: '2.9 GB',  params: '1550M',  speed: 3,  quality: 10, languages: '99+', bestFor: ['Professional', 'Best quality'], ramRequired: 8 },
  { value: 'large-v3',  label: 'Large V3 🆕', description: 'Latest & most accurate model',            size: '2.9 GB',  params: '1550M',  speed: 3,  quality: 10, languages: '99+', bestFor: ['Latest quality', 'Production use'], ramRequired: 8 },
]

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 font-semibold text-lg">
          <Icon size={20} className="text-primary-400" />
          {title}
        </div>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-5 border-t border-slate-800 pt-5">{children}</div>}
    </div>
  )
}

// ── Bar ───────────────────────────────────────────────────────────────────
function Bar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`flex-1 h-2 rounded-sm ${i < value ? color : 'bg-slate-700'}`} />
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const {
    openaiApiKey, anthropicApiKey, defaultLanguage, autoDetectLanguage, theme,
    setOpenAIKey, setAnthropicKey, setDefaultLanguage, setAutoDetect, setTheme,
  } = useSettingsStore()

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [downloadedModels, setDownloadedModels] = useState<string[]>([])
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({})
  const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; models: string[] } | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)

  // Whisper settings
  const [whisperMode, setWhisperMode] = useState<'local' | 'api'>('local')
  const [whisperModel, setWhisperModel] = useState('small')

  // API Keys
  const [openaiKey, setOpenaiKeyLocal] = useState(openaiApiKey || '')
  const [anthropicKey, setAnthropicKeyLocal] = useState(anthropicApiKey || '')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [showOpenai, setShowOpenai] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)

  // AI provider for analysis (summaries, etc.)
  const [analysisProvider, setAnalysisProvider] = useState<'none' | 'anthropic' | 'openai' | 'ollama'>('none')
  const [ollamaModel, setOllamaModel] = useState('')

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadAll()

    // Listen for download progress events from main process
    const onProgress = (_: any, data: { model: string; percent: number; mbDone: number; mbTotal: number }) => {
      setDownloads(prev => ({ ...prev, [data.model]: { percent: data.percent, mbDone: data.mbDone, mbTotal: data.mbTotal } }))
    }
    const onDone = (_: any, data: { model: string }) => {
      setDownloads(prev => ({ ...prev, [data.model]: { ...prev[data.model], percent: 100, done: true } }))
      setDownloadedModels(prev => [...new Set([...prev, data.model])])
    }
    const onError = (_: any, data: { model: string; error: string }) => {
      setDownloads(prev => ({ ...prev, [data.model]: { ...prev[data.model], error: data.error } }))
    }

    window.electron?.ipcRenderer?.on?.('models:download-progress', onProgress)
    window.electron?.ipcRenderer?.on?.('models:download-done', onDone)
    window.electron?.ipcRenderer?.on?.('models:download-error', onError)

    return () => {
      window.electron?.ipcRenderer?.removeListener?.('models:download-progress', onProgress)
      window.electron?.ipcRenderer?.removeListener?.('models:download-done', onDone)
      window.electron?.ipcRenderer?.removeListener?.('models:download-error', onError)
    }
  }, [])

  const loadAll = async () => {
    // Load settings
    const mode = await window.api.settings.get('whisperMode') as string
    const model = await window.api.settings.get('whisperModelSize') as string
    const provider = await window.api.settings.get('analysisProvider') as string
    const oUrl = await window.api.settings.get('ollamaUrl') as string
    const oModel = await window.api.settings.get('ollamaModel') as string
    // Load API keys from backend (not just Zustand store which starts empty)
    const oaiKey = await window.api.settings.get('openaiApiKey') as string
    const antKey = await window.api.settings.get('anthropicApiKey') as string
    if (mode) setWhisperMode(mode as any)
    if (model) setWhisperModel(model)
    if (provider) setAnalysisProvider(provider as any)
    if (oUrl) setOllamaUrl(oUrl)
    if (oModel) setOllamaModel(oModel)
    if (oaiKey) setOpenaiKeyLocal(oaiKey)
    if (antKey) setAnthropicKeyLocal(antKey)

    // System info
    try {
      const info = await window.api.invoke('get-system-info')
      setSystemInfo(info)
    } catch {}

    // Downloaded Whisper models
    try {
      const downloaded = await window.api.invoke('models:get-whisper-downloaded')
      setDownloadedModels(downloaded)
    } catch {}
  }

  const startDownload = async (modelName: string) => {
    setDownloads(prev => ({ ...prev, [modelName]: { percent: 0, mbDone: 0, mbTotal: 0 } }))
    try {
      await window.api.invoke('models:download-whisper', modelName)
    } catch (e: any) {
      setDownloads(prev => ({ ...prev, [modelName]: { ...prev[modelName], error: e.message } }))
    }
  }

  const cancelDownload = async (modelName: string) => {
    await window.api.invoke('models:cancel-download', modelName)
    setDownloads(prev => {
      const next = { ...prev }
      delete next[modelName]
      return next
    })
  }

  const checkOllama = async () => {
    setCheckingOllama(true)
    try {
      const status = await window.api.invoke('models:check-ollama')
      setOllamaStatus(status)
      if (status.running && status.models.length > 0 && !ollamaModel) {
        // Auto-select best model for this hardware
        const best = pickBestOllamaModel(status.models, systemInfo?.totalRAM ?? 8)
        setOllamaModel(best)
      }
    } catch {
      setOllamaStatus({ running: false, models: [] })
    }
    setCheckingOllama(false)
  }

  // Recommend the largest model that fits in RAM
  function pickBestOllamaModel(models: string[], ramGB: number): string {
    // Score models by RAM tier: 7b needs ~5GB, 13b ~9GB, 34b ~22GB, 70b ~45GB
    const score = (name: string) => {
      const n = name.toLowerCase()
      if (n.includes('70b') || n.includes('65b')) return ramGB >= 48 ? 4 : -1
      if (n.includes('34b') || n.includes('33b')) return ramGB >= 24 ? 3 : -1
      if (n.includes('13b') || n.includes('14b')) return ramGB >= 10 ? 2 : -1
      if (n.includes('7b') || n.includes('8b') || n.includes('mistral')) return ramGB >= 6 ? 1 : -1
      if (n.includes('3b') || n.includes('phi') || n.includes('tiny')) return 0
      return 0 // unknown size — always safe
    }
    const ranked = [...models].sort((a, b) => score(b) - score(a))
    return ranked[0] || models[0]
  }

  // RAM requirements for common Ollama model sizes
  const OLLAMA_MODEL_INFO: Record<string, { ram: number; quality: string; desc: string }> = {
    '3b':        { ram: 3,  quality: 'Basic',     desc: 'Fast, limited reasoning' },
    'phi':       { ram: 3,  quality: 'Basic',     desc: 'Compact Microsoft model' },
    'phi3':      { ram: 4,  quality: 'Good',      desc: 'Efficient for its size' },
    'gemma':     { ram: 5,  quality: 'Good',      desc: 'Google Gemma 7B' },
    'llama3':    { ram: 6,  quality: 'Good',      desc: 'Meta Llama 3 8B — recommended' },
    'mistral':   { ram: 6,  quality: 'Good',      desc: 'Fast, strong reasoning' },
    'neural-chat': { ram: 6, quality: 'Good',    desc: 'Intel optimised chat' },
    '7b':        { ram: 6,  quality: 'Good',      desc: 'Good balance of speed/quality' },
    '8b':        { ram: 6,  quality: 'Good',      desc: 'Good balance of speed/quality' },
    '13b':       { ram: 10, quality: 'Great',     desc: 'Strong reasoning' },
    '14b':       { ram: 10, quality: 'Great',     desc: 'Strong reasoning' },
    'llama3.1':  { ram: 10, quality: 'Great',     desc: 'Meta Llama 3.1 13B' },
    '33b':       { ram: 22, quality: 'Excellent', desc: 'Near-GPT-4 quality' },
    '34b':       { ram: 22, quality: 'Excellent', desc: 'Near-GPT-4 quality' },
    '70b':       { ram: 48, quality: 'Best',      desc: 'GPT-4 level locally' },
    '65b':       { ram: 44, quality: 'Best',      desc: 'GPT-4 level locally' },
  }

  function getModelInfo(modelName: string) {
    const lower = modelName.toLowerCase()
    for (const [key, info] of Object.entries(OLLAMA_MODEL_INFO)) {
      if (lower.includes(key)) return info
    }
    return null
  }

  // Popular Ollama models to suggest when none are installed, filtered by available RAM
  function getSuggestedOllamaModels(ramGB: number): { name: string; desc: string; ram: number; fits: boolean }[] {
    const all = [
      { name: 'phi3',       desc: '3.8B — fast, efficient',          ram: 4  },
      { name: 'llama3',     desc: '8B — best balance (recommended)', ram: 6  },
      { name: 'mistral',    desc: '7B — strong reasoning',           ram: 6  },
      { name: 'gemma2',     desc: '9B — Google model',               ram: 7  },
      { name: 'llama3.1',   desc: '13B — better reasoning',          ram: 10 },
      { name: 'llama3:70b', desc: '70B — near GPT-4 quality',        ram: 48 },
    ]
    return all
      .filter(m => ramGB >= m.ram * 0.7) // show tight-fit models too
      .slice(0, 4)
      .map(m => ({ ...m, fits: ramGB >= m.ram }))
  }

  function modelFitsRam(modelName: string, ramGB: number): 'great' | 'ok' | 'tight' | 'unknown' {
    const info = getModelInfo(modelName)
    if (!info) return 'unknown'
    if (ramGB >= info.ram * 1.5) return 'great'
    if (ramGB >= info.ram) return 'ok'
    return 'tight'
  }

  const handleSave = async () => {
    if (openaiKey !== openaiApiKey) { await window.api.settings.set('openaiApiKey', openaiKey); setOpenAIKey(openaiKey) }
    if (anthropicKey !== anthropicApiKey) { await window.api.settings.set('anthropicApiKey', anthropicKey); setAnthropicKey(anthropicKey) }
    await window.api.settings.set('defaultLanguage', defaultLanguage)
    await window.api.settings.set('autoDetectLanguage', autoDetectLanguage)
    await window.api.settings.set('theme', theme)
    await window.api.settings.set('whisperMode', whisperMode)
    await window.api.settings.set('whisperModelSize', whisperModel)
    await window.api.settings.set('analysisProvider', analysisProvider)
    await window.api.settings.set('ollamaUrl', ollamaUrl)
    await window.api.settings.set('ollamaModel', ollamaModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectedModel = WHISPER_MODELS.find(m => m.value === whisperModel)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-slate-400 text-sm">Configure transcription, AI providers, and preferences</p>
        </div>

        {/* ── System Info ─────────────────────────────────────────────── */}
        {systemInfo && (
          <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/40 rounded-xl p-5">
            <div className="flex items-center gap-2 text-blue-300 font-semibold mb-3">
              <Cpu size={18} /> Your System
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-slate-400">CPU Cores</div><div className="text-white font-semibold">{systemInfo.cpuCores}</div></div>
              <div><div className="text-slate-400">RAM</div><div className="text-white font-semibold">{systemInfo.totalRAM} GB</div></div>
              <div><div className="text-slate-400">Platform</div><div className="text-white font-semibold capitalize">{systemInfo.platform}</div></div>
              <div>
                <div className="text-slate-400">Recommended</div>
                <div className="text-green-400 font-semibold">
                  {WHISPER_MODELS.find(m => m.value === systemInfo.recommendedModel)?.label ?? systemInfo.recommendedModel}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Transcription / Whisper ──────────────────────────────────── */}
        <Section title="Transcription (Whisper)" icon={Mic}>

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setWhisperMode('local')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${whisperMode === 'local' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              🆓 Local (FREE, Private, Offline)
            </button>
            <button
              onClick={() => setWhisperMode('api')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${whisperMode === 'api' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              ☁️ OpenAI API ($0.006/min)
            </button>
          </div>

          {whisperMode === 'local' && (
            <>
              {/* Model picker */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Whisper Model</label>
                <select
                  value={whisperModel}
                  onChange={e => setWhisperModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm"
                >
                  {WHISPER_MODELS.map(m => {
                    const downloaded = downloadedModels.includes(m.value)
                    const canRun = !systemInfo || systemInfo.totalRAM >= m.ramRequired
                    const isRec = systemInfo?.recommendedModel === m.value
                    return (
                      <option key={m.value} value={m.value} disabled={!canRun}>
                        {downloaded ? '✅' : '⬇️'} {m.label} — {m.size}
                        {isRec ? ' ⭐ RECOMMENDED' : ''}
                        {!canRun ? ' ⚠️ NEEDS MORE RAM' : ''}
                      </option>
                    )
                  })}
                </select>
                <div className="flex items-start gap-2 mt-2 text-xs text-slate-500">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  ✅ = already downloaded on your machine · ⬇️ = will download on first use
                </div>
              </div>

              {/* All models download manager */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-300">All Models</div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {WHISPER_MODELS.map(m => {
                    const downloaded = downloadedModels.includes(m.value)
                    const dl = downloads[m.value]
                    const isDownloading = dl && !dl.done && !dl.error
                    const canRun = !systemInfo || systemInfo.totalRAM >= m.ramRequired

                    return (
                      <div
                        key={m.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          whisperModel === m.value
                            ? 'border-primary-500 bg-primary-900/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                        onClick={() => !isDownloading && setWhisperModel(m.value)}
                      >
                        {/* Status icon */}
                        <div className="w-5 flex-shrink-0">
                          {downloaded || dl?.done
                            ? <CheckCircle2 size={18} className="text-green-400" />
                            : isDownloading
                            ? <RefreshCw size={18} className="text-blue-400 animate-spin" />
                            : <Download size={18} className={canRun ? 'text-slate-500' : 'text-slate-700'} />
                          }
                        </div>

                        {/* Model info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-white">{m.label}</span>
                            <span className="text-xs text-slate-500">{m.size}</span>
                            {systemInfo?.recommendedModel === m.value && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">⭐ Recommended</span>
                            )}
                            {!canRun && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded">Needs {m.ramRequired}GB RAM</span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {isDownloading && (
                            <div className="mt-1.5">
                              <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Downloading… {dl.percent}%</span>
                                <span>{dl.mbDone.toFixed(0)} / {dl.mbTotal < 0 ? '…' : dl.mbTotal.toFixed(0)} MB</span>
                              </div>
                              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${dl.percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {dl?.done && !downloaded && (
                            <div className="text-xs text-green-400 mt-1">Download complete!</div>
                          )}

                          {dl?.error && (
                            <div className="text-xs text-red-400 mt-1">Error: {dl.error}</div>
                          )}
                        </div>

                        {/* Action button */}
                        <div className="flex-shrink-0">
                          {isDownloading ? (
                            <button
                              onClick={e => { e.stopPropagation(); cancelDownload(m.value) }}
                              className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Cancel download"
                            >
                              <X size={14} />
                            </button>
                          ) : (!downloaded && !dl?.done) ? (
                            <button
                              onClick={e => { e.stopPropagation(); startDownload(m.value) }}
                              disabled={!canRun}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              title={canRun ? `Download ${m.label}` : `Needs ${m.ramRequired}GB RAM`}
                            >
                              <Download size={12} /> Download
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Selected model card */}
              {selectedModel && (
                <div className="bg-slate-800/60 rounded-xl p-4 space-y-4 border border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {selectedModel.label}
                        {downloadedModels.includes(selectedModel.value) && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Downloaded ✅</span>
                        )}
                        {!downloadedModels.includes(selectedModel.value) && !downloads[selectedModel.value]?.done && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                            Not downloaded — click Download above
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{selectedModel.description}</p>
                    </div>
                    {systemInfo?.recommendedModel === selectedModel.value && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full whitespace-nowrap">⭐ Best for you</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1.5">Speed</div>
                      <Bar value={selectedModel.speed} color="bg-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1.5">Quality</div>
                      <Bar value={selectedModel.quality} color="bg-green-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><div className="text-slate-400">Size</div><div className="text-white font-medium">{selectedModel.size}</div></div>
                    <div><div className="text-slate-400">Parameters</div><div className="text-white font-medium">{selectedModel.params}</div></div>
                    <div><div className="text-slate-400">RAM Needed</div><div className="text-white font-medium">{selectedModel.ramRequired} GB</div></div>
                    <div><div className="text-slate-400">Languages</div><div className="text-white font-medium">{selectedModel.languages}</div></div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedModel.bestFor.map(u => (
                      <span key={u} className="px-2 py-0.5 bg-primary-500/15 text-primary-300 text-xs rounded-full">{u}</span>
                    ))}
                  </div>

                  {systemInfo && (
                    <div className="pt-3 border-t border-slate-700">
                      {systemInfo.totalRAM >= selectedModel.ramRequired * 1.5 ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle2 size={15} /> Excellent performance on your system</div>
                      ) : systemInfo.totalRAM >= selectedModel.ramRequired ? (
                        <div className="flex items-center gap-2 text-yellow-400 text-sm"><AlertCircle size={15} /> Good — may be slower on long audio</div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400 text-sm"><XCircle size={15} /> Not enough RAM — choose a smaller model</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {whisperMode === 'api' && (
            <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-lg text-sm text-amber-300">
              Requires OpenAI API key. Cost: ~$0.006/minute ($0.36/hour). Fastest option, needs internet.
            </div>
          )}
        </Section>

        {/* ── AI Providers ─────────────────────────────────────────────── */}
        <Section title="AI Providers — Analysis & Summaries" icon={Bot} defaultOpen={true}>

          <p className="text-sm text-slate-400">
            Used for meeting summaries, action items, and smart analysis after transcription.
            Transcription itself is always done by Whisper above.
          </p>

          {/* Provider selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Analysis Provider</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { id: 'none',      label: 'None',        desc: 'No AI analysis' },
                { id: 'anthropic', label: 'Claude',      desc: 'Best quality' },
                { id: 'openai',    label: 'GPT-4',       desc: 'Great quality' },
                { id: 'ollama',    label: 'Ollama',      desc: '100% Local' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setAnalysisProvider(p.id)
                    // Auto-detect when switching to Ollama
                    if (p.id === 'ollama' && !ollamaStatus) checkOllama()
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    analysisProvider === p.id
                      ? 'border-primary-500 bg-primary-900/30 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-sm">{p.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ollama section */}
          {analysisProvider === 'ollama' && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              {/* Header + refresh */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Ollama Configuration</div>
                <button
                  onClick={checkOllama}
                  disabled={checkingOllama}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={checkingOllama ? 'animate-spin' : ''} />
                  {checkingOllama ? 'Detecting…' : 'Refresh'}
                </button>
              </div>

              {/* Status */}
              {checkingOllama ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <RefreshCw size={14} className="animate-spin" /> Detecting Ollama and models…
                </div>
              ) : ollamaStatus ? (
                <div className={`flex items-center gap-2 text-sm ${ollamaStatus.running ? 'text-green-400' : 'text-amber-400'}`}>
                  {ollamaStatus.running
                    ? <><CheckCircle2 size={14} /> Ollama running — {ollamaStatus.models.length} model{ollamaStatus.models.length !== 1 ? 's' : ''} installed</>
                    : <><AlertCircle size={14} /> Ollama not detected — <a className="underline cursor-pointer" onClick={() => window.open?.('https://ollama.ai')}>install from ollama.ai</a></>
                  }
                </div>
              ) : null}

              {/* URL */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Server URL</label>
                <input
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  onBlur={checkOllama}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="http://localhost:11434"
                />
              </div>

              {/* Model picker — hardware-aware */}
              {ollamaStatus?.running && ollamaStatus.models.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400">Installed Models</label>
                    {systemInfo && <span className="text-xs text-slate-500">Your RAM: {systemInfo.totalRAM} GB</span>}
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {ollamaStatus.models.map(m => {
                      const info = getModelInfo(m)
                      const fit = modelFitsRam(m, systemInfo?.totalRAM ?? 8)
                      const isSelected = ollamaModel === m
                      const isBest = pickBestOllamaModel(ollamaStatus.models, systemInfo?.totalRAM ?? 8) === m
                      return (
                        <button
                          key={m}
                          onClick={() => setOllamaModel(m)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-900/30'
                              : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-white">{m}</span>
                              {isBest && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">⭐ Best for you</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {info && <span className="text-slate-500">{info.ram}+ GB RAM</span>}
                              {fit === 'great' && <span className="text-green-400">✓ Fits great</span>}
                              {fit === 'ok'    && <span className="text-yellow-400">⚡ Fits OK</span>}
                              {fit === 'tight' && <span className="text-red-400">⚠ May be slow</span>}
                            </div>
                          </div>
                          {info && <div className="text-xs text-slate-500 mt-0.5">{info.desc} · Quality: {info.quality}</div>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Manual model name input */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Model name (type manually if not detected)</label>
                    <input
                      value={ollamaModel}
                      onChange={e => setOllamaModel(e.target.value)}
                      placeholder="e.g. llama3, mistral, phi3"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>

                  {/* Suggested models based on hardware */}
                  {ollamaStatus?.running && (
                    <div>
                      <div className="text-xs text-slate-400 mb-2">
                        Suggested models for your hardware ({systemInfo?.totalRAM ?? '?'} GB RAM):
                      </div>
                      <div className="space-y-1">
                        {getSuggestedOllamaModels(systemInfo?.totalRAM ?? 8).map(s => (
                          <div key={s.name} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                            <div>
                              <code className="text-xs text-primary-300">{s.name}</code>
                              <span className="text-xs text-slate-400 ml-2">{s.desc}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${s.fits ? 'text-green-400' : 'text-yellow-400'}`}>{s.fits ? '✓ fits' : '⚡ tight'}</span>
                              <button
                                onClick={() => setOllamaModel(s.name)}
                                className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs transition-colors"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Pull a model: <code className="bg-slate-700 px-1 rounded">ollama pull llama3</code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                Ollama runs models 100% locally. Get it at{' '}
                <span className="text-primary-400 cursor-pointer" onClick={() => window.open?.('https://ollama.ai')}>ollama.ai</span>
              </div>
            </div>
          )}
        </Section>

        {/* ── API Keys ─────────────────────────────────────────────────── */}
        <Section title="API Keys" icon={Key} defaultOpen={false}>
          <p className="text-xs text-slate-500">Only needed if you use OpenAI API transcription or Claude/GPT-4 analysis.</p>

          {/* OpenAI */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              OpenAI API Key <span className="text-slate-500 font-normal">(Whisper API + GPT-4 analysis)</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiKey}
                onChange={e => setOpenaiKeyLocal(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <button onClick={() => setShowOpenai(v => !v)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                {showOpenai ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Anthropic */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Anthropic API Key <span className="text-slate-500 font-normal">(Claude analysis)</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showAnthropic ? 'text' : 'password'}
                value={anthropicKey}
                onChange={e => setAnthropicKeyLocal(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <button onClick={() => setShowAnthropic(v => !v)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                {showAnthropic ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </Section>

        {/* ── Language ─────────────────────────────────────────────────── */}
        <Section title="Language" icon={Globe} defaultOpen={false}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Default Language</label>
            <select
              value={defaultLanguage}
              onChange={e => setDefaultLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="el">Greek (Ελληνικά)</option>
              <option value="cs">Czech (Čeština)</option>
            </select>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoDetectLanguage}
              onChange={e => setAutoDetect(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-primary-600 focus:ring-offset-0"
            />
            <span className="text-sm">Auto-detect language per recording</span>
          </label>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <Section title="Appearance" icon={Palette} defaultOpen={false}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            saved ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> Save Settings</>}
        </button>

        <p className="text-xs text-slate-500 text-center">
          API keys are stored locally on your machine and never shared.
        </p>
      </div>
    </div>
  )
}
