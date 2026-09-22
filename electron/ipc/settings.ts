import { ipcMain } from 'electron'
import Store from 'electron-store'
import type { AppSettings } from '../types/index.js'

const store = new Store<AppSettings>({
  defaults: {
    defaultLanguage: 'auto',
    autoDetectLanguage: true,
    theme: 'system',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    whisperMode: 'local',
    whisperModelSize: 'small',
  },
})

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return store.get(key as keyof AppSettings)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    store.set(key as keyof AppSettings, value)
    return true
  })

  ipcMain.handle('settings:get-all', async () => {
    // Omit API keys from bulk response for security
    const { openaiApiKey, anthropicApiKey, ...safe } = store.store as any
    return safe
  })
}
