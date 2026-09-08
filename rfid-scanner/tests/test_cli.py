import unittest

from rfid_app.cli import _should_emit_tag


class TestCliDedupe(unittest.TestCase):
    def test_should_emit_first_seen_tag(self):
        seen = {}
        self.assertTrue(_should_emit_tag("D00000000000000000000003", 10.0, seen, 2.0))

    def test_should_suppress_duplicate_within_window(self):
        seen = {"D00000000000000000000003": 10.0}
        self.assertFalse(_should_emit_tag("D00000000000000000000003", 11.0, seen, 2.0))

    def test_should_emit_again_after_window(self):
        seen = {"D00000000000000000000003": 10.0}
        self.assertTrue(_should_emit_tag("D00000000000000000000003", 12.5, seen, 2.0))


if __name__ == "__main__":
    unittest.main()
