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

  console.log('Speaker recognition IPC handlers registered')
}
