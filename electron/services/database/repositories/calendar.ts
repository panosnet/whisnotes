import { randomUUID } from 'crypto'
import { getDatabase } from '../schema.js'
import type { CalendarEvent } from '../../../types/index.js'

export class CalendarRepository {
  private db = getDatabase()

  create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO calendar_events
      (id, meeting_id, title, description, start_time, end_time, timezone, location,
       attendees, reminder_minutes, recurrence_rule, external_id, external_source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      event.meetingId || null,
      event.title,
      event.description || null,
      event.startTime.toISOString(),
      event.endTime?.toISOString() || null,
      event.timezone,
      event.location || null,
      event.attendees ? JSON.stringify(event.attendees) : null,
      event.reminderMinutes || null,
      event.recurrenceRule || null,
      event.externalId || null,
      event.externalSource || null,
      now,
      now
    )

    return {
      id,
      ...event,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }
  }

  getAll(): CalendarEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM calendar_events ORDER BY start_time DESC
    `)

    const rows = stmt.all() as any[]
    return rows.map(this.mapRow)
  }

  getByDateRange(startDate: Date, endDate: Date): CalendarEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM calendar_events
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time ASC
    `)

    const rows = stmt.all(startDate.toISOString(), endDate.toISOString()) as any[]
    return rows.map(this.mapRow)
  }

  getByMeetingId(meetingId: string): CalendarEvent | null {
    const stmt = this.db.prepare(`
      SELECT * FROM calendar_events WHERE meeting_id = ?
    `)

    const row = stmt.get(meetingId) as any
    return row ? this.mapRow(row) : null
  }

  update(id: string, data: Partial<CalendarEvent>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (data.title) {
      fields.push('title = ?')
      values.push(data.title)
    }

    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }

    if (data.startTime) {
      fields.push('start_time = ?')
      values.push(data.startTime.toISOString())
    }

    if (data.endTime) {
      fields.push('end_time = ?')
      values.push(data.endTime.toISOString())
    }

    if (data.location !== undefined) {
      fields.push('location = ?')
      values.push(data.location)
    }

    if (fields.length === 0) return false

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  private mapRow(row: any): CalendarEvent {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      title: row.title,
      description: row.description,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      timezone: row.timezone,
      location: row.location,
      attendees: row.attendees ? JSON.parse(row.attendees) : undefined,
      reminderMinutes: row.reminder_minutes,
      recurrenceRule: row.recurrence_rule,
      externalId: row.external_id,
      externalSource: row.external_source,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
