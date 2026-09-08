import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readLiveRfidData } from '../server/database.js'

test('live RFID adapter exposes only mapped presence sessions in app format', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE scanner_state (scanner_id TEXT PRIMARY KEY, venue_id TEXT, venue_label TEXT, updated_at TEXT);
    CREATE TABLE presence_sessions (
      id INTEGER PRIMARY KEY, tag TEXT, name TEXT, room TEXT, entered_at TEXT,
      last_seen_at TEXT, left_at TEXT, read_count INTEGER, scanner_id TEXT,
      venue_id TEXT, venue_label TEXT, subject_id TEXT, exit_inferred INTEGER,
      closed_reason TEXT
    );
    INSERT INTO scanner_state VALUES ('reader-1', 'activity_room', 'Activity room', '2026-09-07T02:00:00.000Z');
    INSERT INTO presence_sessions VALUES
      (1, 'TAG-1', 'Person 1', 'Activity room', '2026-09-07T02:00:00.000Z', '2026-09-07T02:00:04.000Z', NULL, 4, 'reader-1', 'activity_room', 'Activity room', 'PT-003', 0, NULL),
      (2, 'UNKNOWN', 'Unknown', 'Corridor', '2026-09-07T01:00:00.000Z', '2026-09-07T01:00:02.000Z', '2026-09-07T01:00:07.000Z', 2, 'reader-1', 'corridor', 'Corridor', NULL, 1, 'signal_lost');
  `)

  const payload = readLiveRfidData(db)
  assert.equal(payload.schema, 'psychmap.rfid.live.v1')
  assert.equal(payload.scanner.venueLabel, 'Activity room')
  assert.equal(payload.recentSessions.length, 1)
  assert.equal(payload.activeSessions.length, 1)
  assert.deepEqual(payload.activeSessions[0], {
    id: 1, tag: 'TAG-1', name: 'Person 1', room: 'Activity room',
    enteredAt: '2026-09-07T02:00:00.000Z', lastSeenAt: '2026-09-07T02:00:04.000Z', leftAt: null,
    readCount: 4, scannerId: 'reader-1', venueId: 'activity_room', venueLabel: 'Activity room',
    patientId: 'PT-003', active: true, exitInferred: false, closedReason: null,
  })
  db.close()
})
