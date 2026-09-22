import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { Note } from '../../../types/index.js'

export class NoteRepository {
  private db = getDatabase()

  create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO notes (id, meeting_id, segment_id, content, type, color, is_pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      note.meetingId || null,
      note.segmentId || null,
      note.content,
      note.type,
      note.color || null,
      note.isPinned ? 1 : 0,
      now,
      now
    )

    return {
      id,
      ...note,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }
  }

  getByMeetingId(meetingId: string): Note[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notes WHERE meeting_id = ? ORDER BY created_at DESC
    `)

    const rows = stmt.all(meetingId) as any[]
    return rows.map(this.mapRow)
  }

  getBySegmentId(segmentId: string): Note[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notes WHERE segment_id = ? ORDER BY created_at DESC
    `)

    const rows = stmt.all(segmentId) as any[]
    return rows.map(this.mapRow)
  }

  update(id: string, content: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE notes SET content = ?, updated_at = ? WHERE id = ?
    `)

    const result = stmt.run(content, new Date().toISOString(), id)
    return result.changes > 0
  }

  togglePin(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE notes SET is_pinned = NOT is_pinned, updated_at = ? WHERE id = ?
    `)

    const result = stmt.run(new Date().toISOString(), id)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  private mapRow(row: any): Note {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      segmentId: row.segment_id,
      content: row.content,
      type: row.type,
      color: row.color,
      isPinned: row.is_pinned === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
