import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'

export interface VoiceProfile {
  id: string
  name: string
  samplePath?: string
  embeddingPath?: string
  provider: 'local' | 'elevenlabs'
  elevenlabsVoiceId?: string
  durationSecs?: number
  sourceMeetingId?: string
  createdAt: Date
  updatedAt: Date
}

export class VoiceProfileRepository {
  private db = getDatabase()

  create(data: Omit<VoiceProfile, 'id' | 'createdAt' | 'updatedAt'>): VoiceProfile {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO voice_profiles (id, name, sample_path, embedding_path, provider,
        elevenlabs_voice_id, duration_secs, source_meeting_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.samplePath ?? null, data.embeddingPath ?? null,
      data.provider, data.elevenlabsVoiceId ?? null, data.durationSecs ?? null,
      data.sourceMeetingId ?? null, now, now)
    return this.getById(id)!
  }

  getAll(): VoiceProfile[] {
    return (this.db.prepare('SELECT * FROM voice_profiles ORDER BY created_at DESC').all() as any[]).map(this.mapRow)
  }

  getById(id: string): VoiceProfile | null {
    const row = this.db.prepare('SELECT * FROM voice_profiles WHERE id = ?').get(id) as any
    return row ? this.mapRow(row) : null
  }

  update(id: string, data: Partial<VoiceProfile>): boolean {
    const fields: string[] = []; const values: any[] = []
    if (data.name !== undefined)               { fields.push('name = ?');                  values.push(data.name) }
    if (data.samplePath !== undefined)         { fields.push('sample_path = ?');           values.push(data.samplePath) }
    if (data.embeddingPath !== undefined)      { fields.push('embedding_path = ?');        values.push(data.embeddingPath) }
    if (data.provider !== undefined)           { fields.push('provider = ?');              values.push(data.provider) }
    if (data.elevenlabsVoiceId !== undefined)  { fields.push('elevenlabs_voice_id = ?');  values.push(data.elevenlabsVoiceId) }
    if (data.durationSecs !== undefined)       { fields.push('duration_secs = ?');         values.push(data.durationSecs) }
    if (fields.length === 0) return false
    fields.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id)
    return this.db.prepare(`UPDATE voice_profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM voice_profiles WHERE id = ?').run(id).changes > 0
  }

  private mapRow(row: any): VoiceProfile {
    return {
      id: row.id, name: row.name,
      samplePath: row.sample_path ?? undefined,
      embeddingPath: row.embedding_path ?? undefined,
      provider: row.provider,
      elevenlabsVoiceId: row.elevenlabs_voice_id ?? undefined,
      durationSecs: row.duration_secs ?? undefined,
      sourceMeetingId: row.source_meeting_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
