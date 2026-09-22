import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { TranscriptSegment } from '../../../types/index.js'

export class TranscriptRepository {
  private db = getDatabase()

  create(segment: Omit<TranscriptSegment, 'id' | 'createdAt'>): TranscriptSegment {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO transcript_segments
      (id, meeting_id, timestamp, text, language, translation, confidence, speaker_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      segment.meetingId,
      segment.timestamp,
      segment.text,
      segment.language,
      segment.translation || null,
      segment.confidence,
      segment.speakerId || null,
      now
    )

    return {
      id,
      ...segment,
      createdAt: new Date(now),
    }
  }

  getByMeetingId(meetingId: string): TranscriptSegment[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transcript_segments
      WHERE meeting_id = ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(meetingId) as any[]
    return rows.map(this.mapRow)
  }

  updateText(id: string, text: string): boolean {
    const stmt = this.db.prepare('UPDATE transcript_segments SET text = ? WHERE id = ?')
    const result = stmt.run(text, id)
    return result.changes > 0
  }

  search(query: string): { meetingId: string; segmentId: string; snippet: string; timestamp: number }[] {
    try {
      const stmt = this.db.prepare(`
        SELECT ts.meeting_id, ts.id as segment_id, ts.text as snippet, ts.timestamp
        FROM transcripts_fts fts
        JOIN transcript_segments ts ON ts.rowid = fts.rowid
        WHERE transcripts_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `)
      return stmt.all(query) as any[]
    } catch {
      // FTS5 not available — fall back to LIKE search
      const esc = query.replace(/%/g, '\\%').replace(/_/g, '\\_')
      const stmt = this.db.prepare(`
        SELECT meeting_id, id as segment_id, text as snippet, timestamp
        FROM transcript_segments WHERE text LIKE ? ESCAPE '\\' LIMIT 50
      `)
      return stmt.all(`%${esc}%`) as any[]
    }
  }

  updateTranslation(id: string, translation: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE transcript_segments SET translation = ? WHERE id = ?
    `)

    const result = stmt.run(translation, id)
    return result.changes > 0
  }

  private mapRow(row: any): TranscriptSegment {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      timestamp: row.timestamp,
      text: row.text,
      language: row.language,
      translation: row.translation,
      confidence: row.confidence,
      speakerId: row.speaker_id,
      isImportant: row.is_important === 1,
      createdAt: new Date(row.created_at),
    }
  }
}
