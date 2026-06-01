import os
import json
import pytest

_DIR = os.path.dirname(os.path.abspath(__file__))
HOTSPOTS_JSON = os.path.join(os.path.dirname(_DIR), "public", "data", "hotspots.json")

@pytest.fixture(scope="module")
def hotspots_data():
    with open(HOTSPOTS_JSON, "r") as f:
        return json.load(f)

def test_hotspots_file_exists():
    assert os.path.isfile(HOTSPOTS_JSON), f"Hotspots file not found at {HOTSPOTS_JSON}"

def test_hotspots_format(hotspots_data):
    assert "type" in hotspots_data
    assert hotspots_data["type"] == "FeatureCollection"
    assert "features" in hotspots_data
    assert isinstance(hotspots_data["features"], list)

def test_hotspots_features_validity(hotspots_data):
    for idx, feature in enumerate(hotspots_data["features"]):
        assert "type" in feature
        assert feature["type"] == "Feature"
        
        # Check geometry
        assert "geometry" in feature
        assert feature["geometry"]["type"] == "Point"
        coords = feature["geometry"]["coordinates"]
        assert len(coords) == 2
        # Delhi coordinates bounding box check roughly
        assert 76.8 <= coords[0] <= 77.4, f"Longitude {coords[0]} out of bounds for Delhi at index {idx}"
        assert 28.4 <= coords[1] <= 28.9, f"Latitude {coords[1]} out of bounds for Delhi at index {idx}"

        # Check properties
        props = feature["properties"]
        assert "name" in props
        assert "type" in props
        assert props["type"] in ["chronic", "official", "citizen_report"]

def test_hotspots_no_exact_duplicates(hotspots_data):
    """Ensure no two hotspots share the exact same coordinates, which causes map overlap issues."""
    seen_coords = set()
    for feature in hotspots_data["features"]:
        coords = tuple(feature["geometry"]["coordinates"])
        assert coords not in seen_coords, f"Duplicate coordinates found: {coords} for hotspot {feature['properties']['name']}"
        seen_coords.add(coords)
