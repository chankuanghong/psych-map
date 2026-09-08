"""Constants and deterministic formatting for the Psych-MAP RFID contract."""

from __future__ import annotations

import math
import json
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


SCHEMA_VERSION = "psychmap.rfid.presence.v1"
TIME_ZONE_NAME = "Asia/Singapore"
TIME_PRECISION = "minute-floor"
SINGAPORE = ZoneInfo(TIME_ZONE_NAME)
DEFAULT_SCANNER_ID = "yrm100-usb-01"
DEFAULT_VENUE_ID = "corridor"

# Order follows the Psych-MAP ward venue selector.
VENUES = {
    "cubicle_1": "Cubicle 1",
    "cubicle_2": "Cubicle 2",
    "cubicle_3": "Cubicle 3",
    "cubicle_4": "Cubicle 4",
    "corridor": "Corridor",
    "activity_room": "Activity room",
    "balcony": "Balcony",
    "dining": "Dining",
    "visitor_area": "Visitor area",
    "upper_toilet": "Upper toilet",
    "lower_toilet": "Lower toilet",
    "shower_1": "Shower 1",
    "shower_2": "Shower 2",
    "shower_3": "Shower 3",
}

# Subject IDs are explicit mappings. They are never derived from display names.
TAG_IDENTITIES = {
    "D00000000000000000000001": {"name": "Person 1", "subject_id": "PT-003"},
    "D00000000000000000000002": {"name": "Person 2", "subject_id": "PT-001"},
}


# Keep real tag mappings in an ignored local JSON file.
if os.environ.get('RFID_TAG_MAP'):
    with open(os.environ['RFID_TAG_MAP'], encoding='utf-8') as mapping_file:
        private_map = json.load(mapping_file)
    if not isinstance(private_map, dict) or any(
        not isinstance(epc, str) or not isinstance(value, dict)
        or value.get('subject_id') not in {'PT-001', 'PT-002', 'PT-003', None}
        or not isinstance(value.get('name'), str)
        for epc, value in private_map.items()
    ):
        raise ValueError('Invalid private RFID mapping')
    TAG_IDENTITIES = private_map


def require_venue(venue_id: str) -> tuple[str, str]:
    if not isinstance(venue_id, str) or venue_id not in VENUES:
        raise ValueError(f"Unsupported venue_id: {venue_id!r}")
    return venue_id, VENUES[venue_id]


def normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("timestamps must be timezone-aware")
    return value.astimezone(timezone.utc)


def exact_utc_iso(value: datetime) -> str:
    """Preserve the supplied instant, including microseconds, in UTC."""
    return normalize_utc(value).isoformat(timespec="microseconds")


def parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return normalize_utc(parsed)


def local_minute_24h(value: datetime | str) -> str:
    """Floor seconds and render the Singapore minute in a zero-padded clock."""
    instant = parse_utc(value) if isinstance(value, str) else normalize_utc(value)
    local = instant.astimezone(SINGAPORE).replace(second=0, microsecond=0)
    return local.strftime("%Y-%m-%d %H:%M")


def deterministic_duration(
    entered_at: datetime | str, exited_at: datetime | str | None
) -> tuple[int | None, int | None]:
    if exited_at is None:
        return None, None
    entered = parse_utc(entered_at) if isinstance(entered_at, str) else normalize_utc(entered_at)
    exited = parse_utc(exited_at) if isinstance(exited_at, str) else normalize_utc(exited_at)
    exact_seconds = max(0.0, (exited - entered).total_seconds())
    seconds = math.floor(exact_seconds)
    # Conventional half-up rounding, avoiding Python's banker rounding.
    rounded_minutes = math.floor((exact_seconds / 60.0) + 0.5)
    return seconds, rounded_minutes
