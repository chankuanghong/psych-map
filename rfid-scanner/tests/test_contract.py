import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from rfid_app.contract import deterministic_duration, local_minute_24h
from rfid_app.storage import PresenceStore


CONTRACT_SCHEMA = (
    Path(__file__).resolve().parents[2]
    / "contracts"
    / "rfid-presence.v1.schema.json"
)


class TestContractFormatting(unittest.TestCase):
    def test_singapore_24_hour_minute_is_floored_not_rounded(self):
        instant = datetime(2026, 9, 4, 15, 59, 59, 999999, tzinfo=timezone.utc)
        self.assertEqual(local_minute_24h(instant), "2026-09-04 23:59")
        midnight = datetime(2026, 9, 4, 16, 0, 1, tzinfo=timezone.utc)
        self.assertEqual(local_minute_24h(midnight), "2026-09-05 00:00")

    def test_duration_uses_exact_instants_and_half_up_minute_rounding(self):
        start = "2026-09-04T00:00:00.250000+00:00"
        self.assertEqual(
            deterministic_duration(start, "2026-09-04T00:01:30.249999+00:00"),
            (89, 1),
        )
        self.assertEqual(
            deterministic_duration(start, "2026-09-04T00:01:30.250000+00:00"),
            (90, 2),
        )


class TestPresenceMigrationAndWireContract(unittest.TestCase):
    def test_legacy_table_is_migrated_without_losing_session(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = str(Path(temp_dir) / "legacy.db")
            entered = "2026-08-29T08:00:56+00:00"
            with closing(sqlite3.connect(db_path)) as conn, conn:
                conn.execute(
                    """
                    CREATE TABLE presence_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tag TEXT NOT NULL,
                        name TEXT NOT NULL,
                        room TEXT NOT NULL,
                        entered_at TEXT NOT NULL,
                        last_seen_at TEXT NOT NULL,
                        left_at TEXT,
                        read_count INTEGER NOT NULL DEFAULT 1
                    )
                    """
                )
                conn.execute(
                    """
                    INSERT INTO presence_sessions
                        (tag, name, room, entered_at, last_seen_at, left_at, read_count)
                    VALUES (?, 'Person 1', 'Living room', ?, ?, ?, 7)
                    """,
                    (
                        "D00000000000000000000001",
                        entered,
                        "2026-08-29T08:01:30+00:00",
                        "2026-08-29T08:01:35+00:00",
                    ),
                )

            store = PresenceStore(db_path)
            row = store.recent_sessions()[0]
            self.assertEqual(row["id"], 1)
            self.assertEqual(row["entered_at"], entered)
            self.assertEqual(row["scanner_id"], "yrm100-usb-01")
            self.assertEqual(row["venue_id"], "living_room")
            self.assertEqual(row["subject_id"], "PT-003")
            self.assertEqual(row["exit_inferred"], 1)
            self.assertEqual(row["closed_reason"], "signal_lost")

            record = store.contract_sessions()[0]
            schema = json.loads(CONTRACT_SCHEMA.read_text(encoding="utf-8"))
            self.assertEqual(set(record), set(schema["properties"]))
            self.assertTrue(set(schema["required"]).issubset(record))
            self.assertEqual(record["schema_version"], "psychmap.rfid.presence.v1")
            self.assertEqual(record["subject_id"], "PT-003")
            self.assertEqual(record["entered_at_local_24h"], "2026-08-29 16:00")


if __name__ == "__main__":
    unittest.main()
