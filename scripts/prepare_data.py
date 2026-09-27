"""Build small, auditable browser datasets from Census and BLS downloads."""
import csv
import io
import json
import zipfile
from pathlib import Path

import shapefile
from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data"
OUTPUT = ROOT / "assets" / "data"
OUTPUT.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(SOURCE / "states.zip") as z:
    shp = io.BytesIO(z.read("cb_2018_us_state_5m.shp"))
    shx = io.BytesIO(z.read("cb_2018_us_state_5m.shx"))
    dbf = io.BytesIO(z.read("cb_2018_us_state_5m.dbf"))
    reader = shapefile.Reader(shp=shp, shx=shx, dbf=dbf)
    features = []
    for item in reader.shapeRecords():
        props = item.record.as_dict()
        if props["STUSPS"] in {"PR", "VI", "GU", "MP", "AS"}:
            continue
        geo = item.shape.__geo_interface__
        features.append({"type": "Feature", "properties": {"abbr": props["STUSPS"], "name": props["NAME"]}, "geometry": geo})

with (OUTPUT / "states.geojson").open("w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": features}, f, separators=(",", ":"))

prepared = [(f["properties"]["abbr"], prep(shape(f["geometry"])), shape(f["geometry"]).bounds) for f in features]
lookup = {}
with zipfile.ZipFile(SOURCE / "zcta.zip") as z:
    with z.open("2020_Gaz_zcta_national.txt") as raw:
        rows = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8"), delimiter="\t")
        rows.fieldnames = [name.strip() for name in rows.fieldnames]
        for row in rows:
            point = Point(float(row["INTPTLONG"]), float(row["INTPTLAT"]))
            for abbr, polygon, (minx, miny, maxx, maxy) in prepared:
                if minx <= point.x <= maxx and miny <= point.y <= maxy and polygon.covers(point):
                    lookup[row["GEOID"]] = abbr
                    break
with (OUTPUT / "zip-state.json").open("w", encoding="utf-8") as f:
    json.dump(lookup, f, separators=(",", ":"))

raw = json.loads((SOURCE / "cpi_raw.json").read_text(encoding="utf-8-sig"))
cpi = {f'{item["year"]}-{item["period"][1:]}': float(item["value"]) for item in raw if item["value"] != "-"}
with (OUTPUT / "cpi.json").open("w", encoding="utf-8") as f:
    json.dump(dict(sorted(cpi.items())), f, separators=(",", ":"))
print(f'{len(features)} states/DC; {len(lookup)} ZCTA mappings; {len(cpi)} CPI months')
