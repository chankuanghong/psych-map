// ============================================================
// De-identified and rehashed behavioural demonstration data — PT-001 (Primary Demo)
// 14-day trajectory per AGENTS.md §6 Golden Demo Patient
//
// DISCLAIMER: Direct identifiers are removed; this local prototype must not be treated as a clinical record.
// No real patient information is used or represented.
// ============================================================

// Calendar anchor for Day 1. The explicit offset keeps authored HH:mm values
// stable across machines and avoids treating the 07:00 waking-window start as midnight.
export const ADMISSION_DATE = new Date('2026-07-30T00:00:00+08:00')

const day = (n) => new Date(ADMISSION_DATE.getTime() + (n - 1) * 86400000)
const ts = (n, h, m = 0) => new Date(day(n).getTime() + h * 3600000 + m * 60000).toISOString()

// ------------------------------------------------------------------
// Location Events — zone dwell times per day
// Each entry: { patientId, zoneId, enteredAt, exitedAt, durationMinutes }
// ------------------------------------------------------------------
export const LOCATION_EVENTS = [
  // ===== DAYS 1–4: mostly bedroom-bound =====
  // Day 1
  { patientId: 'PT-001', zoneId: 'bedroom',        enteredAt: ts(1,7),   exitedAt: ts(1,8,30), durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(1,8,30),exitedAt: ts(1,8,50), durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(1,8,50),exitedAt: ts(1,11,30),durationMinutes: 160 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(1,12),  exitedAt: ts(1,12,20),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(1,12,20),exitedAt: ts(1,18,0),durationMinutes: 340 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(1,18),  exitedAt: ts(1,18,15),durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(1,18,15),exitedAt: ts(1,22,0),durationMinutes: 225 },

  // Day 2
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(2,7),   exitedAt: ts(2,9,0),  durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(2,9),   exitedAt: ts(2,9,15), durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(2,9,15),exitedAt: ts(2,12,0), durationMinutes: 165 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(2,12),  exitedAt: ts(2,12,10),durationMinutes: 10 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(2,12,10),exitedAt: ts(2,12,30),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(2,12,30),exitedAt: ts(2,12,50),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(2,12,50),exitedAt: ts(2,19,0),durationMinutes: 370 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(2,19),  exitedAt: ts(2,19,15),durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(2,19,15),exitedAt: ts(2,22,0),durationMinutes: 165 },

  // Day 3
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(3,7),   exitedAt: ts(3,10,0), durationMinutes: 180 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(3,10),  exitedAt: ts(3,10,15),durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(3,10,15),exitedAt: ts(3,12,30),durationMinutes: 135 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(3,12,30),exitedAt: ts(3,12,50),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(3,12,50),exitedAt: ts(3,19,0),durationMinutes: 370 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(3,19),  exitedAt: ts(3,19,20),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(3,19,20),exitedAt: ts(3,22,0),durationMinutes: 160 },

  // Day 4
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(4,7),   exitedAt: ts(4,9,30), durationMinutes: 150 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(4,9,30),exitedAt: ts(4,9,50), durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(4,10),  exitedAt: ts(4,10,20),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(4,10,20),exitedAt: ts(4,12,30),durationMinutes: 130 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(4,12,30),exitedAt: ts(4,13,0),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'corridor',        enteredAt: ts(4,13),  exitedAt: ts(4,13,10),durationMinutes: 10 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(4,13,10),exitedAt: ts(4,19,0),durationMinutes: 350 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(4,19),  exitedAt: ts(4,19,20),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(4,19,20),exitedAt: ts(4,22,0),durationMinutes: 160 },

  // ===== DAY 5: medication adjusted (still largely bedroom-bound) =====
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(5,7),   exitedAt: ts(5,9,0),  durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(5,9),   exitedAt: ts(5,9,30), durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(5,9,30),exitedAt: ts(5,12,30),durationMinutes: 180 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(5,12,30),exitedAt: ts(5,13,0),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(5,13),  exitedAt: ts(5,15,0), durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'corridor',        enteredAt: ts(5,15),  exitedAt: ts(5,15,15),durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(5,15,15),exitedAt: ts(5,19,0),durationMinutes: 225 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(5,19),  exitedAt: ts(5,19,30),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(5,19,30),exitedAt: ts(5,22,0),durationMinutes: 150 },

  // ===== DAY 6: OT starts, first signs of engagement =====
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(6,7),   exitedAt: ts(6,8,30), durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(6,8,30),exitedAt: ts(6,9,0),  durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(6,9),   exitedAt: ts(6,9,30), durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(6,10),  exitedAt: ts(6,10,45),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(6,10,45),exitedAt: ts(6,12,30),durationMinutes: 105 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(6,12,30),exitedAt: ts(6,13,5),durationMinutes: 35 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(6,13,5),exitedAt: ts(6,13,30),durationMinutes: 25 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(6,13,30),exitedAt: ts(6,15,0),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(6,15),  exitedAt: ts(6,15,20),durationMinutes: 20 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(6,15,20),exitedAt: ts(6,18,30),durationMinutes: 190 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(6,18,30),exitedAt: ts(6,19,10),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(6,19,10),exitedAt: ts(6,22,0),durationMinutes: 170 },

  // ===== DAYS 7–9: increasing time outside bedroom =====
  // Day 7
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(7,7),   exitedAt: ts(7,8,15), durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(7,8,15),exitedAt: ts(7,8,45), durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(7,9),   exitedAt: ts(7,9,40), durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(7,10),  exitedAt: ts(7,11,15),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'corridor',        enteredAt: ts(7,11,15),exitedAt: ts(7,11,25),durationMinutes: 10 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(7,11,25),exitedAt: ts(7,11,50),durationMinutes: 25 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(7,11,50),exitedAt: ts(7,12,30),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(7,12,30),exitedAt: ts(7,13,10),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(7,13,10),exitedAt: ts(7,14,0),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(7,14),  exitedAt: ts(7,15,30),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(7,15,30),exitedAt: ts(7,16,30),durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(7,16,30),exitedAt: ts(7,18,30),durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(7,18,30),exitedAt: ts(7,19,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(7,19,15),exitedAt: ts(7,22,0),durationMinutes: 165 },

  // Day 8
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(8,7),   exitedAt: ts(8,8,0),  durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(8,8),   exitedAt: ts(8,8,30), durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(8,9),   exitedAt: ts(8,9,45), durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(8,10),  exitedAt: ts(8,11,30),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'corridor',        enteredAt: ts(8,11,30),exitedAt: ts(8,11,45),durationMinutes: 15 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(8,11,45),exitedAt: ts(8,12,15),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(8,12,30),exitedAt: ts(8,13,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(8,13,15),exitedAt: ts(8,14,15),durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(8,14,15),exitedAt: ts(8,15,30),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(8,15,30),exitedAt: ts(8,16,45),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(8,17),  exitedAt: ts(8,17,40),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(8,17,40),exitedAt: ts(8,18,30),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(8,18,30),exitedAt: ts(8,19,20),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(8,19,20),exitedAt: ts(8,22,0),durationMinutes: 160 },

  // Day 9
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(9,7),   exitedAt: ts(9,7,50), durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(9,7,50),exitedAt: ts(9,8,20), durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(9,8,30),exitedAt: ts(9,9,15), durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(9,9,30),exitedAt: ts(9,11,0), durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(9,11),  exitedAt: ts(9,11,30),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(9,11,30),exitedAt: ts(9,12,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(9,12,30),exitedAt: ts(9,13,20),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(9,14),  exitedAt: ts(9,14,30),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(9,15),  exitedAt: ts(9,16,15),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(9,16,30),exitedAt: ts(9,17,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(9,17,15),exitedAt: ts(9,18,30),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(9,18,30),exitedAt: ts(9,19,25),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(9,19,25),exitedAt: ts(9,22,0),durationMinutes: 155 },

  // ===== DAY 10: attends structured group =====
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(10,7),  exitedAt: ts(10,7,45),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(10,7,45),exitedAt: ts(10,8,15),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(10,8,30),exitedAt: ts(10,9,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(10,10), exitedAt: ts(10,11,30),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(10,11,45),exitedAt: ts(10,12,30),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(10,12,30),exitedAt: ts(10,13,20),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(10,13,20),exitedAt: ts(10,14,5),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(10,14,10),exitedAt: ts(10,14,40),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(10,15),  exitedAt: ts(10,15,45),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(10,16), exitedAt: ts(10,17,15),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(10,17,15),exitedAt: ts(10,18,30),durationMinutes: 75 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(10,18,30),exitedAt: ts(10,19,25),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(10,19,30),exitedAt: ts(10,20,15),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(10,20,15),exitedAt: ts(10,22,0),durationMinutes: 105 },

  // ===== DAYS 11–14: continued improvement, peer engagement remains low =====
  // Day 11
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(11,7),  exitedAt: ts(11,7,40),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(11,7,40),exitedAt: ts(11,8,10),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(11,8,15),exitedAt: ts(11,9,5),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(11,9,30),exitedAt: ts(11,11,0),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(11,11), exitedAt: ts(11,11,35),durationMinutes: 35 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(11,11,40),exitedAt: ts(11,12,20),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(11,12,30),exitedAt: ts(11,13,25),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(11,14), exitedAt: ts(11,14,50),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(11,15,30),exitedAt: ts(11,17,0),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(11,17,10),exitedAt: ts(11,18,0),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(11,18,15),exitedAt: ts(11,19,10),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(11,19,15),exitedAt: ts(11,22,0),durationMinutes: 165 },

  // Day 12
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(12,7),  exitedAt: ts(12,7,35),durationMinutes: 35 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(12,7,35),exitedAt: ts(12,8,5),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(12,8,10),exitedAt: ts(12,9,0),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(12,9,30),exitedAt: ts(12,11,15),durationMinutes: 105 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(12,11,20),exitedAt: ts(12,12,0),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(12,12,15),exitedAt: ts(12,13,10),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(12,13,15),exitedAt: ts(12,14,5),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(12,14,15),exitedAt: ts(12,15,10),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(12,15,30),exitedAt: ts(12,17,0),durationMinutes: 90 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(12,17,10),exitedAt: ts(12,18,0),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(12,18,15),exitedAt: ts(12,19,10),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(12,19,15),exitedAt: ts(12,22,0),durationMinutes: 165 },

  // Day 13
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(13,7),  exitedAt: ts(13,7,30),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(13,7,30),exitedAt: ts(13,8,0),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(13,8,5), exitedAt: ts(13,9,0),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(13,9,30),exitedAt: ts(13,11,30),durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(13,11,35),exitedAt: ts(13,12,10),durationMinutes: 35 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(13,12,15),exitedAt: ts(13,12,50),durationMinutes: 35 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(13,13), exitedAt: ts(13,13,55),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(13,14,10),exitedAt: ts(13,15,10),durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(13,15,30),exitedAt: ts(13,17,15),durationMinutes: 105 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(13,17,20),exitedAt: ts(13,18,10),durationMinutes: 50 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(13,18,15),exitedAt: ts(13,19,10),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(13,19,20),exitedAt: ts(13,22,0),durationMinutes: 160 },

  // Day 14
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(14,7),  exitedAt: ts(14,7,30),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'ensuite',         enteredAt: ts(14,7,30),exitedAt: ts(14,8,0),durationMinutes: 30 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(14,8,5), exitedAt: ts(14,9,5),durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(14,9,30),exitedAt: ts(14,11,30),durationMinutes: 120 },
  { patientId: 'PT-001', zoneId: 'nursing_station', enteredAt: ts(14,11,35),exitedAt: ts(14,12,15),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'communal',        enteredAt: ts(14,12,20),exitedAt: ts(14,13,0),durationMinutes: 40 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(14,13,5), exitedAt: ts(14,14,0),durationMinutes: 55 },
  { patientId: 'PT-001', zoneId: 'outdoor',         enteredAt: ts(14,14,15),exitedAt: ts(14,15,20),durationMinutes: 65 },
  { patientId: 'PT-001', zoneId: 'activity_room',   enteredAt: ts(14,15,30),exitedAt: ts(14,17,15),durationMinutes: 105 },
  { patientId: 'PT-001', zoneId: 'quiet_area',      enteredAt: ts(14,17,20),exitedAt: ts(14,18,5),durationMinutes: 45 },
  { patientId: 'PT-001', zoneId: 'dining',          enteredAt: ts(14,18,15),exitedAt: ts(14,19,15),durationMinutes: 60 },
  { patientId: 'PT-001', zoneId: 'bedroom',         enteredAt: ts(14,19,20),exitedAt: ts(14,22,0),durationMinutes: 160 },
]

