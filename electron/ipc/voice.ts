import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { voiceCloneService } from '../services/ai/voice-clone.js'
import { VoiceProfileRepository } from '../services/database/repositories/voice-profiles.js'

const profileRepo = new VoiceProfileRepository()

function sendToAll(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
}

export function registerVoiceHandlers() {

  ipcMain.handle('voice:list-profiles', () => {
    return profileRepo.getAll()
  })

  ipcMain.handle('voice:create-profile', async (_e, name: string, samplePath: string, sourceMeetingId?: string) => {
    if (!existsSync(samplePath)) throw new Error(`Sample file not found: ${samplePath}`)

    const voiceId = randomUUID()

    sendToAll('voice:clone-progress', { message: `Creating voice profile "${name}"…` })

    const { durationSecs } = await voiceCloneService.cloneVoice(samplePath, voiceId)

    const profile = profileRepo.create({
      name,
      samplePath,
      embeddingPath: join(voiceCloneService.getVoicesDir(), `${voiceId}.wav`),
      provider: 'local',
      durationSecs,
      sourceMeetingId,
    })

    sendToAll('voice:clone-progress', { message: `Voice "${name}" ready!`, done: true, profile })
    return profile
  })

  ipcMain.handle('voice:delete-profile', (_e, id: string) => {
    return profileRepo.delete(id)
  })

  /** Synthesize using a People directory speaker's sample WAV */
  ipcMain.handle('voice:synthesize-person', async (_e, text: string, sampleWavPath: string) => {
    const outputPath = join(voiceCloneService.getSynthDir(), `${randomUUID()}.wav`)
    sendToAll('voice:synthesis-progress', { status: 'synthesizing', text })
    const result = await voiceCloneService.synthesizeWithRef(text, sampleWavPath, outputPath)
    sendToAll('voice:synthesis-progress', { status: 'done', path: result.path, durationSecs: result.durationSecs })
    return result
  })

  ipcMain.handle('voice:synthesize', async (_e, text: string, voiceId: string) => {
    const outputPath = join(voiceCloneService.getSynthDir(), `${randomUUID()}.wav`)
    sendToAll('voice:synthesis-progress', { status: 'synthesizing', text })
    const result = await voiceCloneService.synthesize(text, voiceId, outputPath)
    sendToAll('voice:synthesis-progress', { status: 'done', path: result.path, durationSecs: result.durationSecs })
    return result
  })

  ipcMain.handle('voice:save-synthesis', async (_e, sourcePath: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'synthesized_speech.wav',
      filters: [{ name: 'WAV Audio', extensions: ['wav'] }],
    })
    if (result.canceled || !result.filePath) return null
    const { copyFileSync } = await import('fs')
    copyFileSync(sourcePath, result.filePath)
    return result.filePath
  })

  ipcMain.handle('voice:realtime-start', async (_e, voiceId: string) => {
    await voiceCloneService.startRealtime(voiceId)
    return { success: true }
  })

  ipcMain.handle('voice:realtime-chunk', async (_e, pcmBase64: string) => {
    const audiob64 = await voiceCloneService.processRealtimeChunk(pcmBase64)
    return { audiob64 }
  })

  ipcMain.handle('voice:realtime-stop', async () => {
    await voiceCloneService.stopRealtime()
    return { success: true }
  })

  ipcMain.handle('voice:check-blackhole', async () => {
    // Check for BlackHole virtual audio device — use import() not require() (ESM)
    const { readdirSync } = await import('fs')
    const halPath = '/Library/Audio/Plug-Ins/HAL'
    const entries = existsSync(halPath)
      ? readdirSync(halPath).filter((f: string) => f.toLowerCase().includes('blackhole'))
      : []
    return { installed: entries.length > 0, entries }
  })

  ipcMain.handle('voice:open-blackhole-url', () => {
    shell.openExternal('https://github.com/ExistentialAudio/BlackHole?tab=readme-ov-file#installation')
  })

  /** Copy an arbitrary WAV to VOICES_DIR so it can be used as a voice ID by tts_server.py */
  ipcMain.handle('voice:clone-from-path', async (_e, voiceId: string, wavPath: string) => {
    const { copyFileSync } = await import('fs')
    const dest = join(voiceCloneService.getVoicesDir(), `${voiceId}.wav`)
    copyFileSync(wavPath, dest)
    return dest
  })

  console.log('Voice IPC handlers registered')
}
