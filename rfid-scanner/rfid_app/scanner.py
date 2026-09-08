"""Scanner interfaces for keyboard, generic serial, and YRM100 RFID readers."""

from __future__ import annotations

import glob
import os
import select
import time
from dataclasses import dataclass
from typing import Callable, List, Optional

try:
    import serial  # type: ignore
    from serial.tools import list_ports  # type: ignore
except Exception:  # pragma: no cover - exercised via tests with injection
    serial = None
    list_ports = None


class TagSource:
    """Interface for objects that can return scanned tag IDs."""

    source_name = "unknown"

    def read_tag(self) -> str:
        raise NotImplementedError

    def close(self) -> None:
        """Cleanup hook."""


class _PosixSerialCompat:
    """Minimal pyserial-compatible wrapper using POSIX APIs."""

    def __init__(self, port: str, baudrate: int, timeout: float) -> None:
        import termios

        self._termios = termios
        self._fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        self.timeout = timeout
        self.is_open = True

        attrs = termios.tcgetattr(self._fd)
        attrs[0] = 0  # iflag
        attrs[1] = 0  # oflag
        attrs[3] = 0  # lflag

        cflag = attrs[2]
        cflag |= termios.CLOCAL | termios.CREAD
        cflag &= ~termios.PARENB
        cflag &= ~termios.CSTOPB
        cflag &= ~termios.CSIZE
        cflag |= termios.CS8
        attrs[2] = cflag

        speed = self._baud_to_termios(baudrate)
        attrs[4] = speed  # ispeed
        attrs[5] = speed  # ospeed
        attrs[6][termios.VMIN] = 0
        attrs[6][termios.VTIME] = 0
        termios.tcsetattr(self._fd, termios.TCSANOW, attrs)

    def _baud_to_termios(self, baudrate: int):
        lookup = {
            9600: "B9600",
            19200: "B19200",
            38400: "B38400",
            57600: "B57600",
            115200: "B115200",
            230400: "B230400",
        }
        constant = lookup.get(baudrate)
        if not constant or not hasattr(self._termios, constant):
            raise RuntimeError(f"Unsupported baud rate for POSIX fallback: {baudrate}")
        return getattr(self._termios, constant)

    @property
    def in_waiting(self) -> int:
        try:
            import array
            import fcntl

            buf = array.array("I", [0])
            fcntl.ioctl(self._fd, self._termios.FIONREAD, buf, True)
            return int(buf[0])
        except Exception:
            return 0

    def read(self, size: int = 1) -> bytes:
        if not self.is_open:
            return b""
        ready, _, _ = select.select([self._fd], [], [], self.timeout)
        if not ready:
            return b""
        try:
            return os.read(self._fd, max(1, size))
        except BlockingIOError:
            return b""

    def readline(self) -> bytes:
        data = bytearray()
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            chunk = self.read(1)
            if not chunk:
                if data:
                    break
                continue
            data.extend(chunk)
            if chunk == b"\n":
                break
        return bytes(data)

    def write(self, payload: bytes) -> int:
        if not self.is_open:
            return 0
        return os.write(self._fd, payload)

    def reset_input_buffer(self) -> None:
        old_timeout = self.timeout
        self.timeout = 0.0
        try:
            while self.read(4096):
                continue
        finally:
            self.timeout = old_timeout

    def close(self) -> None:
        if self.is_open:
            os.close(self._fd)
            self.is_open = False


def _open_serial(port: str, baudrate: int, timeout: float, serial_module=None):
    module = serial_module or serial
    if module is not None:
        return module.Serial(port, baudrate=baudrate, timeout=timeout)
    if os.name == "posix":
        return _PosixSerialCompat(port, baudrate=baudrate, timeout=timeout)
    raise RuntimeError(
        "pyserial is not available. Install with: pip install pyserial"
    )


@dataclass
class KeyboardTagSource(TagSource):
    """Reads tag IDs from standard input (keyboard wedge scanners)."""

    input_func: Callable[[str], str] = input
    prompt: str = "RFID> "
    source_name: str = "keyboard"

    def read_tag(self) -> str:
        while True:
            value = self.input_func(self.prompt).strip()
            if value:
                return value