// ------------------------------------------------------------------
// Interaction Events
// ------------------------------------------------------------------
export const INTERACTION_EVENTS = [
  // Days 1–4: sparse
  { patientId:'PT-001', timestamp: ts(1,12,5),  type:'staff',  target:'Nurse', note:'Brief medication check' },
  { patientId:'PT-001', timestamp: ts(2,12,5),  type:'staff',  target:'Nurse', note:'Handover contact' },
  { patientId:'PT-001', timestamp: ts(3,10,5),  type:'staff',  target:'Nurse', note:'Morning check-in' },
  { patientId:'PT-001', timestamp: ts(4,10,5),  type:'clinician', target:'Psychiatrist', note:'Psychiatric review — Day 4' },
  // Day 5: medication
  { patientId:'PT-001', timestamp: ts(5,9,10),  type:'clinician', target:'Psychiatrist', note:'Medication adjustment' },
  { patientId:'PT-001', timestamp: ts(5,9,20),  type:'staff',  target:'Nurse', note:'Post-medication handover' },
  // Day 6: OT starts
  { patientId:'PT-001', timestamp: ts(6,10,0),  type:'clinician', target:'OT', note:'OT initial session' },
  { patientId:'PT-001', timestamp: ts(6,15,0),  type:'staff',  target:'Nurse', note:'Nursing check — progress noted' },
  // Days 7–9
  { patientId:'PT-001', timestamp: ts(7,11,30), type:'staff',  target:'Nurse', note:'Observed in activity room' },
  { patientId:'PT-001', timestamp: ts(7,11,40), type:'peer',   target:'Fellow patient', note:'Brief exchange in corridor' },
  { patientId:'PT-001', timestamp: ts(8,11,50), type:'clinician', target:'Nurse', note:'Nursing review — engagement noted' },
  { patientId:'PT-001', timestamp: ts(8,13,20), type:'peer',   target:'Fellow patient', note:'Seated near peer in communal area' },
  { patientId:'PT-001', timestamp: ts(9,11,5),  type:'clinician', target:'OT', note:'OT session — activity engagement' },
  { patientId:'PT-001', timestamp: ts(9,11,35), type:'peer',   target:'Fellow patient', note:'Co-present in communal lounge' },
  // Day 10
  { patientId:'PT-001', timestamp: ts(10,10,0), type:'clinician', target:'OT', note:'Group session facilitated' },
  { patientId:'PT-001', timestamp: ts(10,14,15),type:'staff',  target:'Nurse', note:'Post-group feedback' },
  { patientId:'PT-001', timestamp: ts(10,19,30),type:'peer',   target:'Fellow patient', note:'Co-present communal area' },
  // Days 11–14: more staff, limited peer
  { patientId:'PT-001', timestamp: ts(11,11,0), type:'clinician', target:'Nurse', note:'MDT nursing update' },
  { patientId:'PT-001', timestamp: ts(11,11,40),type:'peer',   target:'Fellow patient', note:'Shared table at dining' },
  { patientId:'PT-001', timestamp: ts(12,11,25),type:'clinician', target:'Psychiatrist', note:'Psychiatrist review Day 12' },
  { patientId:'PT-001', timestamp: ts(12,14,0), type:'staff',  target:'Nurse', note:'Noted use of outdoor area' },
  { patientId:'PT-001', timestamp: ts(13,11,40),type:'clinician', target:'OT', note:'OT session — increasing participation' },
  { patientId:'PT-001', timestamp: ts(13,12,20),type:'peer',   target:'Fellow patient', note:'Brief exchange in communal area' },
  { patientId:'PT-001', timestamp: ts(14,11,40),type:'clinician', target:'Nurse', note:'MDT pre-brief update' },
  { patientId:'PT-001', timestamp: ts(14,14,20),type:'staff',  target:'Nurse', note:'Outdoor engagement noted' },
]

