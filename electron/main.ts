import { app, BrowserWindow, ipcMain, globalShortcut, Notification } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { initializeDatabase } from './services/database/schema.js'
import { registerIPCHandlers } from './ipc/index.js'
import { checkEnvironment } from './services/env-check.js'
import { streamProcessor } from './services/stream-processor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 260, height: 60,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, focusable: false, skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.cjs'),
      contextIsolation: true, nodeIntegration: false,
    },
  })
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const isDev = !app.isPackaged
  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/overlay.html')
  } else {
    overlayWindow.loadFile(path.join(process.env.DIST!, 'overlay.html'))
  }
  overlayWindow.on('closed', () => { overlayWindow = null })
}

function sendToOverlay(channel: string, ...args: any[]) {
  overlayWindow?.webContents.send(channel, ...args)
}
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
  })

  // In development, always load from Vite dev server
  const isDev = !app.isPackaged

  if (isDev) {
    console.log('Loading from Vite dev server:', VITE_DEV_SERVER_URL)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // Don't auto-open dev tools - user can open with Cmd+Option+I
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    // Initialize database
    await initializeDatabase()

    // Register all IPC handlers
    registerIPCHandlers()

    // Overlay lifecycle — show when recording starts, hide when stopped
    ipcMain.on('internal:recording-started', () => {
      if (!overlayWindow) createOverlay()
      setTimeout(() => sendToOverlay('overlay:start'), 500) // wait for overlay to load
    })
    ipcMain.on('internal:recording-stopped', () => {
      sendToOverlay('overlay:stop')
      setTimeout(() => { overlayWindow?.close(); overlayWindow = null }, 1500)
    })
    // Stop button inside overlay
    ipcMain.on('overlay:stop-recording', () => {
      mainWindow?.webContents.send('shortcut:toggle-recording')
    })
    ipcMain.on('internal:new-segment', () => {
      sendToOverlay('overlay:segment')
    })

    // Register env-check handler
    const projectRoot = app.isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '../')
    ipcMain.handle('env:check', () => checkEnvironment(projectRoot)) // async — won't block main thread

    createWindow()

    // Global keyboard shortcut: Cmd+Option+R to toggle recording
    globalShortcut.register('Command+Option+R', () => {
      const wins = BrowserWindow.getAllWindows()
      if (wins.length > 0) {
        wins[0].webContents.send('shortcut:toggle-recording')
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  globalShortcut.unregisterAll()
  streamProcessor.shutdown()
})
