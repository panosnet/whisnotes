import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'

export interface SpeakerProfile {
  id: string
  name: string
  description?: string
  photoPath?: string
  sampleCount: number
  lastSeenAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SpeakerEmbedding {
  id: string
  speakerId: string
  audioSamplePath: string
  embeddingPath: string
  sourceMeetingId?: string
  confirmed: boolean
  createdAt: Date
}

export class SpeakerProfileRepository {
  private db = getDatabase()

  createProfile(name: string, description?: string): SpeakerProfile {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO speaker_profiles (id, name, description, sample_count, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(id, name, description ?? null, now, now)
    return this.getProfileById(id)!
  }

  getAllProfiles(): SpeakerProfile[] {
    return (this.db.prepare('SELECT * FROM speaker_profiles ORDER BY name ASC').all() as any[]).map(this.mapProfile)
  }

  getProfileById(id: string): SpeakerProfile | null {
    const row = this.db.prepare('SELECT * FROM speaker_profiles WHERE id = ?').get(id) as any
    return row ? this.mapProfile(row) : null
  }

  updateProfile(id: string, data: { name?: string; description?: string; sampleCount?: number; lastSeenAt?: Date }): boolean {
    const fields: string[] = []; const values: any[] = []
    if (data.name !== undefined)        { fields.push('name = ?');         values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?');  values.push(data.description) }
    if (data.sampleCount !== undefined) { fields.push('sample_count = ?'); values.push(data.sampleCount) }
    if (data.lastSeenAt !== undefined)  { fields.push('last_seen_at = ?'); values.push(data.lastSeenAt.toISOString()) }
    if (fields.length === 0) return false
    fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
    return this.db.prepare(`UPDATE speaker_profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0
  }

  deleteProfile(id: string): boolean {
    return this.db.prepare('DELETE FROM speaker_profiles WHERE id = ?').run(id).changes > 0
  }

  addEmbedding(speakerId: string, audioSamplePath: string, embeddingPath: string, sourceMeetingId?: string): SpeakerEmbedding {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO speaker_embeddings (id, speaker_id, audio_sample_path, embedding_path, source_meeting_id, confirmed, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, speakerId, audioSamplePath, embeddingPath, sourceMeetingId ?? null, now)

    // Update sample count
    const count = (this.db.prepare('SELECT COUNT(*) as c FROM speaker_embeddings WHERE speaker_id = ?').get(speakerId) as any).c
    this.updateProfile(speakerId, { sampleCount: count })

    return { id, speakerId, audioSamplePath, embeddingPath, sourceMeetingId, confirmed: true, createdAt: new Date(now) }
  }

  getEmbeddingsForSpeaker(speakerId: string): SpeakerEmbedding[] {
    return (this.db.prepare('SELECT * FROM speaker_embeddings WHERE speaker_id = ? ORDER BY created_at DESC').all(speakerId) as any[]).map(this.mapEmbedding)
  }

  private mapProfile(row: any): SpeakerProfile {
    return {
      id: row.id, name: row.name,
      description: row.description ?? undefined,
      photoPath: row.photo_path ?? undefined,
      sampleCount: row.sample_count || 0,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapEmbedding(row: any): SpeakerEmbedding {
    return {
      id: row.id, speakerId: row.speaker_id,
      audioSamplePath: row.audio_sample_path,
      embeddingPath: row.embedding_path,
      sourceMeetingId: row.source_meeting_id ?? undefined,
      confirmed: row.confirmed === 1,
      createdAt: new Date(row.created_at),
    }
  }
}