// ------------------------------------------------------------------
// Activity Events
// ------------------------------------------------------------------
export const ACTIVITY_EVENTS = [
  { patientId:'PT-001', timestamp: ts(6,10,0),  activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(7,10,0),  activityType:'Craft / art activity',  location:'activity_room', structured:false, attended:true },
  { patientId:'PT-001', timestamp: ts(7,15,30), activityType:'Craft / art activity',  location:'activity_room', structured:false, attended:true },
  { patientId:'PT-001', timestamp: ts(8,10,0),  activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(8,15,30), activityType:'Relaxation group',       location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(9,9,30),  activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(9,15,0),  activityType:'Ward walk / movement',  location:'outdoor',       structured:false, attended:true },
  { patientId:'PT-001', timestamp: ts(10,10,0), activityType:'Structured group therapy',location:'activity_room',structured:true, attended:true },
  { patientId:'PT-001', timestamp: ts(10,11,45),activityType:'Creative group',         location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(11,9,30), activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(11,15,30),activityType:'Structured group therapy',location:'activity_room',structured:true, attended:true },
  { patientId:'PT-001', timestamp: ts(12,9,30), activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(12,15,30),activityType:'Craft / art activity',  location:'activity_room', structured:false, attended:true },
  { patientId:'PT-001', timestamp: ts(13,9,30), activityType:'Structured group therapy',location:'activity_room',structured:true, attended:true },
  { patientId:'PT-001', timestamp: ts(13,15,30),activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
  { patientId:'PT-001', timestamp: ts(14,9,30), activityType:'Structured group therapy',location:'activity_room',structured:true, attended:true },
  { patientId:'PT-001', timestamp: ts(14,15,30),activityType:'Individual OT session', location:'activity_room', structured:true,  attended:true },
]

// ------------------------------------------------------------------
// Clinical Events
// ------------------------------------------------------------------
export const CLINICAL_EVENTS = [
  {
    patientId: 'PT-001',
    timestamp: ts(1,10,0),
    discipline: 'Psychiatry',
    eventType: 'psychiatrist_review',
    title: 'Admission psychiatric assessment',
    description: 'Initial assessment on admission. Patient presenting with significant withdrawal and reduced motivation. MDT plan initiated.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(1,18,0),
    discipline: 'Medication',
    eventType: 'medication_change',
    title: 'Risperidone initiated — 2 mg daily',
    description: 'De-identified record: risperidone 2 mg daily was initiated. Behaviour, tolerability and adverse effects were planned for clinical review.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(3,14,0),
    discipline: 'Nursing',
    eventType: 'nursing_intervention',
    title: 'Nursing behavioural observation plan',
    description: 'Nursing team initiated structured behavioural monitoring. Low activity noted across days 1–3.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(3,18,0),
    discipline: 'Medication',
    eventType: 'medication_change',
    title: 'Risperidone increased — 3 mg daily',
    description: 'De-identified titration record: risperidone increased from 2 mg to 3 mg daily following review. Location signals do not establish treatment response or tolerability.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(4,10,0),
    discipline: 'Psychiatry',
    eventType: 'psychiatrist_review',
    title: 'Psychiatrist review — Day 4',
    description: 'Review of presenting symptoms. Medication adjustment under consideration. Limited environmental engagement noted.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(5,9,15),
    discipline: 'Medication',
    eventType: 'medication_change',
    title: 'Risperidone increased — 4 mg daily',
    description: 'De-identified titration record: risperidone increased from 3 mg to 4 mg daily. Increased environmental and activity-room engagement appeared in subsequent days alongside OT behavioural activation; attribution to either intervention is not possible from these data.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(6,10,0),
    discipline: 'OT',
    eventType: 'ot_intervention',
    title: 'OT behavioural activation initiated — Day 6',
    description: 'Occupational therapist commenced graded behavioural activation programme. Initial individual session attended.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(8,11,50),
    discipline: 'Nursing',
    eventType: 'nursing_intervention',
    title: 'Nursing review — increased engagement noted',
    description: 'Nursing team noted patient spending more time outside bedroom. Engagement with activity room observed.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(9,11,5),
    discipline: 'OT',
    eventType: 'ot_intervention',
    title: 'OT session — activity participation strengthening',
    description: 'Patient participated in OT session and showed increased engagement with structured activities.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(10,10,0),
    discipline: 'OT',
    eventType: 'group_intervention',
    title: 'First structured group attendance — Day 10',
    description: 'Patient attended structured group for the first time. Participation observed as passive but present.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(11,11,0),
    discipline: 'Nursing',
    eventType: 'mdt_review',
    title: 'MDT nursing update — Day 11',
    description: 'MDT noted improved general activation. Peer interaction remains limited. Social participation flagged for review.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(12,11,30),
    discipline: 'Psychiatry',
    eventType: 'psychiatrist_review',
    title: 'Psychiatrist review — Day 12',
    description: 'Positive trajectory in activation noted. Social engagement remains an area of clinical attention.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(13,11,40),
    discipline: 'OT',
    eventType: 'ot_intervention',
    title: 'OT review — engagement consolidating',
    description: 'OT session confirmed sustained participation in structured activities. Graded social exposure discussed.',
  },
  {
    patientId: 'PT-001',
    timestamp: ts(14,9,0),
    discipline: 'MDT',
    eventType: 'mdt_review',
    title: 'MDT ward round — Day 14',
    description: 'Full MDT review. Overall activation trajectory positive. Peer interaction domain identified as focus for next phase.',
  },
]

const LAYOUT_ZONE_MAP = {
  bedroom: 'cubicle_1',
  ensuite: 'shower_2',
  communal: 'dining',
  outdoor: 'balcony',
  nursing_station: 'corridor',
  quiet_area: 'visitor_area',
}

// Later-period visits to another cubicle are location observations only.
// They may indicate possible social exposure but do not establish interaction.
const CUBICLE_VISITS = [
  { patientId: 'PT-001', zoneId: 'cubicle_2', enteredAt: ts(10,14,40), exitedAt: ts(10,14,52), durationMinutes: 12 },
  { patientId: 'PT-001', zoneId: 'cubicle_2', enteredAt: ts(11,13,30), exitedAt: ts(11,13,48), durationMinutes: 18 },
  { patientId: 'PT-001', zoneId: 'cubicle_3', enteredAt: ts(12,15,10), exitedAt: ts(12,15,28), durationMinutes: 18 },
  { patientId: 'PT-001', zoneId: 'cubicle_2', enteredAt: ts(13,15,12), exitedAt: ts(13,15,28), durationMinutes: 16 },
  { patientId: 'PT-001', zoneId: 'cubicle_3', enteredAt: ts(14,15,20), exitedAt: ts(14,15,30), durationMinutes: 10 },
]

const locationEvent = (patientId, zoneId, dayNumber, hour, minute, durationMinutes) => {
  const enteredAt = ts(dayNumber, hour, minute)
  const exitedAt = new Date(new Date(enteredAt).getTime() + durationMinutes * 60000).toISOString()
  return { patientId, zoneId, enteredAt, exitedAt, durationMinutes }
}

const generateOcdPersona = () => {
  const patientId = 'PT-002'
  const showerDurations = Array.from({ length: 90 }, (_, index) => {
    const dayNumber = index + 1
    if (dayNumber <= 21) return Math.round(78 + (dayNumber - 1) * 2.4)
    if (dayNumber <= 45) return Math.round(126 - (dayNumber - 21) * 1.05)
    if (dayNumber <= 70) return Math.round(101 - (dayNumber - 45) * 0.72)
    return Math.round(83 - (dayNumber - 70) * 0.45)
  })
  const locationEvents = []
  const activityEvents = []
  for (let d = 1; d <= 90; d++) {
    const shower = showerDurations[d - 1]
    const showerEndMinutes = 7 * 60 + 40 + shower
    locationEvents.push(
      locationEvent(patientId, 'cubicle_3', d, 7, 0, 35),
      locationEvent(patientId, 'shower_1', d, 7, 40, shower),
      locationEvent(patientId, 'corridor', d, Math.floor(showerEndMinutes / 60), showerEndMinutes % 60, 8),
      locationEvent(patientId, 'dining', d, 10, 0, d < 22 ? 20 : d < 46 ? 30 : 40),
      locationEvent(patientId, 'cubicle_3', d, 10, 40, 180),
      locationEvent(patientId, 'upper_toilet', d, 13, 45, 8),
      locationEvent(patientId, 'activity_room', d, 14, 0, d < 22 ? 20 : d < 46 ? 35 : 50),
      locationEvent(patientId, 'dining', d, 18, 15, 40),
      locationEvent(patientId, 'cubicle_3', d, 19, 0, 180),
    )
    if (d >= 22) activityEvents.push({ patientId, timestamp: ts(d, 14, 0), activityType: 'OT morning-routine intervention', location: 'activity_room', structured: true, attended: true })
  }
  const clinicalEvents = [
    { patientId, timestamp: ts(1, 11, 0), discipline: 'Psychiatry', eventType: 'psychiatrist_review', title: 'Admission assessment — OCD presentation', description: 'Assessment documented contamination-related concerns and extended washing rituals affecting ward routine.' },
    { patientId, timestamp: ts(1, 18, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Sertraline initiated — 50 mg mane', description: 'De-identified record: sertraline 50 mg each morning was initiated. This event is contextual and does not establish a medication effect.' },
    { patientId, timestamp: ts(3, 10, 30), discipline: 'Nursing', eventType: 'nursing_intervention', title: 'Prolonged morning shower occupancy documented', description: 'Morning shower occupancy exceeded 1h 30m and delayed breakfast attendance. Duration recorded as a behavioural signal; the content of the ritual was not inferred.' },
    { patientId, timestamp: ts(15, 9, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Sertraline increased — 100 mg mane', description: 'De-identified titration record: sertraline increased from 50 mg to 100 mg each morning following psychiatric review. Ongoing symptom, function and tolerability review was planned.' },
    { patientId, timestamp: ts(21, 11, 0), discipline: 'MDT', eventType: 'mdt_review', title: 'Day 21 MDT review — morning routine disruption', description: 'Repeated prolonged shower use was reviewed alongside reported distress and delayed morning participation.' },
    { patientId, timestamp: ts(22, 9, 30), discipline: 'OT', eventType: 'ot_intervention', title: 'Graded morning-routine plan initiated', description: 'OT and nursing introduced a collaborative, graded morning routine with patient agreement.' },
    { patientId, timestamp: ts(29, 9, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Sertraline increased — 150 mg mane', description: 'De-identified titration record: sertraline increased from 100 mg to 150 mg each morning. Shower-area duration remained elevated; behavioural data alone cannot determine symptom response.' },
    { patientId, timestamp: ts(43, 9, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Sertraline increased — 200 mg mane', description: 'De-identified titration record: sertraline increased from 150 mg to 200 mg each morning. A gradual reduction in shower-area duration followed across later weeks alongside the structured routine plan; causality is not established.' },
    { patientId, timestamp: ts(45, 11, 0), discipline: 'MDT', eventType: 'mdt_review', title: 'Day 45 routine review', description: 'Shower duration was reducing gradually, with morning participation beginning to improve.' },
    { patientId, timestamp: ts(70, 10, 30), discipline: 'OT', eventType: 'ot_intervention', title: 'Day 70 routine generalisation review', description: 'The patient reviewed strategies for maintaining the morning routine with less prompting.' },
    { patientId, timestamp: ts(90, 11, 0), discipline: 'MDT', eventType: 'mdt_review', title: 'Day 90 long-stay review', description: 'Shower duration was substantially below the Day 21 peak but remained a relevant functional pattern for discharge planning.' },
  ]
  return { locationEvents, activityEvents, clinicalEvents, interactionEvents: [] }
}

const generateHypomaniaPersona = () => {
  const patientId = 'PT-003'
  const socialRoamingDurations = [10, 20, 35, 60, 100, 150, 210, 180, 140, 100, 70, 50, 35, 25]
  const cubicleDurations = [260, 230, 200, 170, 140, 110, 90, 115, 145, 175, 205, 230, 250, 270]
  const locationEvents = []
  const activityEvents = []
  for (let d = 1; d <= 14; d++) {
    const roaming = socialRoamingDurations[d - 1]
    const home = cubicleDurations[d - 1]
    const cubicle2 = Math.round(roaming * 0.35)
    const cubicle1 = Math.round(roaming * 0.30)
    const cubicle3 = roaming - cubicle2 - cubicle1
    locationEvents.push(
      locationEvent(patientId, 'cubicle_4', d, 7, 0, Math.round(home * 0.35)),
      locationEvent(patientId, 'corridor', d, 8, 45, 30),
      locationEvent(patientId, 'upper_toilet', d, 9, 18, 7),
      locationEvent(patientId, 'dining', d, 9, 30, 30),
      locationEvent(patientId, 'cubicle_2', d, 10, 15, cubicle2),
      locationEvent(patientId, 'corridor', d, 11, 35, 30 + Math.min(d, 7) * 4),
      locationEvent(patientId, 'cubicle_1', d, 12, 45, cubicle1),
      locationEvent(patientId, 'balcony', d, 14, 0, d <= 7 ? 35 + d * 5 : Math.max(30, 70 - (d - 7) * 6)),
      locationEvent(patientId, 'visitor_area', d, 15, 15, d <= 7 ? 30 + d * 4 : Math.max(25, 58 - (d - 7) * 4)),
      locationEvent(patientId, 'cubicle_3', d, 16, 20, cubicle3),
      ...(d >= 8 ? [locationEvent(patientId, 'activity_room', d, 17, 45, 20)] : []),
      locationEvent(patientId, 'dining', d, 18, 30, 35),
      locationEvent(patientId, 'cubicle_4', d, 19, 15, Math.round(home * 0.65)),
    )
    if (d >= 8) activityEvents.push({ patientId, timestamp: ts(d, 17, 45), activityType: 'Brief structured activity', location: 'activity_room', structured: true, attended: true })
  }
  const clinicalEvents = [
    { patientId, timestamp: ts(1, 10, 0), discipline: 'Psychiatry', eventType: 'psychiatrist_review', title: 'Admission assessment — elevated activation', description: 'Elevated mood, increased goal-directed activity and reduced rest were documented at admission.' },
    { patientId, timestamp: ts(4, 14, 0), discipline: 'Nursing', eventType: 'nursing_intervention', title: 'Increasing social approach documented', description: 'Location pattern showed rapid movement through shared areas and neighbouring cubicles. The patient described actively seeking new friendships; location alone does not confirm the quality of interaction.' },
    { patientId, timestamp: ts(4, 18, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Quetiapine initiated — 100 mg/day in divided doses', description: 'De-identified record: quetiapine was initiated at a total of 100 mg/day in divided doses while roaming, neighbouring-cubicle presence and reduced overnight rest proxy were escalating.' },
    { patientId, timestamp: ts(5, 18, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Quetiapine increased — 200 mg/day in divided doses', description: 'De-identified titration record: total daily quetiapine increased from 100 mg to 200 mg. Behavioural signals remained elevated; location does not establish mental state, sleep or tolerability.' },
    { patientId, timestamp: ts(6, 18, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Quetiapine increased — 300 mg/day in divided doses', description: 'De-identified titration record: total daily quetiapine increased from 200 mg to 300 mg while neighbouring-cubicle presence continued toward its Day 7 peak.' },
    {
      patientId,
      timestamp: ts(6, 16, 50),
      discipline: 'Nursing',
      eventType: 'dav_episode',
      title: 'Nurse-documented DAV episode',
      description: 'During the peak activation period, nursing documentation recorded raised voice, verbal threats toward a peer and striking a cubicle door twice after a boundary was set. Staff used verbal de-escalation and offered a lower-stimulation area, which the patient accepted. No physical contact or injury was documented.',
      details: {
        observed: 'Raised voice, verbal threats toward a peer and struck a cubicle door twice.',
        context: 'Occurred after staff set a boundary about repeated entry into a neighbouring cubicle.',
        response: 'Nurses used verbal de-escalation, reduced stimulation and offered space away from the immediate situation.',
        outcome: 'The patient accepted the lower-stimulation area; no physical contact or injury was documented.',
      },
    },
    { patientId, timestamp: ts(7, 18, 0), discipline: 'Medication', eventType: 'medication_change', title: 'Quetiapine increased — 400 mg/day in divided doses', description: 'De-identified titration record: total daily quetiapine increased from 300 mg to 400 mg following psychiatric review. Neighbouring-cubicle presence and roaming reduced over subsequent days while overnight assigned-cubicle presence increased; this temporal sequence does not prove medication effect.' },
    { patientId, timestamp: ts(8, 10, 30), discipline: 'Nursing', eventType: 'nursing_review', title: 'Post-DAV nursing review', description: 'The patient reviewed the documented episode with nursing staff. No further DAV episode was documented during the following two days; this absence does not by itself establish sustained risk reduction.' },
    { patientId, timestamp: ts(9, 11, 0), discipline: 'Nursing', eventType: 'nursing_intervention', title: 'Social roaming beginning to settle', description: 'Visits to other cubicles and repeated movement across shared spaces began reducing while time in the assigned cubicle increased.' },
    { patientId, timestamp: ts(12, 10, 30), discipline: 'Psychiatry', eventType: 'psychiatrist_review', title: 'Post-titration review', description: 'Behavioural activation was closer to the early admission range. Temporal association noted; causality not established.' },
    { patientId, timestamp: ts(14, 11, 0), discipline: 'MDT', eventType: 'mdt_review', title: 'MDT review — improving after escalation', description: 'The MDT reviewed an escalation-and-recovery pattern across neighbouring-cubicle visits, shared-space roaming and rest-related location signals.' },
  ]
  return { locationEvents, activityEvents, clinicalEvents, interactionEvents: [] }
}

const GENERATED_PERSONAS = {
  'PT-002': generateOcdPersona(),
  'PT-003': generateHypomaniaPersona(),
}

const sleepLocationEvent = (patientId, zoneId, dayNumber, startMinutes, durationMinutes) => {
  const hour = Math.floor(startMinutes / 60)
  const minute = startMinutes % 60
  return { ...locationEvent(patientId, zoneId, dayNumber, hour, minute, durationMinutes), isSleepWindow: true }
}

const generateSleepWindowEvents = (patientId) => {
  const home = patientId === 'PT-001' ? 'cubicle_1' : patientId === 'PT-002' ? 'cubicle_3' : 'cubicle_4'
  const sleepMinutes = patientId === 'PT-003'
    ? [300, 270, 240, 210, 180, 150, 140, 200, 260, 310, 350, 380, 400, 410]
    : patientId === 'PT-002'
      ? Array.from({ length: 90 }, (_, index) => Math.min(405, 370 + Math.floor(index / 5) * 2))
      : Array(14).fill(400)
  const events = []
  for (let d = 1; d <= sleepMinutes.length; d++) {
    const asleep = sleepMinutes[d - 1]
    events.push(sleepLocationEvent(patientId, home, d, 0, asleep))
    const awake = 420 - asleep
    if (awake > 0) events.push(sleepLocationEvent(patientId, 'corridor', d, asleep, awake))
  }
  return events
}

export const getEventsForPatient = (patientId) => ({
  locationEvents: [
    ...LOCATION_EVENTS
      .filter(e => e.patientId === patientId)
      .map(e => ({ ...e, zoneId: LAYOUT_ZONE_MAP[e.zoneId] || e.zoneId })),
    ...CUBICLE_VISITS.filter(e => e.patientId === patientId),
    ...(GENERATED_PERSONAS[patientId]?.locationEvents || []),
    ...generateSleepWindowEvents(patientId),
  ],
  interactionEvents: [...INTERACTION_EVENTS.filter(e => e.patientId === patientId), ...(GENERATED_PERSONAS[patientId]?.interactionEvents || [])],
  activityEvents: [...ACTIVITY_EVENTS.filter(e => e.patientId === patientId), ...(GENERATED_PERSONAS[patientId]?.activityEvents || [])],
  clinicalEvents: [...CLINICAL_EVENTS.filter(e => e.patientId === patientId), ...(GENERATED_PERSONAS[patientId]?.clinicalEvents || [])],
})
