"""Venue presence derived from repeated RFID inventory reads."""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, Optional

from rfid_app.contract import (
    DEFAULT_SCANNER_ID,
    DEFAULT_VENUE_ID,
    TAG_IDENTITIES,
    exact_utc_iso,
    local_minute_24h,
    normalize_utc,
    require_venue,
)
from rfid_app.storage import PresenceStore


DEFAULT_TAG_NAMES = {tag: identity["name"] for tag, identity in TAG_IDENTITIES.items()}
DEFAULT_TAG_SUBJECT_IDS = {
    tag: identity["subject_id"] for tag, identity in TAG_IDENTITIES.items()
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ActivePresence:
    session_id: int
    tag: str
    name: str
    subject_id: Optional[str]
    scanner_id: str
    venue_id: str
    venue_label: str
    entered_at: datetime
    last_seen_at: datetime
    read_count: int = 1
    last_persisted_at: Optional[datetime] = None


class PresenceTracker:
    """Turns noisy tag reads into enter, leave, relocation, and re-entry sessions."""

    def __init__(
        self,
        store: PresenceStore,
        tag_names: Optional[Dict[str, str]] = None,
        tag_subject_ids: Optional[Dict[str, Optional[str]]] = None,
        venue_id: str = DEFAULT_VENUE_ID,
        scanner_id: str = DEFAULT_SCANNER_ID,
        leave_after_seconds: float = 5.0,
        persist_interval_seconds: float = 300.0,
    ) -> None:
        if leave_after_seconds <= 0:
            raise ValueError("leave_after_seconds must be greater than zero")
        if persist_interval_seconds <= 0:
            raise ValueError("persist_interval_seconds must be greater than zero")
        venue_id, venue_label = require_venue(venue_id)
        self.store = store
        self.tag_names = dict(tag_names or DEFAULT_TAG_NAMES)
        self.tag_subject_ids = dict(
            DEFAULT_TAG_SUBJECT_IDS if tag_subject_ids is None else tag_subject_ids
        )
        self.scanner_id = scanner_id
        self.venue_id = venue_id
        self.venue_label = venue_label
        self.leave_after = timedelta(seconds=leave_after_seconds)
        self.persist_interval = timedelta(seconds=persist_interval_seconds)
        self._active: Dict[str, ActivePresence] = {}
        self._lock = threading.RLock()
        self.store.close_stale_sessions(leave_after_seconds, scanner_id=scanner_id)
        self.store.set_scanner_venue(scanner_id, venue_id, venue_label)

    @property
    def room(self) -> str:
        """Legacy compatibility for the original dashboard status payload."""
        return self.venue_label

    def name_for(self, tag: str) -> str:
        return self.tag_names.get(tag, "Unassigned tag")

    def subject_for(self, tag: str) -> Optional[str]:
        return self.tag_subject_ids.get(tag)

    def observe(self, tag: str, observed_at: Optional[datetime] = None) -> dict:
        observed_at = normalize_utc(observed_at or utc_now())
        tag = tag.strip().upper()
        if not tag:
            raise ValueError("tag cannot be empty")

        with self._lock:
            active = self._active.get(tag)
            if active is None:
                name = self.name_for(tag)
                subject_id = self.subject_for(tag)
                session_id = self.store.open_session(
                    tag=tag,
                    name=name,
                    subject_id=subject_id,
                    scanner_id=self.scanner_id,
                    venue_id=self.venue_id,
                    venue_label=self.venue_label,
                    entered_at=observed_at,
                )
                active = ActivePresence(
                    session_id=session_id,
                    tag=tag,
                    name=name,
                    subject_id=subject_id,
                    scanner_id=self.scanner_id,
                    venue_id=self.venue_id,
                    venue_label=self.venue_label,
                    entered_at=observed_at,
                    last_seen_at=observed_at,
                    last_persisted_at=observed_at,
                )
                self._active[tag] = active
                return self._event("entered", active, observed_at)

            active.last_seen_at = observed_at
            active.read_count += 1
            if (
                active.last_persisted_at is None
                or observed_at - active.last_persisted_at >= self.persist_interval
            ):
                self.store.touch_session(active.session_id, observed_at, active.read_count)
                active.last_persisted_at = observed_at
            return self._event("seen", active, observed_at)

    def expire(self, checked_at: Optional[datetime] = None) -> list[dict]:
        checked_at = normalize_utc(checked_at or utc_now())
        events: list[dict] = []
        with self._lock:
            for tag, active in list(self._active.items()):
                if checked_at - active.last_seen_at < self.leave_after:
                    continue
                inferred_exit = active.last_seen_at + self.leave_after
                self.store.close_session(
                    active.session_id,
                    last_seen_at=active.last_seen_at,
                    exited_at=inferred_exit,
                    read_count=active.read_count,
                    exit_inferred=True,
                    closed_reason="signal_lost",
                )
                events.append(self._event("left", active, inferred_exit))
                del self._active[tag]
        return events

    def relocate(self, venue_id: str, relocated_at: Optional[datetime] = None) -> list[dict]:
        venue_id, venue_label = require_venue(venue_id)
        relocated_at = normalize_utc(relocated_at or utc_now())
        with self._lock:
            if venue_id == self.venue_id:
                return []
            events = self._close_active(
                at=relocated_at,
                exit_inferred=False,
                closed_reason="scanner_relocated",
            )
            self.venue_id = venue_id
            self.venue_label = venue_label
            self.store.set_scanner_venue(
                self.scanner_id, venue_id, venue_label, at=relocated_at
            )
            return events

    def close_all(
        self,
        closed_reason: str,
        at: Optional[datetime] = None,
        exit_inferred: bool = False,
    ) -> list[dict]:
        if closed_reason not in {"scanner_relocated", "service_stopped"}:
            raise ValueError("close_all only accepts deterministic closure reasons")
        at = normalize_utc(at or utc_now())
        with self._lock:
            return self._close_active(at, exit_inferred, closed_reason)

    def _close_active(
        self, at: datetime, exit_inferred: bool, closed_reason: str
    ) -> list[dict]:
        events: list[dict] = []
        for tag, active in list(self._active.items()):
            self.store.close_session(
                active.session_id,
                last_seen_at=active.last_seen_at,
                exited_at=at,
                read_count=active.read_count,
                exit_inferred=exit_inferred,
                closed_reason=closed_reason,
            )
            events.append(self._event("left", active, at))
            del self._active[tag]
        return events

    def current_venue(self) -> dict:
        return {"venue_id": self.venue_id, "venue_label": self.venue_label}

    def snapshot(self, now: Optional[datetime] = None) -> list[dict]:
        now = normalize_utc(now or utc_now())
        with self._lock:
            known_and_active: Iterable[str] = dict.fromkeys(
                [*self.tag_names.keys(), *self._active.keys()]
            )
            result = []
            for tag in known_and_active:
                active = self._active.get(tag)
                result.append(
                    {
                        "tag": tag,
                        "tag_id": tag,
                        "name": self.name_for(tag),
                        "subject_id": self.subject_for(tag),
                        "assigned": tag in self.tag_names,
                        "present": active is not None,
                        "room": self.venue_label,
                        "venue_id": self.venue_id,
                        "venue_label": self.venue_label,
                        "entered_at_utc": exact_utc_iso(active.entered_at) if active else None,
                        "entered_at_local_24h": local_minute_24h(active.entered_at) if active else None,
                        "last_seen_at_utc": exact_utc_iso(active.last_seen_at) if active else None,
                        "last_seen_at_local_24h": local_minute_24h(active.last_seen_at) if active else None,
                        "seconds_since_seen": round(
                            (now - active.last_seen_at).total_seconds(), 1
                        ) if active else None,
                        "read_count": active.read_count if active else 0,
                    }
                )
            return result

    @staticmethod
    def _event(event_type: str, active: ActivePresence, at: datetime) -> dict:
        return {
            "type": event_type,
            "tag": active.tag,
            "name": active.name,
            "subject_id": active.subject_id,
            "venue_id": active.venue_id,
            "at_utc": exact_utc_iso(at),
            "at_local_24h": local_minute_24h(at),
            "at": exact_utc_iso(at),
        }
