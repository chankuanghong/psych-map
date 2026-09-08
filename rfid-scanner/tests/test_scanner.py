import unittest
from unittest.mock import patch

from rfid_app import scanner


class FakeSerialHandle:
    def __init__(self, chunks):
        self._chunks = list(chunks)
        self.is_open = True

    def readline(self):
        if self._chunks:
            return self._chunks.pop(0)
        return b""

    def close(self):
        self.is_open = False


class FakeSerialModule:
    def __init__(self, chunks):
        self._chunks = chunks

    def Serial(self, port, baudrate, timeout):  # noqa: N802 - match pyserial API
        return FakeSerialHandle(self._chunks)


class TestKeyboardTagSource(unittest.TestCase):
    def test_reads_non_empty_tag(self):
        responses = iter(["", "   ", "TAG-1"])
        src = scanner.KeyboardTagSource(input_func=lambda _: next(responses))
        self.assertEqual(src.read_tag(), "TAG-1")


class TestSerialTagSource(unittest.TestCase):
    def test_reads_and_decodes_tag(self):
        module = FakeSerialModule([b"\n", b"  ", b"TAG-2\r\n"])
        src = scanner.SerialTagSource("/dev/ttyUSB0", serial_module=module)
        self.assertEqual(src.read_tag(), "TAG-2")
        src.close()

    def test_detect_serial_ports_handles_missing_pyserial(self):
        with (
            patch.object(scanner, "list_ports", None),
            patch.object(scanner.os, "name", "posix"),
            patch.object(scanner.glob, "glob", return_value=[]),
        ):
            self.assertEqual(scanner.detect_serial_ports(), [])

    def test_detect_yrm100_candidate_ports(self):
        ports = [
            "/dev/cu.Bluetooth-Incoming-Port",
            "/dev/cu.SLAB_USBtoUART",
            "/dev/tty.debug-console",
        ]
        self.assertEqual(
            scanner.detect_yrm100_candidate_ports(ports),
            ["/dev/cu.SLAB_USBtoUART"],
        )


if __name__ == "__main__":
    unittest.main()
