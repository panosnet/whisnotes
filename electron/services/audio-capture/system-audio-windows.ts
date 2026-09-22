import { EventEmitter } from 'events'
import { BrowserWindow, desktopCapturer, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class SystemAudioWindows extends EventEmitter {
  private captureWindow: BrowserWindow | null = null
  private chunkHandler: ((_e: any, buf: Buffer) => void) | null = null
  private errHandler: ((_e: any, msg: string) => void) | null = null

  async checkAvailability(): Promise<boolean> {
    return process.platform === 'win32'
  }

  async start(): Promise<void> {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    const screenId = sources[0]?.id
    if (!screenId) throw new Error('No screen source found for Windows audio capture')

    this.captureWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    })

    const self = this

    this.chunkHandler = (_e: any, buf: Buffer) => {
      self.emit('audio-data', buf)
      self.emit('volume-level', self.calcRms(buf))
    }
    this.errHandler = (_e: any, msg: string) => self.emit('error', new Error(msg))

    ipcMain.on('win-audio-chunk', this.chunkHandler)
    ipcMain.on('win-audio-error', this.errHandler)

    await this.captureWindow.loadURL('about:blank')

    await this.captureWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: '${screenId}',
              }
            },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: '${screenId}',
                maxWidth: 1,
                maxHeight: 1,
              }
            }
          });
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          const src = audioCtx.createMediaStreamSource(stream);
          const proc = audioCtx.createScriptProcessor(4096, 1, 1);
          proc.onaudioprocess = (e) => {
            const f32 = e.inputBuffer.getChannelData(0);
            const i16 = new Int16Array(f32.length);
            for (let i = 0; i < f32.length; i++) {
              i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
            }
            require('electron').ipcRenderer.send('win-audio-chunk', Buffer.from(i16.buffer));
          };
          src.connect(proc);
          proc.connect(audioCtx.destination);
        } catch (e) {
          require('electron').ipcRenderer.send('win-audio-error', e.message || String(e));
        }
      })();
    `)
  }

  stop(): void {
    if (this.chunkHandler) { ipcMain.removeListener('win-audio-chunk', this.chunkHandler); this.chunkHandler = null }
    if (this.errHandler) { ipcMain.removeListener('win-audio-error', this.errHandler); this.errHandler = null }
    this.captureWindow?.close()
    this.captureWindow = null
    this.emit('stopped')
  }

  private calcRms(buf: Buffer): number {
    const s = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2))
    let sum = 0
    for (const x of s) sum += (x / 32768) ** 2
    return Math.min(1, Math.sqrt(sum / (s.length || 1)) * 3)
  }
}
