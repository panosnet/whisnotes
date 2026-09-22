import { create } from 'zustand'

interface SettingsStore {
  openaiApiKey?: string
  anthropicApiKey?: string
  defaultLanguage: string
  autoDetectLanguage: boolean
  theme: 'light' | 'dark' | 'system'
  setOpenAIKey: (key: string) => void
  setAnthropicKey: (key: string) => void
  setDefaultLanguage: (lang: string) => void
  setAutoDetect: (auto: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  defaultLanguage: 'auto',
  autoDetectLanguage: true,
  theme: 'dark',

  setOpenAIKey: (key) => set({ openaiApiKey: key }),
  setAnthropicKey: (key) => set({ anthropicApiKey: key }),
  setDefaultLanguage: (lang) => set({ defaultLanguage: lang }),
  setAutoDetect: (auto) => set({ autoDetectLanguage: auto }),
  setTheme: (theme) => set({ theme }),
}))
