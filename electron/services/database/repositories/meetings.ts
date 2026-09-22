import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { Meeting } from '../../../types/index.js'

export class MeetingRepository {
  private db = getDatabase()

  create(title: string, sourceApp: string, language: string): Meeting {
    const id = randomUUID()
    const now = new Date().toISOString()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, title, start_time, source_app, language, timezone, is_starred, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `)

    stmt.run(id, title, now, sourceApp, language, timezone, now, now)

    return {
      id,
      title,
      startTime: new Date(now),
      sourceApp,
      language,
      timezone,
      isStarred: false,
      isArchived: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }
  }

  getAll(): Meeting[] {
    const stmt = this.db.prepare(`
      SELECT * FROM meetings ORDER BY start_time DESC
    `)

    const rows = stmt.all() as any[]
    return rows.map(this.mapRow)
  }

  getById(id: string): Meeting | null {
    const stmt = this.db.prepare(`
      SELECT * FROM meetings WHERE id = ?
    `)

    const row = stmt.get(id) as any
    return row ? this.mapRow(row) : null
  }

  update(id: string, data: Partial<Meeting>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.endTime !== undefined) { fields.push('end_time = ?'); values.push(data.endTime?.toISOString() ?? null) }
    if (data.isStarred !== undefined) { fields.push('is_starred = ?'); values.push(data.isStarred ? 1 : 0) }
    if (data.isArchived !== undefined) { fields.push('is_archived = ?'); values.push(data.isArchived ? 1 : 0) }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location) }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
    if (data.participants !== undefined) { fields.push('participants = ?'); values.push(JSON.stringify(data.participants)) }
    if (data.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(data.durationSeconds) }

    if (fields.length === 0) return false

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = this.db.prepare(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM meetings WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  search(query: string): Meeting[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT m.* FROM meetings m
      LEFT JOIN transcript_segments ts ON ts.meeting_id = m.id
      WHERE m.title LIKE ? ESCAPE '\\' OR ts.text LIKE ? ESCAPE '\\'
      ORDER BY m.start_time DESC
    `)

    // Escape LIKE wildcards so user input is treated as literal text
    const escaped = query.replace(/%/g, '\\%').replace(/_/g, '\\_')
    const searchTerm = `%${escaped}%`
    const rows = stmt.all(searchTerm, searchTerm) as any[]
    return rows.map(row => this.mapRow(row))
  }

  private mapRow(row: any): Meeting {
    return {
      id: row.id,
      title: row.title,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      sourceApp: row.source_app,
      language: row.language,
      timezone: row.timezone || 'UTC',
      location: row.location,
      participants: row.participants ? JSON.parse(row.participants) : undefined,
      durationSeconds: row.duration_seconds,
      recordingDevice: row.recording_device,
      audioQuality: row.audio_quality,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      isStarred: row.is_starred === 1,
      isArchived: row.is_archived === 1,
      calendarEventId: row.calendar_event_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
