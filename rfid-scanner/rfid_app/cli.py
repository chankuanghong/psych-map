"""Command-line entrypoint for RFID scanning."""

from __future__ import annotations

import argparse
import sys
import time
from typing import Optional

from rfid_app.scanner import (
    KeyboardTagSource,
    SerialTagSource,
    YRM100TagSource,
    detect_serial_ports,
    detect_yrm100_candidate_ports,
)
from rfid_app.storage import ScanStore


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="RFID scanner logger")
    parser.add_argument(
        "--mode",
        choices=["auto", "keyboard", "serial", "yrm100"],
        default="auto",
        help="Scanner mode",
    )
    parser.add_argument("--port", help="Serial port, e.g. /dev/tty.usbserial-0001")
    parser.add_argument(
        "--baud",
        type=int,
        help="Serial baud rate (defaults: serial=9600, yrm100=115200)",
    )
    parser.add_argument(
        "--db", default="rfid_scans.db", help="SQLite DB file for scan history"
    )
    parser.add_argument(
        "--list-ports", action="store_true", help="List detected serial ports and exit"
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Probe YRM100 reader and print module information",
    )
    parser.add_argument(
        "--new-only",
        action="store_true",
        help="Only emit a tag if it has not been seen within --dedupe-seconds",
    )
    parser.add_argument(
        "--dedupe-seconds",
        type=float,
        default=2.0,
        help="Duplicate suppression window in seconds for --new-only (default: 2.0)",
    )
    return parser


def _should_emit_tag(
    tag: str, now_monotonic: float, last_seen: dict[str, float], dedupe_seconds: float
) -> bool:
    previous = last_seen.get(tag)
    if previous is not None and (now_monotonic - previous) < dedupe_seconds:
        return False
    last_seen[tag] = now_monotonic
    return True


def _resolve_source(mode: str, port: Optional[str], baud: Optional[int]):
    if mode == "keyboard":
        return KeyboardTagSource()

    if mode == "serial":
        chosen_port = _resolve_port(port)
        return SerialTagSource(chosen_port, baud=baud or 9600)

    if mode == "yrm100":
        chosen_port = _resolve_yrm100_port(port)
        return YRM100TagSource(chosen_port, baud=baud or 115200)

    # auto mode: prefer YRM100 candidate ports, fallback to generic serial/keyboard.
    ports = detect_serial_ports()
    if port:
        return YRM100TagSource(port, baud=baud or 115200)

    yrm100_candidates = detect_yrm100_candidate_ports(ports)
    if len(yrm100_candidates) == 1:
        print(f"Auto-detected YRM100 candidate on {yrm100_candidates[0]}")
        return YRM100TagSource(yrm100_candidates[0], baud=baud or 115200)
    if len(yrm100_candidates) > 1:
        raise RuntimeError(
            "Multiple YRM100-like serial ports found. Use --list-ports and specify --port."
        )

    if len(ports) == 1:
        print(f"Auto-detected serial scanner on {ports[0]}")
        return SerialTagSource(ports[0], baud=baud or 9600)
    if len(ports) > 1:
        print("Multiple serial ports found; falling back to keyboard mode.")
    return KeyboardTagSource()


def _resolve_port(port: Optional[str]) -> str:
    if port:
        return port
    ports = detect_serial_ports()
    if len(ports) == 1:
        return ports[0]
    if not ports:
        raise RuntimeError("No serial ports detected. Provide --port explicitly.")
    raise RuntimeError(
        "Multiple serial ports detected. Provide --port to select one."
    )


def _resolve_yrm100_port(port: Optional[str]) -> str:
    if port:
        return port
    candidates = detect_yrm100_candidate_ports()
    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        raise RuntimeError(
            "Multiple YRM100-like ports detected. Provide --port to select one."
        )

    ports = detect_serial_ports()
    if len(ports) == 1:
        return ports[0]
    if not ports:
        raise RuntimeError(
            "No serial ports detected. Check cable/driver and provide --port explicitly."
        )
    raise RuntimeError(
        "No clear YRM100 candidate port. Use --list-ports and provide --port."
    )


def _print_ports() -> None:
    ports = detect_serial_ports()
    candidates = set(detect_yrm100_candidate_ports(ports))
    if not ports:
        print("No serial ports detected.")
        return
    print("Detected serial ports:")
    for port in ports:
        marker = " (YRM100 candidate)" if port in candidates else ""
        print(f" - {port}{marker}")


def _probe_yrm100(source) -> int:
    if not isinstance(source, YRM100TagSource):
        print("Probe requires --mode yrm100 or an auto-selected YRM100 source.", file=sys.stderr)
        return 1
    try:
        hardware = source.get_module_info(YRM100TagSource.MODULE_INFO_HARDWARE)
        software = source.get_module_info(YRM100TagSource.MODULE_INFO_SOFTWARE)
        maker = source.get_module_info(YRM100TagSource.MODULE_INFO_MANUFACTURER)
    except Exception as exc:
        print(f"Probe failed: {exc}", file=sys.stderr)
        return 1

    print("YRM100 module detected:")
    print(f" - Hardware: {hardware}")
    print(f" - Software: {software}")
    print(f" - Manufacturer: {maker}")
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.dedupe_seconds < 0:
        parser.error("--dedupe-seconds must be >= 0")

    if args.list_ports:
        _print_ports()
        return 0

    source = None
    try:
        source = _resolve_source(args.mode, args.port, args.baud)
        if args.probe:
            return _probe_yrm100(source)

        store = ScanStore(args.db)
        print(
            f"Scanner ready (mode={source.source_name}, db={args.db}). "
            "Scan tags, Ctrl+C to stop."
        )
        last_seen: dict[str, float] = {}
        while True:
            tag = source.read_tag()
            if args.new_only:
                if not _should_emit_tag(
                    tag,
                    now_monotonic=time.monotonic(),
                    last_seen=last_seen,
                    dedupe_seconds=args.dedupe_seconds,
                ):
                    continue
            store.log_tag(tag, source.source_name)
            print(f"Scanned: {tag}")
    except KeyboardInterrupt:
        print("\nStopping scanner.")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        if source is not None:
            source.close()


if __name__ == "__main__":
    raise SystemExit(main())
