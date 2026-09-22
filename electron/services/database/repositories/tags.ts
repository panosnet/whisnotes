import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { Tag } from '../../../types/index.js'

export class TagRepository {
  private db = getDatabase()

  create(name: string, color?: string): Tag {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, name, color, created_at)
      VALUES (?, ?, ?, ?)
    `)

    try {
      stmt.run(id, name, color || null, now)
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        // Tag already exists, return it
        return this.getByName(name)!
      }
      throw error
    }

    return {
      id,
      name,
      color,
      createdAt: new Date(now),
    }
  }

  getAll(): Tag[] {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY name ASC')
    const rows = stmt.all() as any[]
    return rows.map(this.mapRow)
  }

  getByName(name: string): Tag | null {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE name = ?')
    const row = stmt.get(name) as any
    return row ? this.mapRow(row) : null
  }

  getByMeetingId(meetingId: string): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN meeting_tags mt ON mt.tag_id = t.id
      WHERE mt.meeting_id = ?
      ORDER BY t.name ASC
    `)

    const rows = stmt.all(meetingId) as any[]
    return rows.map(this.mapRow)
  }

  addToMeeting(meetingId: string, tagName: string, color?: string): void {
    // Get or create tag
    let tag = this.getByName(tagName)
    if (!tag) {
      tag = this.create(tagName, color)
    }

    // Link to meeting
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO meeting_tags (meeting_id, tag_id)
      VALUES (?, ?)
    `)

    stmt.run(meetingId, tag.id)
  }

  removeFromMeeting(meetingId: string, tagId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM meeting_tags WHERE meeting_id = ? AND tag_id = ?
    `)

    const result = stmt.run(meetingId, tagId)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  private mapRow(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: new Date(row.created_at),
    }
  }
}
