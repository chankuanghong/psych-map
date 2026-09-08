import os
import tempfile
import unittest

from rfid_app.storage import ScanStore


class TestScanStore(unittest.TestCase):
    def test_log_and_recent(self):
        with tempfile.TemporaryDirectory() as td:
            db_path = os.path.join(td, "scans.db")
            store = ScanStore(db_path)

            store.log_tag("ABC123", "keyboard")
            store.log_tag("XYZ999", "serial")

            rows = store.recent(limit=10)
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0].tag, "XYZ999")
            self.assertEqual(rows[0].source, "serial")
            self.assertEqual(rows[1].tag, "ABC123")
            self.assertEqual(rows[1].source, "keyboard")


if __name__ == "__main__":
    unittest.main()
