"""SQLite persistence for raw scans and Psych-MAP presence sessions."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from rfid_app.contract import (
    DEFAULT_SCANNER_ID,
    SCHEMA_VERSION,
    TAG_IDENTITIES,
    TIME_PRECISION,
    TIME_ZONE_NAME,
    deterministic_duration,
    exact_utc_iso,
    local_minute_24h,
    parse_utc,
)


@dataclass
class ScanRecord:
    tag: str
    source: str
    scanned_at: str


class ScanStore:
    def __init__(self, db_path: str = "rfid_scans.db") -> None:
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tag TEXT NOT NULL,
                    source TEXT NOT NULL,
                    scanned_at TEXT NOT NULL
                )
                """
            )

    def log_tag(
        self, tag: str, source: str, scanned_at: Optional[datetime] = None
    ) -> None:
        timestamp = exact_utc_iso(scanned_at or datetime.now(timezone.utc))
        with closing(self._connect()) as conn, conn:
            conn.execute(
                "INSERT INTO scans (tag, source, scanned_at) VALUES (?, ?, ?)",
                (tag, source, timestamp),
            )

    def recent(self, limit: int = 20) -> List[ScanRecord]:
        with closing(self._connect()) as conn, conn:
            rows = conn.execute(
                "SELECT tag, source, scanned_at FROM scans ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [ScanRecord(*row) for row in rows]


class PresenceStore:
    """Migrates and persists audit-quality venue presence sessions."""

    def __init__(self, db_path: str = "rfid_scans.db") -> None:
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS presence_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tag TEXT NOT NULL,
                    name TEXT NOT NULL,
                    room TEXT NOT NULL,
                    entered_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    left_at TEXT,
                    read_count INTEGER NOT NULL DEFAULT 1,
                    scanner_id TEXT NOT NULL DEFAULT 'yrm100-usb-01',
                    venue_id TEXT NOT NULL DEFAULT 'corridor',
                    venue_label TEXT NOT NULL DEFAULT 'Corridor',
                    subject_id TEXT,
                    exit_inferred INTEGER NOT NULL DEFAULT 0,
                    closed_reason TEXT
                )
                """
            )
            self._migrate_presence_sessions(conn)
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_presence_entered "
                "ON presence_sessions(entered_at DESC)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scanner_state (
                    scanner_id TEXT PRIMARY KEY,
                    venue_id TEXT NOT NULL,
                    venue_label TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def _migrate_presence_sessions(self, conn: sqlite3.Connection) -> None:
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(presence_sessions)")}
        additions = {
            "scanner_id": "TEXT NOT NULL DEFAULT 'yrm100-usb-01'",
            "venue_id": "TEXT NOT NULL DEFAULT 'living_room'",
            "venue_label": "TEXT NOT NULL DEFAULT 'Living room (legacy simulator)'",
            "subject_id": "TEXT",
            "exit_inferred": "INTEGER NOT NULL DEFAULT 0",
            "closed_reason": "TEXT",
        }
        for name, definition in additions.items():
            if name not in columns:
                conn.execute(f"ALTER TABLE presence_sessions ADD COLUMN {name} {definition}")

        for tag, identity in TAG_IDENTITIES.items():
            conn.execute(
                "UPDATE presence_sessions SET subject_id = ? "
                "WHERE tag = ? AND subject_id IS NULL",
                (identity["subject_id"], tag),
            )
        conn.execute(
            """
            UPDATE presence_sessions
            SET exit_inferred = 1,
                closed_reason = COALESCE(closed_reason, 'signal_lost')
            WHERE left_at IS NOT NULL
            """
        )

    def open_session(
        self,
        tag: str,
        name: str,
        subject_id: Optional[str],
        scanner_id: str,
        venue_id: str,
        venue_label: str,
        entered_at: datetime,
    ) -> int:
        timestamp = exact_utc_iso(entered_at)
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute(
                """
                INSERT INTO presence_sessions
                    (tag, name, room, entered_at, last_seen_at, read_count,
                     scanner_id, venue_id, venue_label, subject_id,
                     exit_inferred, closed_reason)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0, NULL)
                """,
                (
                    tag,
                    name,
                    venue_label,
                    timestamp,
                    timestamp,
                    scanner_id,
                    venue_id,
                    venue_label,
                    subject_id,
                ),
            )
            return int(cursor.lastrowid)

    def touch_session(
        self, session_id: int, last_seen_at: datetime, read_count: int
    ) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute(
                "UPDATE presence_sessions SET last_seen_at = ?, read_count = ? WHERE id = ?",
                (exact_utc_iso(last_seen_at), read_count, session_id),
            )

    def close_session(
        self,
        session_id: int,
        last_seen_at: datetime,
        exited_at: datetime,
        read_count: int,
        exit_inferred: bool,
        closed_reason: str,
    ) -> None:
        if closed_reason not in {"signal_lost", "scanner_relocated", "service_stopped"}:
            raise ValueError("invalid closed_reason")
        with closing(self._connect()) as conn, conn:
            conn.execute(
                """
                UPDATE presence_sessions
                SET last_seen_at = ?, left_at = ?, read_count = ?,
                    exit_inferred = ?, closed_reason = ?
                WHERE id = ?
                """,
                (
                    exact_utc_iso(last_seen_at),
                    exact_utc_iso(exited_at),
                    read_count,
                    int(exit_inferred),
                    closed_reason,
                    session_id,
                ),
            )

    def close_stale_sessions(
        self, leave_after_seconds: float, scanner_id: str = DEFAULT_SCANNER_ID
    ) -> None:
        """Resolve sessions left open by an interrupted prior process."""
        with closing(self._connect()) as conn, conn:
            rows = conn.execute(
                "SELECT id, last_seen_at FROM presence_sessions "
                "WHERE left_at IS NULL AND scanner_id = ?",
                (scanner_id,),
            ).fetchall()
            for row in rows:
                last_seen = parse_utc(row["last_seen_at"])
                inferred_exit = last_seen + timedelta(seconds=leave_after_seconds)
                conn.execute(
                    """
                    UPDATE presence_sessions
                    SET left_at = ?, exit_inferred = 1, closed_reason = 'service_stopped'
                    WHERE id = ?
                    """,
                    (exact_utc_iso(inferred_exit), row["id"]),
                )

    def set_scanner_venue(
        self, scanner_id: str, venue_id: str, venue_label: str, at: Optional[datetime] = None
    ) -> None:
        timestamp = exact_utc_iso(at or datetime.now(timezone.utc))
        with closing(self._connect()) as conn, conn:
            conn.execute(
                """
                INSERT INTO scanner_state (scanner_id, venue_id, venue_label, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(scanner_id) DO UPDATE SET
                    venue_id = excluded.venue_id,
                    venue_label = excluded.venue_label,
                    updated_at = excluded.updated_at
                """,
                (scanner_id, venue_id, venue_label, timestamp),
            )

    def scanner_venue(self, scanner_id: str) -> Optional[dict]:
        with closing(self._connect()) as conn, conn:
            row = conn.execute(
                "SELECT venue_id, venue_label, updated_at FROM scanner_state WHERE scanner_id = ?",
                (scanner_id,),
            ).fetchone()
        return dict(row) if row else None

    def recent_sessions(self, limit: int = 50) -> list[dict]:
        """Legacy raw records retained for local diagnostics and migration tests."""
        with closing(self._connect()) as conn, conn:
            rows = conn.execute(
                "SELECT * FROM presence_sessions ORDER BY entered_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def contract_sessions(
        self, limit: int = 50, include_legacy_venue: bool = True
    ) -> list[dict]:
        if include_legacy_venue:
            rows = self.recent_sessions(limit)
        else:
            with closing(self._connect()) as conn, conn:
                result = conn.execute(
                    "SELECT * FROM presence_sessions "
                    "WHERE venue_id != 'living_room' "
                    "ORDER BY entered_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            rows = [dict(row) for row in result]
        return [self._to_contract(row) for row in rows]

    @staticmethod
    def _to_contract(row: dict) -> dict:
        exited_at = row["left_at"]
        duration_seconds, duration_minutes = deterministic_duration(
            row["entered_at"], exited_at
        )
        status = "closed" if exited_at is not None else "active"
        return {
            "schema_version": SCHEMA_VERSION,
            "event_id": f"rfid-session-{row['id']}",
            "subject_id": row["subject_id"],
            "tag_id": row["tag"],
            "scanner_id": row["scanner_id"],
            "venue_id": row["venue_id"],
            "venue_label": row["venue_label"],
            "time_zone": TIME_ZONE_NAME,
            "time_precision": TIME_PRECISION,
            "entered_at_utc": exact_utc_iso(parse_utc(row["entered_at"])),
            "entered_at_local_24h": local_minute_24h(row["entered_at"]),
            "last_seen_at_utc": exact_utc_iso(parse_utc(row["last_seen_at"])),
            "last_seen_at_local_24h": local_minute_24h(row["last_seen_at"]),
            "exited_at_utc": exact_utc_iso(parse_utc(exited_at)) if exited_at else None,
            "exited_at_local_24h": local_minute_24h(exited_at) if exited_at else None,
            "duration_seconds": duration_seconds,
            "duration_minutes_rounded": duration_minutes,
            "read_count": row["read_count"],
            "status": status,
            "exit_inferred": bool(row["exit_inferred"]),
            "closed_reason": row["closed_reason"] if status == "closed" else None,
        }
