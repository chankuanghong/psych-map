import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from rfid_app.contract import DEFAULT_VENUE_ID, VENUES


FLOORPLAN = Path(__file__).resolve().parents[1] / "rfid_app" / "static" / "floorplan.svg"

EXPECTED_GEOMETRY = {
    "cubicle_4": ("rect", {"x": "258", "y": "54", "width": "112", "height": "96"}),
    "cubicle_2": ("rect", {"x": "258", "y": "236", "width": "112", "height": "100"}),
    "cubicle_3": ("rect", {"x": "440", "y": "142", "width": "122", "height": "94"}),
    "cubicle_1": ("rect", {"x": "440", "y": "236", "width": "122", "height": "100"}),
    "upper_toilet": ("rect", {"x": "440", "y": "64", "width": "42", "height": "76"}),
    "shower_1": ("rect", {"x": "482", "y": "64", "width": "27", "height": "76"}),
    "shower_2": ("rect", {"x": "509", "y": "64", "width": "27", "height": "76"}),
    "shower_3": ("rect", {"x": "536", "y": "64", "width": "26", "height": "76"}),
    "corridor": ("path", {"d": "M370 30H440V336H466V386H440V596H414V650H370Z"}),
    "activity_room": ("rect", {"x": "258", "y": "430", "width": "112", "height": "150"}),
    "balcony": ("path", {"d": "M54 430H258V580H76Q54 580 54 558Z"}),
    "dining": ("path", {"d": "M116 580H370V714H142Q116 714 116 688Z"}),
    "lower_toilet": ("path", {"d": "M38 650H116V714H142V790H58Q38 790 38 770Z"}),
    "visitor_area": ("path", {"d": "M466 336H562V590H440V386H466Z"}),
}

# Bounding boxes are used only to guard marker anchors. The exact paths above are the
# source of truth for the irregular rooms.
EXPECTED_BOUNDS = {
    "cubicle_4": (258, 54, 370, 150),
    "cubicle_2": (258, 236, 370, 336),
    "cubicle_3": (440, 142, 562, 236),
    "cubicle_1": (440, 236, 562, 336),
    "upper_toilet": (440, 64, 482, 140),
    "shower_1": (482, 64, 509, 140),
    "shower_2": (509, 64, 536, 140),
    "shower_3": (536, 64, 562, 140),
    "corridor": (370, 30, 466, 650),
    "activity_room": (258, 430, 370, 580),
    "balcony": (54, 430, 258, 580),
    "dining": (116, 580, 370, 714),
    "lower_toilet": (38, 650, 142, 790),
    "visitor_area": (440, 336, 562, 590),
}


def local_name(element):
    return element.tag.rsplit("}", 1)[-1]


class TestFloorplanGeometry(unittest.TestCase):
    def setUp(self):
        self.root = ET.parse(FLOORPLAN).getroot()
        self.rooms = {}
        for group in self.root.iter():
            if "map-zone" not in group.attrib.get("class", "").split():
                continue
            shape = next(
                child
                for child in group
                if "room-shape" in child.attrib.get("class", "").split()
            )
            self.rooms[group.attrib["data-venue"]] = (group, shape)

    def test_map_contains_every_active_venue_and_no_legacy_living_room(self):
        self.assertEqual(set(self.rooms), set(VENUES))
        self.assertEqual(len(self.rooms), 14)
        self.assertNotIn("living_room", self.rooms)
        self.assertEqual(DEFAULT_VENUE_ID, "corridor")

    def test_geometry_matches_original_psychmap_coordinates(self):
        for venue_id, (expected_type, expected_attributes) in EXPECTED_GEOMETRY.items():
            _group, shape = self.rooms[venue_id]
            self.assertEqual(local_name(shape), expected_type, venue_id)
            for attribute, expected in expected_attributes.items():
                self.assertEqual(shape.attrib[attribute], expected, f"{venue_id}.{attribute}")

    def test_every_scanner_and_person_anchor_stays_inside_its_source_shape_bounds(self):
        for venue_id, (group, _shape) in self.rooms.items():
            left, top, right, bottom = EXPECTED_BOUNDS[venue_id]
            for x_attribute, y_attribute in (
                ("data-x", "data-y"),
                ("data-person-x", "data-person-y"),
            ):
                anchor_x = float(group.attrib[x_attribute])
                anchor_y = float(group.attrib[y_attribute])
                self.assertTrue(left <= anchor_x <= right, f"{venue_id}.{x_attribute}")
                self.assertTrue(top <= anchor_y <= bottom, f"{venue_id}.{y_attribute}")

    def test_map_uses_only_the_supplied_person_silhouette_for_live_people(self):
        person_symbol = next(
            element for element in self.root.iter() if element.attrib.get("id") == "person-symbol"
        )
        person_paths = [element for element in person_symbol.iter() if local_name(element) == "path"]
        marker_layer = next(
            element for element in self.root.iter() if element.attrib.get("id") == "people-marker-layer"
        )
        self.assertEqual(len(person_paths), 2)
        self.assertEqual(list(marker_layer), [])
        self.assertFalse(any(element.attrib.get("id") == "scanner-marker" for element in self.root.iter()))

    def test_north_is_explicitly_drawn_at_the_bottom(self):
        north = next(
            element
            for element in self.root.iter()
            if "north-mark" in element.attrib.get("class", "").split()
        )
        self.assertIn("translate(686 752)", north.attrib["transform"])
        self.assertIn("bottom", north.attrib["aria-label"].lower())

    def test_entrance_is_one_small_curve_touching_a_thick_threshold(self):
        entrance = next(
            element
            for element in self.root.iter()
            if "entrance-mark" in element.attrib.get("class", "").split()
        )
        paths = [element for element in entrance if local_name(element) == "path"]
        rectangles = [element for element in entrance if local_name(element) == "rect"]
        self.assertEqual(len(paths), 1)
        self.assertEqual(paths[0].attrib["d"], "M397 647Q405 637 413 647")
        self.assertEqual(len(rectangles), 1)
        self.assertEqual(
            {key: rectangles[0].attrib[key] for key in ("x", "y", "width", "height")},
            {"x": "396", "y": "647", "width": "18", "height": "6"},
        )


if __name__ == "__main__":
    unittest.main()
