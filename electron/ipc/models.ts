import { ipcMain, BrowserWindow } from 'electron'
import { existsSync, readdirSync, mkdirSync, createWriteStream, unlinkSync, renameSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as https from 'https'
import * as http from 'http'

const execAsync = promisify(exec)

// Official OpenAI Whisper model URLs
const WHISPER_URLS: Record<string, string> = {
  'tiny':      'https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt',
  'tiny.en':   'https://openaipublic.azureedge.net/main/whisper/models/d3dd57d32accea0b295c96e26691aa14d8822fac7d9d27d5dc00b4ca2826dd03/tiny.en.pt',
  'base':      'https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt',
  'base.en':   'https://openaipublic.azureedge.net/main/whisper/models/25a8566e1d0c1e2231d1c762132cd20e0f96a85d16145c3a00adf5d1ac670ede/base.en.pt',
  'small':     'https://openaipublic.azureedge.net/main/whisper/models/9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794/small.pt',
  'small.en':  'https://openaipublic.azureedge.net/main/whisper/models/f953ad0fd29cacd07d5a9eda5624af0f6bcf2258be67c92b79389873d91e0872/small.en.pt',
  'medium':    'https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59415adc60127b97c714f32e89e936602e85993674d08dcb1/medium.pt',
  'medium.en': 'https://openaipublic.azureedge.net/main/whisper/models/d7440d1dc186f76616474e0ff0b3b6b879abc9d1a4926b7adfa41db2d497ab4f/medium.en.pt',
  'large':     'https://openaipublic.azureedge.net/main/whisper/models/e4b87e7e0bf463eb8e6956e646f1e277e901512310def2c24bf0e11bd3c28e9a/large-v1.pt',
  'large-v2':  'https://openaipublic.azureedge.net/main/whisper/models/81f7c96c852ee8fc832187b0132e569d6c3065a3252ef18e3f3340ebb1773db6/large-v2.pt',
  'large-v3':  'https://openaipublic.azureedge.net/main/whisper/models/e5b1a55b89c1367dacf97e3e19bfd829a01529dbfdeefa8caeb59b3f1b81dadb/large-v3.pt',
}

const WHISPER_FILENAMES: Record<string, string> = {
  'tiny':      'tiny.pt',
  'tiny.en':   'tiny.en.pt',
  'base':      'base.pt',
  'base.en':   'base.en.pt',
  'small':     'small.pt',
  'small.en':  'small.en.pt',
  'medium':    'medium.pt',
  'medium.en': 'medium.en.pt',
  'large':     'large-v1.pt',
  'large-v2':  'large-v2.pt',
  'large-v3':  'large-v3.pt',
}

const WHISPER_CACHE_DIR = join(homedir(), '.cache', 'whisper')

function getDownloadedWhisperModels(): string[] {
  try {
    if (!existsSync(WHISPER_CACHE_DIR)) return []
    const files = readdirSync(WHISPER_CACHE_DIR)
    return Object.entries(WHISPER_FILENAMES)
      .filter(([, filename]) => files.includes(filename))
      .map(([model]) => model)
  } catch {
    return []
  }
}

async function checkOllama(): Promise<{ running: boolean; models: string[] }> {
  try {
    const { stdout } = await execAsync('curl -s http://localhost:11434/api/tags', { timeout: 3000 })
    const data = JSON.parse(stdout)
    const models = (data.models || []).map((m: any) => m.name)
    return { running: true, models }
  } catch {
    return { running: false, models: [] }
  }
}

function sendToRenderer(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
}

// Active downloads: model → abort controller
const activeDownloads = new Map<string, { abort: () => void }>()


export function registerModelHandlers() {
  ipcMain.handle('models:get-whisper-downloaded', () => {
    return getDownloadedWhisperModels()
  })

  ipcMain.handle('models:check-ollama', async () => {
    return await checkOllama()
  })

  ipcMain.handle('models:download-whisper', async (_event, modelName: string) => {
    if (activeDownloads.has(modelName)) {
      return { success: false, error: 'Already downloading' }
    }

    const url = WHISPER_URLS[modelName]
    if (!url) return { success: false, error: `Unknown model: ${modelName}` }

    const filename = WHISPER_FILENAMES[modelName]
    if (!existsSync(WHISPER_CACHE_DIR)) {
      mkdirSync(WHISPER_CACHE_DIR, { recursive: true })
    }

    const dest = join(WHISPER_CACHE_DIR, filename)
    const tempDest = dest + '.part'

    let aborted = false
    let req: any = null

    sendToRenderer('models:download-progress', { model: modelName, percent: 0, mbDone: 0, mbTotal: 0 })

    return new Promise((resolve) => {
      const file = createWriteStream(tempDest)

      activeDownloads.set(modelName, {
        abort: () => {
          aborted = true
          if (req) req.destroy()
          file.close()  // must close before deleting on all platforms
          try { unlinkSync(tempDest) } catch {}
        }
      })

      let redirectCount = 0
      const makeRequest = (url: string) => {
        const client = url.startsWith('https') ? https : http
        req = client.get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume() // drain the response socket before redirecting
            if (++redirectCount > 5) {
              resolve({ success: false, error: 'Too many redirects' })
              return
            }
            const location = res.headers.location
            if (!location) { resolve({ success: false, error: 'Redirect missing Location header' }); return }
            return makeRequest(location)
          }
          if (res.statusCode !== 200) {
            activeDownloads.delete(modelName)
            resolve({ success: false, error: `HTTP ${res.statusCode}` })
            return
          }

          const total = parseInt(res.headers['content-length'] || '0', 10)
          let downloaded = 0

          res.on('data', (chunk: Buffer) => {
            if (aborted) return
            downloaded += chunk.length
            file.write(chunk)
            const mbDone = downloaded / 1024 / 1024
            const mbTotal = total > 0 ? total / 1024 / 1024 : -1 // -1 = unknown
            const pct = total > 0 ? Math.round(downloaded / total * 100) : 0
            sendToRenderer('models:download-progress', { model: modelName, percent: pct, mbDone, mbTotal })
          })

          res.on('end', () => {
            if (aborted) return
            file.close(() => {
              // Rename temp file to final name
              try {
                renameSync(tempDest, dest)
              } catch (e) {
                // fallback: file might already be moved
              }
              activeDownloads.delete(modelName)
              sendToRenderer('models:download-done', { model: modelName })
              resolve({ success: true })
            })
          })

          res.on('error', (err: Error) => {
            activeDownloads.delete(modelName)
            try { unlinkSync(tempDest) } catch {}
            sendToRenderer('models:download-error', { model: modelName, error: err.message })
            resolve({ success: false, error: err.message })
          })
        })

        req.on('error', (err: Error) => {
          if (aborted) return
          activeDownloads.delete(modelName)
          try { unlinkSync(tempDest) } catch {}
          sendToRenderer('models:download-error', { model: modelName, error: err.message })
          resolve({ success: false, error: err.message })
        })
      }

      makeRequest(url)
    })
  })

  ipcMain.handle('models:cancel-download', (_event, modelName: string) => {
    const dl = activeDownloads.get(modelName)
    if (dl) {
      dl.abort()
      activeDownloads.delete(modelName)
      return true
    }
    return false
  })

  console.log('Model IPC handlers registered')
}