class SerialTagSource(TagSource):
    """Reads tag IDs from serial-attached RFID scanners."""

    source_name = "serial"

    def __init__(
        self,
        port: str,
        baud: int = 9600,
        timeout: float = 0.5,
        serial_module=None,
    ) -> None:
        self._serial = _open_serial(
            port, baudrate=baud, timeout=timeout, serial_module=serial_module
        )

    def read_tag(self) -> str:
        while True:
            raw = self._serial.readline()
            if not raw:
                continue
            if isinstance(raw, bytes):
                text = raw.decode(errors="ignore").strip()
            else:
                text = str(raw).strip()
            if text:
                return text

    def close(self) -> None:
        if self._serial and getattr(self._serial, "is_open", False):
            self._serial.close()


@dataclass
class YRM100Frame:
    msg_type: int
    cmd: int
    data: bytes


class YRM100FrameParser:
    """Parses YRM100 binary frames from a byte stream."""

    FRAME_BEGIN = 0xBB
    FRAME_END = 0x7E
    MAX_DATA_LENGTH = 3072

    def __init__(self) -> None:
        self._buffer = bytearray()

    def feed(self, chunk: bytes) -> List[YRM100Frame]:
        if chunk:
            self._buffer.extend(chunk)

        frames: List[YRM100Frame] = []
        while True:
            start = self._buffer.find(self.FRAME_BEGIN)
            if start < 0:
                self._buffer.clear()
                break
            if start > 0:
                del self._buffer[:start]

            if len(self._buffer) < 7:
                break

            data_len = (self._buffer[3] << 8) | self._buffer[4]
            if data_len > self.MAX_DATA_LENGTH:
                del self._buffer[0]
                continue

            frame_len = data_len + 7
            if len(self._buffer) < frame_len:
                break

            if self._buffer[frame_len - 1] != self.FRAME_END:
                del self._buffer[0]
                continue

            frame = bytes(self._buffer[:frame_len])
            del self._buffer[:frame_len]

            checksum = sum(frame[1 : 5 + data_len]) & 0xFF
            if checksum != frame[5 + data_len]:
                continue

            frames.append(YRM100Frame(frame[1], frame[2], frame[5 : 5 + data_len]))

        return frames


def _build_yrm100_frame(msg_type: int, cmd: int, data: bytes = b"") -> bytes:
    payload = bytes([msg_type, cmd]) + len(data).to_bytes(2, "big") + data
    checksum = sum(payload) & 0xFF
    return bytes([0xBB]) + payload + bytes([checksum, 0x7E])


