import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { AnalysisResult } from '../../../types/index.js'

export class AnalysisRepository {
  private db = getDatabase()

  save(result: AnalysisResult): AnalysisResult {
    const id = result.id || randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis_results (id, meeting_id, type, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const content = JSON.stringify({
      summary: result.summary,
      keyPoints: result.keyPoints,
      actionItems: result.actionItems,
      topics: result.topics,
      speakers: result.speakers,
    })

    stmt.run(id, result.meetingId, 'full', content, now)

    return {
      ...result,
      id,
      createdAt: new Date(now),
    }
  }

  getByMeetingId(meetingId: string): AnalysisResult | null {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis_results
      WHERE meeting_id = ? AND type = 'full'
      ORDER BY created_at DESC
      LIMIT 1
    `)

    const row = stmt.get(meetingId) as any
    return row ? this.mapRow(row) : null
  }

  private mapRow(row: any): AnalysisResult {
    const content = JSON.parse(row.content)
    return {
      id: row.id,
      meetingId: row.meeting_id,
      summary: content.summary,
      keyPoints: content.keyPoints,
      actionItems: content.actionItems,
      topics: content.topics,
      speakers: content.speakers,
      createdAt: new Date(row.created_at),
    }
  }
}
