import http.client
import json
import tempfile
import threading
import unittest
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path

from dashboard import build_handler
from rfid_app.presence import PresenceTracker
from rfid_app.storage import PresenceStore


class FakeService:
    def status(self):
        return {"connected": True, "error": None, "last_read_at": None}


class TestVenueEndpoint(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = PresenceStore(str(Path(self.temp_dir.name) / "dashboard.db"))
        self.tracker = PresenceTracker(
            self.store,
            tag_names={"TAG-1": "Person 1"},
            tag_subject_ids={"TAG-1": "PT-003"},
            leave_after_seconds=5,
        )
        self.tracker.observe(
            "TAG-1", datetime(2026, 9, 4, 0, 0, tzinfo=timezone.utc)
        )
        handler = build_handler(self.tracker, FakeService(), self.store)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request(self, body, content_type="application/json"):
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=2)
        headers = {"Content-Type": content_type}
        connection.request("POST", "/api/venue", body=body, headers=headers)
        response = connection.getresponse()
        payload = json.loads(response.read())
        connection.close()
        return response.status, payload

    def get(self, path):
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=2)
        connection.request("GET", path)
        response = connection.getresponse()
        payload = json.loads(response.read())
        connection.close()
        return response.status, payload

    def test_valid_relocation_closes_active_session(self):
        status, payload = self.request(json.dumps({"venue_id": "activity_room"}))
        self.assertEqual(status, 200)
        self.assertEqual(payload["venue"]["venue_id"], "activity_room")
        self.assertEqual(payload["closed_sessions"], 1)
        row = self.store.recent_sessions()[0]
        self.assertEqual(row["closed_reason"], "scanner_relocated")
        self.assertEqual(row["left_at"], payload["relocated_at_utc"])

    def test_rejects_unknown_venue_and_extra_fields(self):
        status, payload = self.request(json.dumps({"venue_id": "bedroom_guess"}))
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"], "unsupported_venue_id")
        status, payload = self.request(
            json.dumps({"venue_id": "corridor", "rss_distance": 2.5})
        )
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"], "body_must_contain_only_venue_id")

    def test_rejects_non_json_content_type(self):
        status, payload = self.request("venue_id=corridor", "application/x-www-form-urlencoded")
        self.assertEqual(status, 415)
        self.assertEqual(payload["error"], "content_type_must_be_application_json")

    def test_history_endpoint_returns_only_contract_fields(self):
        status, payload = self.get("/api/history")
        self.assertEqual(status, 200)
        record = payload["sessions"][0]
        schema_path = (
            Path(__file__).resolve().parents[2]
            / "contracts"
            / "rfid-presence.v1.schema.json"
        )
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertEqual(set(record), set(schema["properties"]))
        self.assertEqual(record["subject_id"], "PT-003")

    def test_active_venue_list_and_history_exclude_legacy_living_room(self):
        self.store.open_session(
            tag="LEGACY-TAG",
            name="Legacy test",
            subject_id=None,
            scanner_id="yrm100-usb-01",
            venue_id="living_room",
            venue_label="Living room (legacy simulator)",
            entered_at=datetime(2026, 9, 4, 0, 1, tzinfo=timezone.utc),
        )

        status, status_payload = self.get("/api/status")
        self.assertEqual(status, 200)
        self.assertEqual(status_payload["venue"]["venue_id"], "corridor")
        self.assertNotIn(
            "living_room",
            {venue["venue_id"] for venue in status_payload["venues"]},
        )

        status, history_payload = self.get("/api/history")
        self.assertEqual(status, 200)
        self.assertNotIn(
            "living_room",
            {session["venue_id"] for session in history_payload["sessions"]},
        )
        status, legacy_payload = self.get("/api/history/legacy")
        self.assertEqual(status, 200)
        self.assertIn(
            "living_room",
            {session["venue_id"] for session in legacy_payload["sessions"]},
        )


if __name__ == "__main__":
    unittest.main()
