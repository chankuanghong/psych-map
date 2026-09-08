import unittest

from rfid_app import scanner


class FakeYRM100SerialHandle:
    def __init__(self, chunks):
        self._chunks = list(chunks)
        self.is_open = True
        self.writes = []

    @property
    def in_waiting(self):
        if not self._chunks:
            return 0
        return len(self._chunks[0])

    def read(self, size=1):
        if not self._chunks:
            return b""
        chunk = self._chunks.pop(0)
        if len(chunk) > size:
            self._chunks.insert(0, chunk[size:])
            return chunk[:size]
        return chunk

    def write(self, payload):
        self.writes.append(payload)
        return len(payload)

    def reset_input_buffer(self):
        return None

    def close(self):
        self.is_open = False


class FakeYRM100SerialModule:
    def __init__(self, chunks):
        self.handle = FakeYRM100SerialHandle(chunks)

    def Serial(self, port, baudrate, timeout):  # noqa: N802 - pyserial-compatible API
        return self.handle


class TestYRM100Protocol(unittest.TestCase):
    def test_build_inventory_frame(self):
        self.assertEqual(
            scanner._build_yrm100_frame(0x00, 0x22), bytes.fromhex("BB00220000227E")
        )

    def test_frame_parser_reads_split_frame(self):
        parser = scanner.YRM100FrameParser()
        frame = scanner._build_yrm100_frame(0x02, 0x22, b"\xD8\x30\x00\xAA\xBB\x12\x34")
        self.assertEqual(parser.feed(b"\x00" + frame[:4]), [])
        frames = parser.feed(frame[4:])
        self.assertEqual(len(frames), 1)
        self.assertEqual(frames[0].msg_type, 0x02)
        self.assertEqual(frames[0].cmd, 0x22)


class TestYRM100TagSource(unittest.TestCase):
    def test_read_tag_ignores_timeout_then_returns_epc(self):
        fail = scanner._build_yrm100_frame(0x01, 0xFF, b"\x15")
        payload = bytes.fromhex("D83000300833B2DDD90140000000011234")
        success = scanner._build_yrm100_frame(0x02, 0x22, payload)
        module = FakeYRM100SerialModule([fail, success])
        src = scanner.YRM100TagSource(
            "/dev/mock",
            serial_module=module,
            inventory_timeout=0.02,
            timeout=0.01,
        )
        self.assertEqual(src.read_tag(), "300833B2DDD9014000000001")
        self.assertGreaterEqual(len(module.handle.writes), 2)
        src.close()

    def test_get_module_info(self):
        response = scanner._build_yrm100_frame(0x01, 0x03, b"\x01YRM100 V2.1\x00")
        module = FakeYRM100SerialModule([response])
        src = scanner.YRM100TagSource(
            "/dev/mock",
            serial_module=module,
            inventory_timeout=0.02,
            timeout=0.01,
        )
        software = src.get_module_info(scanner.YRM100TagSource.MODULE_INFO_SOFTWARE)
        self.assertEqual(software, "YRM100 V2.1")
        self.assertEqual(
            module.handle.writes[0],
            scanner._build_yrm100_frame(0x00, 0x03, b"\x01"),
        )
        src.close()


if __name__ == "__main__":
    unittest.main()