class YRM100TagSource(TagSource):
    """Reads EPC tags using YRM100 serial protocol."""

    source_name = "yrm100"

    FRAME_TYPE_CMD = 0x00
    FRAME_TYPE_ANS = 0x01
    FRAME_TYPE_INFO = 0x02

    CMD_GET_MODULE_INFO = 0x03
    CMD_INVENTORY = 0x22
    CMD_EXE_FAILED = 0xFF

    FAIL_INVENTORY_TAG_TIMEOUT = 0x15

    MODULE_INFO_HARDWARE = 0x00
    MODULE_INFO_SOFTWARE = 0x01
    MODULE_INFO_MANUFACTURER = 0x02

    def __init__(
        self,
        port: str,
        baud: int = 115200,
        timeout: float = 0.1,
        inventory_timeout: float = 0.25,
        serial_module=None,
    ) -> None:
        self._serial = _open_serial(
            port, baudrate=baud, timeout=timeout, serial_module=serial_module
        )
        self._parser = YRM100FrameParser()
        self._inventory_timeout = inventory_timeout

    def read_tag(self) -> str:
        while True:
            self._serial.write(
                _build_yrm100_frame(self.FRAME_TYPE_CMD, self.CMD_INVENTORY)
            )
            deadline = time.monotonic() + self._inventory_timeout
            for frame in self._read_frames_until(deadline):
                if frame.msg_type == self.FRAME_TYPE_INFO and frame.cmd == self.CMD_INVENTORY:
                    epc = self._extract_epc(frame.data)
                    if epc:
                        return epc
                if (
                    frame.msg_type == self.FRAME_TYPE_ANS
                    and frame.cmd == self.CMD_EXE_FAILED
                    and frame.data
                    and frame.data[0] == self.FAIL_INVENTORY_TAG_TIMEOUT
                ):
                    break

    def get_module_info(self, field: int = MODULE_INFO_SOFTWARE, timeout: float = 0.5) -> str:
        if hasattr(self._serial, "reset_input_buffer"):
            self._serial.reset_input_buffer()
        request = _build_yrm100_frame(
            self.FRAME_TYPE_CMD, self.CMD_GET_MODULE_INFO, bytes([field & 0xFF])
        )
        self._serial.write(request)
        deadline = time.monotonic() + timeout
        for frame in self._read_frames_until(deadline):
            if frame.msg_type == self.FRAME_TYPE_ANS and frame.cmd == self.CMD_GET_MODULE_INFO:
                payload = frame.data
                if payload and payload[0] in {
                    self.MODULE_INFO_HARDWARE,
                    self.MODULE_INFO_SOFTWARE,
                    self.MODULE_INFO_MANUFACTURER,
                }:
                    payload = payload[1:]
                text = payload.decode("ascii", errors="ignore").strip().strip("\x00")
                return text or payload.hex().upper()
            if frame.msg_type == self.FRAME_TYPE_ANS and frame.cmd == self.CMD_EXE_FAILED:
                fail = frame.data[0] if frame.data else None
                raise RuntimeError(f"YRM100 module info request failed (code={fail})")
        raise TimeoutError("Timed out waiting for YRM100 module response")

    def _read_frames_until(self, deadline: float) -> List[YRM100Frame]:
        frames: List[YRM100Frame] = []
        while time.monotonic() < deadline:
            waiting = int(getattr(self._serial, "in_waiting", 0) or 0)
            chunk = self._serial.read(waiting or 1)
            if chunk:
                frames.extend(self._parser.feed(chunk))
                if frames:
                    return frames
                continue
            time.sleep(0.01)
        return frames

    @staticmethod
    def _extract_epc(data: bytes) -> Optional[str]:
        # Inventory info payload: RSSI(1), PC(2), EPC(N), CRC(2)
        if len(data) < 5:
            return None
        epc_bytes = data[3:-2]
        if not epc_bytes:
            return None
        return epc_bytes.hex().upper()

    def close(self) -> None:
        if self._serial and getattr(self._serial, "is_open", False):
            self._serial.close()


def detect_serial_ports() -> List[str]:
    """Return available serial ports from pyserial (if installed) or OS fallback."""
    ports: List[str] = []
    if list_ports is not None:
        ports.extend(port.device for port in list_ports.comports())

    # Fallback for systems where pyserial is unavailable.
    if not ports and os.name == "posix":
        patterns = [
            "/dev/tty.*",
            "/dev/cu.*",
            "/dev/ttyUSB*",
            "/dev/ttyACM*",
            "/dev/serial/by-id/*",
        ]
        for pattern in patterns:
            ports.extend(glob.glob(pattern))

    deduped: List[str] = []
    seen = set()
    for port in ports:
        if port not in seen:
            seen.add(port)
            deduped.append(port)
    return sorted(deduped)


def detect_yrm100_candidate_ports(ports: Optional[List[str]] = None) -> List[str]:
    """Return serial ports that look like USB-UART connections used by YRM100."""
    all_ports = ports or detect_serial_ports()
    preferred = ("usb", "serial", "uart", "cp210", "slab", "ttyusb", "ttyacm")
    ignored = ("bluetooth", "debug", "wlan")
    candidates: List[str] = []
    for port in all_ports:
        normalized = port.lower()
        if any(token in normalized for token in ignored):
            continue
        if any(token in normalized for token in preferred):
            candidates.append(port)
    return candidates
