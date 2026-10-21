import { ipcMain, safeStorage } from 'electron'
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

// Keys that contain secrets — stored encrypted when possible
const SECRET_KEYS = new Set(['openaiApiKey', 'anthropicApiKey', 'elevenlabsApiKey'])

function encKey(k: string) { return `${k}_enc` }

function getSecret(key: string): string {
  const enc = store.get(encKey(key) as any) as string | undefined
  if (enc) {
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch {
      // Corrupted — fall through to plaintext fallback
    }
  }
  // Backward-compat: plain value
  return (store.get(key as keyof AppSettings) as string) ?? ''
}

function setSecret(key: string, value: string) {
  if (safeStorage.isEncryptionAvailable()) {
    store.set(encKey(key) as any, safeStorage.encryptString(value).toString('base64'))
    // Remove any leftover plaintext
    store.delete(key as keyof AppSettings)
  } else {
    store.set(key as keyof AppSettings, value as any)
  }
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    if (SECRET_KEYS.has(key)) return getSecret(key)
    return store.get(key as keyof AppSettings)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    if (SECRET_KEYS.has(key)) {
      setSecret(key, String(value ?? ''))
    } else {
      store.set(key as keyof AppSettings, value)
    }
    return true
  })

  ipcMain.handle('settings:get-all', async () => {
    // Omit API keys (including encrypted variants) from bulk response
    const raw = store.store as any
    const { openaiApiKey, anthropicApiKey, elevenlabsApiKey,
            openaiApiKey_enc, anthropicApiKey_enc, elevenlabsApiKey_enc, ...safe } = raw
    return safe
  })
}
