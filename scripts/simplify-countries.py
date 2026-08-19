#!/usr/bin/env python3
"""Simplify src/data/countries.json for the SDG choropleth.

The source file is full-resolution Natural Earth (548k points, ~10cm precision).
The SDG layer is a world choropleth rendered at roughly zoom 2-6, where one
pixel spans 2.4km or more — so that precision is invisible and costs 14MB.

Douglas-Peucker at 0.02 degrees (~2.2km) with 2-decimal coordinates keeps
99.98% of total land area and cuts the file to ~2MB.

Usage: python3 scripts/simplify-countries.py
Re-run only if countries.json is replaced upstream.
"""
import json
import pathlib
from shapely.geometry import shape, mapping

TOLERANCE = 0.02  # degrees, ~2.2km — sub-pixel at the zooms this layer uses
PRECISION = 2     # decimal places, ~1.1km

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "src" / "data" / "countries.json"


def round_coords(node, precision):
    if isinstance(node[0], (int, float)):
        return [round(node[0], precision), round(node[1], precision)]
    return [round_coords(child, precision) for child in node]


def main():
    data = json.loads(src.read_text())
    before = len(json.dumps(data))

    area_before = area_after = 0.0
    features = []

    for feature in data["features"]:
        geom = shape(feature["geometry"])
        area_before += geom.area

        simplified = geom.simplify(TOLERANCE, preserve_topology=True)
        # preserve_topology can still empty out microscopic islands — keep the original.
        if simplified.is_empty or not simplified.is_valid:
            simplified = geom
        area_after += simplified.area

        mapped = mapping(simplified)
        coords = json.loads(json.dumps(mapped["coordinates"]))
        features.append({
            "type": "Feature",
            "properties": feature["properties"],
            "geometry": {
                "type": mapped["type"],
                "coordinates": round_coords(coords, PRECISION),
            },
        })

    out = {"type": "FeatureCollection", "features": features}
    payload = json.dumps(out, separators=(",", ":"))
    src.write_text(payload)

    kept = 100 * area_after / area_before
    print(f"{before/1e6:.1f}MB -> {len(payload)/1e6:.2f}MB, land area kept {kept:.2f}%")
    assert kept > 99.9, f"simplification lost too much area: {kept:.2f}%"


if __name__ == "__main__":
    main()
