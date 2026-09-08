# RFID Scanner App

This project provides a local RFID scanner CLI that:

- Reads tags from keyboard wedge scanners, generic serial scanners, and YRM100 UHF readers
- Auto-detects YRM100-style USB serial ports when possible
- Logs every scan to a SQLite database

It also includes a browser dashboard that records entry, inferred departure,
scanner relocation, and re-entry sessions. Its `/api/history` output follows the
`psychmap.rfid.presence.v1` contract.

## Psych-MAP presence dashboard

Run the local dashboard:

```bash
python3 dashboard.py --port /dev/cu.usbserial-0001
```

Then open <http://127.0.0.1:8765>. Use the accessible map or venue selector to
relocate the one physical scanner among the allowlisted Psych-MAP venues.
A relocation closes all active sessions with `scanner_relocated`; subsequent tag
reads create sessions at the new venue. By default a tag is marked away five
seconds after its last successful read; change this with `--leave-after`, for
example `--leave-after 10`.

The explicit demo identities are:

- Person 1 (`D00000000000000000000001`) → subject `PT-003`
- Person 2 (`D00000000000000000000002`) → subject `PT-001`
- Every other EPC → `subject_id: null`

Audit timestamps remain exact UTC values in SQLite. Contract and display values
include Singapore-time minute buckets formatted as `YYYY-MM-DD HH:mm`; seconds
are floored rather than rounded forward. RSSI is never converted into distance.
Continuous reads are aggregated into one visit row. The active row is checkpointed
every five minutes by default and is written immediately when the tag departs, the
scanner moves, or the service stops. Change the checkpoint with `--sync-every 300`.

By default the dashboard writes to `../data/psych-map.sqlite`, the
same database used by the integrated Psych-MAP clinical and question views.
Set `PSYCHMAP_DB` or pass `--db` to override it. See the root README for setup and
the ignored `RFID_TAG_MAP` file used to map your own tags privately.

The workspace-level `Launch Psych-MAP Demo.command` starts this dashboard automatically. It uses `--allow-missing-reader`, which keeps the page and background worker available while retrying YRM100 auto-detection if the reader is temporarily unplugged. Set `RFID_PORT=/dev/cu...` before launching if more than one compatible device is connected.

Useful endpoints:

- `GET /api/status` — current venue, allowlist, reader state and live tags
- `GET /api/history` — ward-only `psychmap.rfid.presence.v1` session records
- `GET /api/history/legacy` — raw legacy-compatible local rows, including old living-room tests
- `POST /api/venue` — strict JSON body such as `{"venue_id":"cubicle_1"}`

The last valid ward venue is persisted for the stable scanner ID
`yrm100-usb-01`; a fresh or legacy configuration starts in `corridor`. Override
the initial selection with `--venue cubicle_1` or the scanner identity with
`--scanner-id <id>`.

## Requirements

- Python 3.9+
- Optional: `pyserial` (the app has a built-in macOS/Linux serial fallback)

## Quick Start (YRM100)

Optional dependency install (if you prefer pyserial):

```bash
python3 -m pip install pyserial
```

List ports:

```bash
python3 run.py --list-ports
```

Probe module (checks protocol/connection):

```bash
python3 run.py --mode yrm100 --port /dev/cu.SLAB_USBtoUART --probe
```

Start scanning and logging:

```bash
python3 run.py --mode yrm100 --port /dev/cu.SLAB_USBtoUART --baud 115200
```

Only show/log new scans (ignore duplicate EPC reads for 2 seconds):

```bash
python3 run.py --mode yrm100 --port /dev/cu.SLAB_USBtoUART --new-only --dedupe-seconds 2
```

## Other Modes

Auto mode:

```bash
python3 run.py
```

Force keyboard mode:

```bash
python3 run.py --mode keyboard
```

Force serial mode:

```bash
python3 run.py --mode serial --port /dev/tty.usbserial-0001 --baud 9600
```

Use a custom database path:

```bash
python3 run.py --db ./data/rfid_scans.db
```

## Test

```bash
python3 -m unittest discover -s tests -v
```
