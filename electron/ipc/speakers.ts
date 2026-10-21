import { ipcMain, BrowserWindow } from 'electron'
import { existsSync, copyFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { speakerRecognitionService } from '../services/ai/speaker-recognition.js'
import { SpeakerProfileRepository } from '../services/database/repositories/speaker-profiles.js'
import { TranscriptRepository } from '../services/database/repositories/transcripts.js'

const profileRepo   = new SpeakerProfileRepository()
const transcriptRepo = new TranscriptRepository()

function sendToAll(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send(channel, data))
}

export function registerSpeakerHandlers() {

  // ── Profile CRUD ────────────────────────────────────────────────────────────

  ipcMain.handle('speakers:list', () => profileRepo.getAllProfiles())

  ipcMain.handle('speakers:create', (_e, name: string, description?: string) => {
    return profileRepo.createProfile(name, description)
  })

  ipcMain.handle('speakers:update', (_e, id: string, data: { name?: string; description?: string }) => {
    return profileRepo.updateProfile(id, data)
  })

  ipcMain.handle('speakers:delete', (_e, id: string) => {
    return profileRepo.deleteProfile(id)
  })

  // ── Voice Sample Registration ───────────────────────────────────────────────

  /**
   * Register a voice sample for a known speaker.
   * audioPath: path to a WAV/MP3/M4A file containing clear speech from this person.
   */
  ipcMain.handle('speakers:register-sample', async (_e, speakerId: string, audioPath: string, sourceMeetingId?: string) => {
    if (!existsSync(audioPath)) throw new Error(`Audio file not found: ${audioPath}`)

    sendToAll('speakers:progress', { message: `Processing voice sample for speaker…` })

    const { sampleCount, embeddingPath } = await speakerRecognitionService.registerSample(audioPath, speakerId)

    // Copy audio to userData for persistence
    const sampleCopy = join(speakerRecognitionService.getEmbeddingsDir(), `${speakerId}.sample${sampleCount - 1}.wav`)
    try { copyFileSync(audioPath, sampleCopy) } catch {}

    profileRepo.addEmbedding(speakerId, sampleCopy, embeddingPath, sourceMeetingId)
    profileRepo.updateProfile(speakerId, { sampleCount })

    sendToAll('speakers:progress', { message: `Registered — ${sampleCount} sample${sampleCount !== 1 ? 's' : ''} total`, done: true })
    return profileRepo.getProfileById(speakerId)
  })

  ipcMain.handle('speakers:get-embeddings', (_e, speakerId: string) => {
    return profileRepo.getEmbeddingsForSpeaker(speakerId)
  })

  // ── Speaker Identification ──────────────────────────────────────────────────

  /**
   * Identify the speaker in an audio file.
   */
  ipcMain.handle('speakers:identify', async (_e, audioPath: string) => {
    if (!existsSync(audioPath)) throw new Error(`Audio file not found: ${audioPath}`)
    const result = await speakerRecognitionService.identify(audioPath)
    if (result.speakerId) {
      const profile = profileRepo.getProfileById(result.speakerId)
      return { ...result, name: profile?.name }
    }
    return result
  })

  /**
   * Run speaker identification across all transcript segments of a meeting.
   * Updates speaker_name on each segment where a known person is identified.
   * Returns a summary of who was identified.
   */
  ipcMain.handle('speakers:identify-meeting', async (_e, meetingId: string, recordingPath: string) => {
    if (!existsSync(recordingPath)) throw new Error(`Recording not found: ${recordingPath}`)

    sendToAll('speakers:progress', { message: 'Identifying speakers in recording…' })

    const segments = transcriptRepo.getByMeetingId(meetingId)
    if (segments.length === 0) return { identified: 0, speakers: {} }

    // Build diarization segments from transcript timestamps
    const diarSegments = segments.map(s => ({
      speaker_label: `SEG_${s.id}`,
      start: s.timestamp,
      end: s.timestamp + 5, // approximate 5s window
    }))

    const identifications = await speakerRecognitionService.identifyBatch(recordingPath, diarSegments)

    const speakers: Record<string, { name: string; count: number }> = {}
    let identified = 0

    for (const seg of segments) {
      const key = `SEG_${seg.id}`
      const idResult = identifications[key]
      if (idResult?.identified && idResult.speakerId) {
        const profile = profileRepo.getProfileById(idResult.speakerId)
        if (profile) {
          transcriptRepo.updateSpeakerName(seg.id, profile.name, idResult.speakerId)
          speakers[profile.name] = { name: profile.name, count: (speakers[profile.name]?.count || 0) + 1 }
          identified++
        }
      }
    }

    // Mark speakers as last seen
    Object.values(speakers).forEach(({ name }) => {
      const profile = profileRepo.getAllProfiles().find(p => p.name === name)
      if (profile) profileRepo.updateProfile(profile.id, { lastSeenAt: new Date() })
    })

    sendToAll('speakers:progress', { message: `Identified ${identified} segment${identified !== 1 ? 's' : ''}`, done: true })
    return { identified, speakers }
  })

  /**
   * After WhisperX assigns SPEAKER_00/01 labels, map them to known people.
   * speakerMap: {"SPEAKER_00": "speakerId", "SPEAKER_01": null}
   */
  ipcMain.handle('speakers:assign-labels', async (_e, meetingId: string, speakerMap: Record<string, string | null>) => {
    const segments = transcriptRepo.getByMeetingId(meetingId)
    let updated = 0
    for (const seg of segments) {
      const diarLabel = `SPEAKER_${String(seg.speakerId ?? 99).padStart(2, '0')}`
      const assignedId = speakerMap[diarLabel]
      if (assignedId) {
        const profile = profileRepo.getProfileById(assignedId)
        if (profile) {
          transcriptRepo.updateSpeakerName(seg.id, profile.name, assignedId)
          profileRepo.updateProfile(assignedId, { lastSeenAt: new Date() })
          updated++
        }
      }
    }
    return { updated }
  })

  /**
   * Save a live-recorded audio buffer (webm from MediaRecorder), convert to WAV
   * via ffmpeg, and return the WAV path so speaker_server.py can read it.
   */
  ipcMain.handle('speakers:save-live-sample', async (_e, speakerId: string, uint8Array: number[]) => {
    const { writeFileSync, mkdirSync, unlinkSync } = await import('fs')
    const { join } = await import('path')
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    const { app: _app } = await import('electron')

    const dir = join(_app.getPath('userData'), 'speaker-embeddings')
    mkdirSync(dir, { recursive: true })

    const webmPath = join(dir, `${speakerId}.live-${Date.now()}.webm`)
    const wavPath  = webmPath.replace('.webm', '.wav')

    // Write raw webm from MediaRecorder
    writeFileSync(webmPath, Buffer.from(uint8Array))

    // Convert to 16kHz mono WAV (required by resemblyzer)
    try {
      await execFileAsync('/opt/homebrew/bin/ffmpeg', [
        '-y', '-i', webmPath,
        '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath
      ])
      unlinkSync(webmPath)   // remove the webm, keep only wav
      return wavPath
    } catch (err: any) {
      // Clean up and surface the error
      try { unlinkSync(webmPath) } catch {}
      throw new Error(`ffmpeg conversion failed: ${err.message}`)
    }
  })

  /**
   * Get the best available WAV file for a speaker (for TTS reference).
   * Returns the path to the most recent WAV sample, or null if none exist.
   */
  ipcMain.handle('speakers:get-sample-path', async (_e, speakerId: string) => {
    const { readdirSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const { app: _app } = await import('electron')
    const dir = join(_app.getPath('userData'), 'speaker-embeddings')
    if (!existsSync(dir)) return null
    const wavs = readdirSync(dir)
      .filter(f => f.startsWith(speakerId) && f.endsWith('.wav'))
      .sort()
      .reverse()  // most recent first
    return wavs.length > 0 ? join(dir, wavs[0]) : null
  })

  /**
   * List all speakers that have at least one WAV sample (usable for TTS).
   */
  ipcMain.handle('speakers:list-for-tts', async () => {
    const { readdirSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const { app: _app } = await import('electron')
    const dir = join(_app.getPath('userData'), 'speaker-embeddings')
    if (!existsSync(dir)) return []
    const wavFiles = readdirSync(dir).filter(f => f.endsWith('.wav'))
    const speakerIds = [...new Set(wavFiles.map(f => f.split('.')[0]))]
    return speakerIds
  })

  console.log('Speaker recognition IPC handlers registered')
}
