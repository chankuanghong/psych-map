# RFID → Psych-MAP data contract

The scanner emits **presence sessions**, not a guessed activity or an RSSI-derived distance. Exact UTC timestamps remain the audit source. Model-facing timestamps are a deterministic minute bucket in `Asia/Singapore`, formatted as `YYYY-MM-DD HH:mm` using a zero-padded 24-hour clock.

- Seconds are floored, never rounded into the future.
- Durations are calculated from exact UTC timestamps, then rounded to a whole minute for display.
- `venue_id` must use the Psych-MAP map identifier: `cubicle_1`, `cubicle_2`, `cubicle_3`, `cubicle_4`, `corridor`, `activity_room`, `balcony`, `dining`, `visitor_area`, `upper_toilet`, `lower_toilet`, `shower_1`, `shower_2`, or `shower_3`. Historical imports may retain the old `living_room` value for audit fidelity, but it is not selectable, mapped, or used as the scanner default.
- A venue switch closes active sessions with `closed_reason: scanner_relocated`. New reads open sessions at the newly selected venue.
- `subject_id` is assigned through an explicit tag-to-patient mapping. It must never be inferred from a name.
- Psych-MAP still applies its selected-patient/folder gate before any session enters an evidence snapshot.

See `rfid-presence.v1.schema.json` for the wire format.
