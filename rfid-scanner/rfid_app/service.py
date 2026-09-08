"""Background reader service for the room-presence dashboard."""

from __future__ import annotations

import threading
from datetime import datetime
from typing import Callable, Optional

from rfid_app.contract import exact_utc_iso
from rfid_app.presence import PresenceTracker, utc_now


class PresenceService:
    def __init__(
        self,
        tracker: PresenceTracker,
        source_factory: Callable[[], object],
        sweep_interval: float = 0.5,
        retry_interval: float = 2.0,
    ) -> None:
        self.tracker = tracker
        self.source_factory = source_factory
        self.sweep_interval = sweep_interval
        self.retry_interval = retry_interval
        self._stop = threading.Event()
        self._state_lock = threading.RLock()
        self._source = None
        self._reader_thread: Optional[threading.Thread] = None
        self._sweeper_thread: Optional[threading.Thread] = None
        self._connected = False
        self._error: Optional[str] = None
        self._last_read_at: Optional[datetime] = None

    def start(self) -> None:
        if self._reader_thread and self._reader_thread.is_alive():
            return
        self._stop.clear()
        self._reader_thread = threading.Thread(
            target=self._reader_loop, name="rfid-reader", daemon=True
        )
        self._sweeper_thread = threading.Thread(
            target=self._sweeper_loop, name="presence-sweeper", daemon=True
        )
        self._reader_thread.start()
        self._sweeper_thread.start()

    def stop(self) -> None:
        self._stop.set()
        with self._state_lock:
            source = self._source
        if source is not None:
            try:
                source.close()
            except Exception:
                pass
        for thread in (self._reader_thread, self._sweeper_thread):
            if thread:
                thread.join(timeout=2)
        self.tracker.close_all("service_stopped", at=utc_now(), exit_inferred=False)

    def _reader_loop(self) -> None:
        while not self._stop.is_set():
            source = None
            try:
                source = self.source_factory()
                with self._state_lock:
                    self._source = source
                    self._connected = True
                    self._error = None
                while not self._stop.is_set():
                    tag = source.read_tag()
                    observed_at = utc_now()
                    self.tracker.observe(tag, observed_at)
                    with self._state_lock:
                        self._last_read_at = observed_at
                        self._connected = True
                        self._error = None
            except Exception as exc:
                if not self._stop.is_set():
                    with self._state_lock:
                        self._connected = False
                        self._error = str(exc)
                    self._stop.wait(self.retry_interval)
            finally:
                if source is not None:
                    try:
                        source.close()
                    except Exception:
                        pass
                with self._state_lock:
                    if self._source is source:
                        self._source = None

    def _sweeper_loop(self) -> None:
        while not self._stop.wait(self.sweep_interval):
            self.tracker.expire()

    def status(self) -> dict:
        with self._state_lock:
            return {
                "connected": self._connected,
                "error": self._error,
                "last_read_at": exact_utc_iso(self._last_read_at)
                if self._last_read_at
                else None,
            }
