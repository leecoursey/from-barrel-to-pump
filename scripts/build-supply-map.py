"""Build a dated, auditable map snapshot from EIA and USACE public files.

Requires openpyxl. Run from the repository root. Download failures stop the build.
"""
import json
import re
import urllib.request
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "supply-source"
RAW.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "assets" / "data" / "supply-map.json"
EIA_URL = "https://www.eia.gov/petroleum/refinerycapacity/refcap26.xlsx"
POINT_URL = "https://services8.arcgis.com/XLNdV9JX2tH1BT1x/ArcGIS/rest/services/Petroleum_Refineries_US_EIA/FeatureServer/6/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson"
USACE = "https://ndc.ops.usace.army.mil/wcsc/webpub/data/year/2024/region/{region}/location/{id}/report/fiveYearCargoReport.json"

# Map positions are approximate port centers, not terminal or berth coordinates.
PORTS = [
    (1,90,"Boston, MA","MA",-71.06,42.36),(1,398,"New York and New Jersey","NY",-74.02,40.69),
    (1,552,"Philadelphia, PA","PA",-75.14,39.91),(1,700,"Baltimore, MD","MD",-76.58,39.27),
    (1,1911,"Port Everglades, FL","FL",-80.11,26.09),(1,2017,"Jacksonville, FL","FL",-81.65,30.39),
    (1,1992,"Miami, FL","FL",-80.18,25.77),(1,99,"Portland, ME","ME",-70.25,43.65),
    (2,2393,"Beaumont, TX","TX",-94.08,30.08),(2,2436,"Corpus Christi, TX","TX",-97.39,27.80),
    (2,2031,"Houston, TX","TX",-95.26,29.73),(2,2248,"Lake Charles, LA","LA",-93.21,30.23),
    (2,2032,"Mobile, AL","AL",-88.04,30.69),(2,2251,"New Orleans, LA","LA",-90.06,29.95),
    (2,1995,"Pascagoula, MS","MS",-88.54,30.36),(2,2416,"Port Arthur, TX","TX",-93.93,29.88),
    (2,2252,"Baton Rouge, LA","LA",-91.19,30.44),(2,2021,"Tampa, FL","FL",-82.44,27.93),
    (4,4110,"Long Beach, CA","CA",-118.20,33.75),(4,4120,"Los Angeles, CA","CA",-118.27,33.74),
    (4,4344,"Oakland, CA","CA",-122.31,37.80),(4,4646,"Portland, OR","OR",-122.67,45.56),
    (4,4335,"San Francisco, CA","CA",-122.39,37.80),(4,4722,"Seattle, WA","WA",-122.35,47.59),
    (4,4719,"Tacoma, WA","WA",-122.44,47.25),
]

def source(path, url):
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "from-barrel-to-pump public-data build"})
        with urllib.request.urlopen(req, timeout=45) as response:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(response.read())
    return path

def norm(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())

sheet = load_workbook(source(RAW / "refcap26.xlsx", EIA_URL), read_only=True, data_only=True).active
values = sheet.values
headers = next(values)
sites = [dict(zip(headers, row)) for row in values if row[8] == "TOTAL OPERABLE CAPACITY"
         and row[9] == "Atmospheric Crude Distillation Capacity (barrels per calendar day)"]
points = json.loads(source(RAW / "refinery-coordinates.geojson", POINT_URL).read_text(encoding="utf-8"))["features"]
coords = defaultdict(list)
for point in points:
    p = point["properties"]
    coords[(norm(p["State"]), norm(p["Site"]))].append(point)

# Several cities host multiple refineries. Match operators within a city so
# Port Arthur, Corpus Christi, Anacortes, and similar sites do not share a dot.
by_city = defaultdict(list)
for row in sites:
    by_city[(norm(row["STATE_NAME"]), norm(row["SITE"]))].append(row)
assigned = {}
for key, city_sites in by_city.items():
    candidates = [(SequenceMatcher(None, norm(row["COMPANY_NAME"]), norm(point["properties"]["Company"])).ratio(),
                   index, point_index)
                  for index, row in enumerate(city_sites)
                  for point_index, point in enumerate(coords[key])]
    used_rows, used_points = set(), set()
    for score, index, point_index in sorted(candidates, reverse=True):
        if index not in used_rows and point_index not in used_points:
            assigned[id(city_sites[index])] = (coords[key][point_index]["geometry"]["coordinates"], score)
            used_rows.add(index)
            used_points.add(point_index)

refineries = []
for row in sites:
    key = (norm(row["STATE_NAME"]), norm(row["SITE"]))
    match = assigned.get(id(row))
    if match:
        (lon, lat), score = match
        location_note = ("2021 EIA-derived facility point matched by city and operator; 2026 EIA site/capacity"
                         if score >= .55 else "Approximate 2021 EIA-derived city point; operator changed or point match uncertain; 2026 EIA site/capacity")
    elif coords[key]:
        point = max(coords[key], key=lambda p: SequenceMatcher(None, norm(row["COMPANY_NAME"]), norm(p["properties"]["Company"])).ratio())
        lon, lat = point["geometry"]["coordinates"]
        location_note = "Approximate city point reused because the 2021 layer has fewer sites than EIA 2026; 2026 EIA site/capacity"
    elif key == ("california", "kern"):
        lon, lat = -118.69, 35.37
        location_note = "Approximate Kern County center; 2026 EIA site/capacity"
    elif key == ("texas", "galveston"):
        lon, lat = -94.79, 29.30
        location_note = "Approximate Galveston city center; 2026 EIA site/capacity"
    else:
        raise ValueError(f"No location for 2026 refinery: {row['STATE_NAME']} {row['SITE']}")
    refineries.append({"site":row["SITE"].title(),"company":row["COMPANY_NAME"].title(),
        "state":row["STATE_NAME"],"padd":int(row["PADD"]),"capacityBpd":int(row["QUANTITY"]),
        "lon":round(lon,5),"lat":round(lat,5),"locationNote":location_note})

ports = []
for region, location_id, name, state, lon, lat in PORTS:
    url = USACE.format(region=region, id=location_id)
    report = json.loads(source(RAW / "ports" / f"{region}-{location_id}.json", url).read_text(encoding="utf-8"))
    foreign = {r["commodityId"]:r for r in report["FRN_COMMODITIES"]}
    domestic = {r["commodityId"]:r for r in report["DOM_COMMODITIES"]}
    ports.append({"name":name,"state":state,"lon":lon,"lat":lat,"source":url,
        "crudeForeignTons":foreign.get(2100,{}).get("receiptsDelta0",0),
        "gasolineForeignTons":foreign.get(2211,{}).get("receiptsDelta0",0),
        "crudeDomesticTons":domestic.get(2100,{}).get("receiptsDelta0",0),
        "gasolineDomesticTons":domestic.get(2211,{}).get("receiptsDelta0",0)})

assert len(refineries) == 124 and len(ports) == len(PORTS)
assert next(p for p in ports if p["name"] == "Boston, MA")["gasolineForeignTons"] == 2162520
snapshot = {"refineryAsOf":"2026-01-01","portYear":2024,"portUnit":"short tons",
    "refineryCapacityUnit":"barrels per calendar day","refinerySource":EIA_URL,
    "refineryPointSource":POINT_URL,"portDefinition":"USACE foreign waterborne receipts at selected official port boundaries; commodity 2100 Crude Petroleum and 2211 Gasoline",
    "refineries":refineries,"ports":ports}
OUT.write_text(json.dumps(snapshot,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
print(f"Wrote {len(refineries)} refinery sites and {len(ports)} selected ports to {OUT}")
