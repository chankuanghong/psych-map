import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from rfid_app.presence import PresenceTracker
from rfid_app.storage import PresenceStore


class TestPresenceTracker(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.temp_dir.name) / "presence.db")
        self.store = PresenceStore(self.db_path)
        self.tracker = PresenceTracker(
            self.store,
            tag_names={"TAG-1": "Person 1", "TAG-2": "Person 2"},
            leave_after_seconds=5,
        )
        self.start = datetime(2026, 8, 29, 10, 0, tzinfo=timezone.utc)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_enter_repeat_leave_and_reenter_create_two_sessions(self):
        event = self.tracker.observe("tag-1", self.start)
        self.assertEqual(event["type"], "entered")

        self.tracker.observe("TAG-1", self.start + timedelta(seconds=2))
        self.assertEqual(len(self.store.recent_sessions()), 1)
        self.assertTrue(self.tracker.snapshot(self.start + timedelta(seconds=3))[0]["present"])

        self.assertEqual(self.tracker.expire(self.start + timedelta(seconds=6)), [])
        leave_events = self.tracker.expire(self.start + timedelta(seconds=7))
        self.assertEqual(leave_events[0]["type"], "left")
        self.assertEqual(leave_events[0]["at"], "2026-08-29T10:00:07.000000+00:00")

        reentry = self.tracker.observe("TAG-1", self.start + timedelta(seconds=12))
        self.assertEqual(reentry["type"], "entered")
        sessions = self.store.recent_sessions()
        self.assertEqual(len(sessions), 2)
        self.assertIsNone(sessions[0]["left_at"])
        self.assertEqual(sessions[1]["left_at"], "2026-08-29T10:00:07.000000+00:00")

    def test_relocation_closes_active_and_reentry_uses_new_venue(self):
        self.tracker.observe("TAG-1", self.start)
        relocated_at = self.start + timedelta(seconds=3, microseconds=456789)

        events = self.tracker.relocate("cubicle_2", relocated_at)
        self.assertEqual(len(events), 1)
        self.assertEqual(self.tracker.current_venue()["venue_id"], "cubicle_2")
        closed = self.store.recent_sessions()[0]
        self.assertEqual(closed["left_at"], "2026-08-29T10:00:03.456789+00:00")
        self.assertEqual(closed["closed_reason"], "scanner_relocated")
        self.assertEqual(closed["exit_inferred"], 0)

        self.tracker.observe("TAG-1", self.start + timedelta(seconds=5))
        sessions = self.store.recent_sessions()
        self.assertEqual(len(sessions), 2)
        self.assertEqual(sessions[0]["venue_id"], "cubicle_2")
        self.assertIsNone(sessions[0]["left_at"])
        self.assertEqual(sessions[1]["venue_id"], "corridor")

    def test_demo_flow_signal_loss_relocation_then_reentry(self):
        self.tracker.observe("TAG-2", self.start)
        self.tracker.expire(self.start + timedelta(seconds=5))
        self.tracker.relocate("activity_room", self.start + timedelta(seconds=8))
        self.tracker.observe("TAG-2", self.start + timedelta(seconds=10))

        sessions = self.store.recent_sessions()
        self.assertEqual(sessions[0]["venue_id"], "activity_room")
        self.assertIsNone(sessions[0]["left_at"])
        self.assertEqual(sessions[1]["venue_id"], "corridor")
        self.assertEqual(sessions[1]["closed_reason"], "signal_lost")
        self.assertEqual(sessions[1]["exit_inferred"], 1)

    def test_unassigned_tag_is_visible(self):
        self.tracker.observe("unexpected-epc", self.start)
        snapshot = self.tracker.snapshot(self.start)
        unknown = next(item for item in snapshot if item["tag"] == "UNEXPECTED-EPC")
        self.assertEqual(unknown["name"], "Unassigned tag")
        self.assertFalse(unknown["assigned"])
        self.assertTrue(unknown["present"])

    def test_known_people_are_shown_while_away(self):
        snapshot = self.tracker.snapshot(self.start)
        self.assertEqual([item["name"] for item in snapshot], ["Person 1", "Person 2"])
        self.assertFalse(any(item["present"] for item in snapshot))

    def test_rejects_invalid_leave_threshold(self):
        with self.assertRaises(ValueError):
            PresenceTracker(self.store, leave_after_seconds=0)

    def test_rejects_invalid_persistence_interval(self):
        with self.assertRaises(ValueError):
            PresenceTracker(self.store, persist_interval_seconds=0)

    def test_fifty_minute_stay_is_one_row_with_five_minute_checkpoints(self):
        checkpoint_calls = []
        original_touch_session = self.store.touch_session

        def track_checkpoint(*args, **kwargs):
            checkpoint_calls.append((args, kwargs))
            return original_touch_session(*args, **kwargs)

        self.store.touch_session = track_checkpoint
        self.tracker.observe("TAG-1", self.start)
        for minute in range(1, 51):
            self.tracker.observe("TAG-1", self.start + timedelta(minutes=minute))

        sessions = self.store.recent_sessions()
        self.assertEqual(len(sessions), 1)
        self.assertEqual(len(checkpoint_calls), 10)
        self.assertEqual(sessions[0]["read_count"], 51)
        self.assertEqual(
            sessions[0]["last_seen_at"], "2026-08-29T10:50:00.000000+00:00"
        )

    def test_rejects_unallowlisted_venue(self):
        with self.assertRaises(ValueError):
            self.tracker.relocate("bedroom_guess", self.start)


if __name__ == "__main__":
    unittest.main()
