import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'whisnotes.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export async function initializeDatabase() {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      source_app TEXT NOT NULL,
      language TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      location TEXT,
      participants TEXT,
      duration_seconds INTEGER,
      recording_device TEXT,
      audio_quality TEXT,
      notes TEXT,
      tags TEXT,
      is_starred BOOLEAN DEFAULT 0,
      is_archived BOOLEAN DEFAULT 0,
      calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      timestamp REAL NOT NULL,
      text TEXT NOT NULL,
      language TEXT NOT NULL,
      translation TEXT,
      confidence REAL NOT NULL,
      speaker_id INTEGER,
      speaker_name TEXT,
      is_important BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      meeting_id TEXT,
      segment_id TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      color TEXT,
      is_pinned BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (segment_id) REFERENCES transcript_segments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      meeting_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      timezone TEXT DEFAULT 'UTC',
      location TEXT,
      attendees TEXT,
      reminder_minutes INTEGER,
      recurrence_rule TEXT,
      external_id TEXT,
      external_source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meeting_tags (
      meeting_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (meeting_id, tag_id),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_segments_meeting ON transcript_segments(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_segments_timestamp ON transcript_segments(timestamp);
    CREATE INDEX IF NOT EXISTS idx_analysis_meeting ON analysis_results(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_meetings_starred ON meetings(is_starred);
    CREATE INDEX IF NOT EXISTS idx_notes_meeting ON notes(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_notes_segment ON notes(segment_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_start_time ON calendar_events(start_time);
    CREATE INDEX IF NOT EXISTS idx_calendar_meeting ON calendar_events(meeting_id);
  `)

  // FTS5 full-text search across transcript segments
  // Use a separate statement since FTS5 syntax varies
  try {
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts
        USING fts5(text, meeting_id UNINDEXED, segment_id UNINDEXED,
                   content=transcript_segments, content_rowid=rowid);

      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS ts_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO transcripts_fts(rowid, text, meeting_id, segment_id) VALUES (new.rowid, new.text, new.meeting_id, new.id);
      END;
      CREATE TRIGGER IF NOT EXISTS ts_ad AFTER DELETE ON transcript_segments BEGIN
        INSERT INTO transcripts_fts(transcripts_fts, rowid, text, meeting_id, segment_id) VALUES ('delete', old.rowid, old.text, old.meeting_id, old.id);
      END;
      CREATE TRIGGER IF NOT EXISTS ts_au AFTER UPDATE ON transcript_segments BEGIN
        INSERT INTO transcripts_fts(transcripts_fts, rowid, text, meeting_id, segment_id) VALUES ('delete', old.rowid, old.text, old.meeting_id, old.id);
        INSERT INTO transcripts_fts(rowid, text, meeting_id, segment_id) VALUES (new.rowid, new.text, new.meeting_id, new.id);
      END;
    `)
  } catch (e) {
    // FTS5 may not be available in all SQLite builds; degrade gracefully
    console.log('[FTS5] Not available, full-text search disabled:', (e as Error).message)
  }

  console.log('Database initialized successfully')
}
