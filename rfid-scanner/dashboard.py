"""Run the local Psych-MAP RFID venue-presence dashboard."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import signal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from rfid_app.contract import (
    DEFAULT_SCANNER_ID,
    DEFAULT_VENUE_ID,
    VENUES,
    exact_utc_iso,
    local_minute_24h,
    require_venue,
)
from rfid_app.presence import PresenceTracker, utc_now
from rfid_app.scanner import YRM100TagSource, detect_yrm100_candidate_ports
from rfid_app.service import PresenceService
from rfid_app.storage import PresenceStore


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "rfid_app" / "static"
MAX_JSON_BODY = 4096
DEFAULT_SHARED_DB = Path(os.environ.get("PSYCHMAP_DB", ROOT.parent / "data" / "psych-map.sqlite"))


def choose_port(explicit_port: str | None) -> str:
    if explicit_port:
        return explicit_port
    candidates = detect_yrm100_candidate_ports()
    preferred = [port for port in candidates if "/cu." in port]
    choices = preferred or candidates
    if len(choices) == 1:
        return choices[0]
    if not choices:
        raise RuntimeError("No YRM100 USB serial port detected. Connect the reader or pass --port.")
    raise RuntimeError(f"Multiple reader ports found: {', '.join(choices)}. Pass --port.")


def status_payload(
    tracker: PresenceTracker, service: PresenceService, store: PresenceStore | None = None
) -> dict:
    now = utc_now()
    reader = service.status()
    last_read = reader.get("last_read_at")
    reader["last_read_at_utc"] = last_read
    reader["last_read_at_local_24h"] = local_minute_24h(last_read) if last_read else None
    payload = {
        "reader": reader,
        "scanner_id": tracker.scanner_id,
        "venue": tracker.current_venue(),
        "venues": [
            {"venue_id": venue_id, "venue_label": label}
            for venue_id, label in VENUES.items()
        ],
        "room": tracker.room,
        "leave_after_seconds": tracker.leave_after.total_seconds(),
        "persistence_interval_seconds": tracker.persist_interval.total_seconds(),
        "generated_at_utc": exact_utc_iso(now),
        "generated_at_local_24h": local_minute_24h(now),
        "people": tracker.snapshot(now),
    }
    if store is not None:
        payload["database"] = {"path": str(Path(store.db_path).resolve())}
    return payload


def build_handler(tracker: PresenceTracker, service: PresenceService, store: PresenceStore):
    class DashboardHandler(BaseHTTPRequestHandler):
        server_version = "PsychMapRFID/1.0"

        def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            path = urlparse(self.path).path
            if path == "/api/status":
                self._send_json(status_payload(tracker, service, store))
                return
            if path == "/api/history":
                # Every record conforms exactly to psychmap.rfid.presence.v1.
                self._send_json(
                    {
                        "sessions": store.contract_sessions(
                            50, include_legacy_venue=False
                        )
                    }
                )
                return
            if path == "/api/history/legacy":
                self._send_json({"sessions": store.recent_sessions(50)})
                return
            if path in {"/", "/index.html"}:
                html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
                floorplan = (STATIC_DIR / "floorplan.svg").read_text(encoding="utf-8")
                self._send_bytes(
                    html.replace("{{FLOORPLAN_SVG}}", floorplan).encode(),
                    "text/html; charset=utf-8",
                )
                return
            if path.startswith("/static/"):
                file_name = path.removeprefix("/static/")
                if "/" in file_name or ".." in file_name:
                    self.send_error(404)
                    return
                file_path = STATIC_DIR / file_name
                if file_path.is_file():
                    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
                    self._send_bytes(file_path.read_bytes(), content_type)
                    return
            self._send_json({"error": "not_found"}, status=404)

        def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            if urlparse(self.path).path != "/api/venue":
                self._send_json({"error": "not_found"}, status=404)
                return
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if content_type != "application/json":
                self._send_json({"error": "content_type_must_be_application_json"}, status=415)
                return
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                content_length = 0
            if content_length <= 0:
                self._send_json({"error": "request_body_required"}, status=400)
                return
            if content_length > MAX_JSON_BODY:
                self._send_json({"error": "request_body_too_large"}, status=413)
                return
            try:
                payload = json.loads(self.rfile.read(content_length))
            except (json.JSONDecodeError, UnicodeDecodeError):
                self._send_json({"error": "invalid_json"}, status=400)
                return
            if not isinstance(payload, dict) or set(payload) != {"venue_id"}:
                self._send_json(
                    {"error": "body_must_contain_only_venue_id"}, status=400
                )
                return
            try:
                require_venue(payload["venue_id"])
            except (ValueError, TypeError):
                self._send_json(
                    {"error": "unsupported_venue_id", "allowed": list(VENUES)}, status=400
                )
                return

            relocated_at = utc_now()
            closed = tracker.relocate(payload["venue_id"], relocated_at=relocated_at)
            self._send_json(
                {
                    "venue": tracker.current_venue(),
                    "closed_sessions": len(closed),
                    "relocated_at_utc": exact_utc_iso(relocated_at),
                    "relocated_at_local_24h": local_minute_24h(relocated_at),
                }
            )

        def _send_json(self, payload: dict, status: int = 200) -> None:
            self._send_bytes(
                json.dumps(payload, separators=(",", ":")).encode(),
                "application/json; charset=utf-8",
                status=status,
            )

        def _send_bytes(
            self, payload: bytes, content_type: str, status: int = 200
        ) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, format: str, *args) -> None:
            return

    return DashboardHandler


def main() -> int:
    parser = argparse.ArgumentParser(description="Psych-MAP RFID presence dashboard")
    parser.add_argument("--port", help="YRM100 serial port")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--db", default=str(DEFAULT_SHARED_DB), help="Shared Psych-MAP SQLite database")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--http-port", type=int, default=8765)
    parser.add_argument("--leave-after", type=float, default=5.0)
    parser.add_argument("--sync-every", type=float, default=300.0)
    parser.add_argument("--scanner-id", default=DEFAULT_SCANNER_ID)
    parser.add_argument("--venue", choices=VENUES, help="Initial scanner venue")
    parser.add_argument(
        "--allow-missing-reader",
        action="store_true",
        help="Start the dashboard and keep retrying auto-detection while the reader is unplugged",
    )
    args = parser.parse_args()
    Path(args.db).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

    try:
        port = choose_port(args.port)
    except RuntimeError:
        if not args.allow_missing_reader:
            raise
        port = None
    store = PresenceStore(args.db)
    saved_venue = store.scanner_venue(args.scanner_id)
    saved_venue_id = saved_venue["venue_id"] if saved_venue else None
    venue_id = args.venue or (
        saved_venue_id if saved_venue_id in VENUES else DEFAULT_VENUE_ID
    )
    tracker = PresenceTracker(
        store,
        venue_id=venue_id,
        scanner_id=args.scanner_id,
        leave_after_seconds=args.leave_after,
        persist_interval_seconds=args.sync_every,
    )
    service = PresenceService(
        tracker,
        source_factory=lambda: YRM100TagSource(
            port or choose_port(None), baud=args.baud
        ),
    )
    server = ThreadingHTTPServer(
        (args.host, args.http_port), build_handler(tracker, service, store)
    )

    def request_shutdown(*_args) -> None:
        # shutdown() must not run in the serve_forever thread.
        import threading

        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, request_shutdown)
    signal.signal(signal.SIGTERM, request_shutdown)
    service.start()
    print(f"Psych-MAP RFID dashboard: http://{args.host}:{args.http_port}")
    print(
        f"Reader: {port or 'waiting for YRM100 auto-detection'} · scanner: {args.scanner_id} · "
        f"venue: {tracker.venue_label} · leave threshold: {args.leave_after:g}s · "
        f"SQLite checkpoint: {args.sync_every:g}s"
    )
    try:
        server.serve_forever()
    finally:
        service.stop()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
