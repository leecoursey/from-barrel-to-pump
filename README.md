# From Barrel to Pump

An interactive, public explainer of how crude oil becomes gasoline, why pump prices differ among U.S. regions, how price changes can take time to pass through, and what historical gasoline prices mean after inflation.

**Live site:** https://leecoursey.github.io/from-barrel-to-pump/  
**Repository:** https://github.com/leecoursey/from-barrel-to-pump

The site is a static HTML, CSS, and JavaScript project hosted by GitHub Pages. It has no server, account system, tracking code, or runtime data API. Data files are committed with the project, so the site works without EIA or BLS credentials. All displayed snapshots are dated below. This first version uses ordinary browser technology rather than a build framework, making the published site easy to inspect and maintain.

## What visitors can do

- Click any state or search by state name, state code, or a five-digit ZIP Code. The map reports the state's **PADD regional average**, never a live local station price.
- Explore the four supply stages and separate 2025 crude processing, crude imports, finished gasoline imports, and blending component imports.
- Change a hypothetical crude price shock, assumed pass-through share, delay, and response time. The chart is an illustration, **not a forecast or a measured local response**.
- Examine three sourced historical examples: the 1973–74 oil embargo, September 2001, and Hurricane Katrina.
- Enter any nonnegative nominal price and compare purchasing power between any two available months from January 1970 through August 2026.

## Source register

All source links below point to the data owner or an official federal source. Accessed September 27, 2026.

| On-site item | Source and series | Transformation and limits |
| --- | --- | --- |
| 2025 regional regular gasoline prices | [EIA, *Regional gasoline price differences*](https://www.eia.gov/energyexplained/gasoline/regional-price-differences.php), annual average retail regular by PADD. East Coast $2.980; Midwest $2.944; Gulf Coast $2.677; Rocky Mountain $3.022; West Coast $4.094 per gallon. [EIA PADD map](https://www.eia.gov/petroleum/marketing/monthly/pdf/paddmap.pdf). | Every state in a PADD shows the **same regional average**. State borders are a selection interface, not a state price dataset. The EIA page explains that distance, taxes, fuel specifications, disruptions, competition, and operating costs all matter. |
| 2025 crude processed in U.S. | [EIA, U.S. refinery and blender net input of crude oil](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=A&n=PET&s=MCRRIUS2), 2025: **16,369 thousand barrels per day**. | Shown as ~16.4 million barrels/day. This includes domestically produced **and imported** crude; it must not be added to crude imports. It does not state how much gasoline was produced. |
| 2025 crude imports | [EIA, U.S. imports of crude oil and petroleum products](https://www.eia.gov/dnav/pet/pet_move_imp_dc_NUS-Z00_mbbl_a.htm), 2025 crude oil: **2,251,381 thousand barrels/year**. | 2,251,381 ÷ 365 = 6,168 thousand barrels/day, shown as ~6.2 million. Imports include crude for Strategic Petroleum Reserve storage, per EIA notes. |
| 2025 finished gasoline imports | [Same EIA imports table](https://www.eia.gov/dnav/pet/pet_move_imp_dc_NUS-Z00_mbbl_a.htm), finished motor gasoline: **45,229 thousand barrels/year**. | 45,229 ÷ 365 = 123.9 thousand barrels/day, shown as ~124 thousand. |
| 2025 gasoline blending component imports | [Same EIA imports table](https://www.eia.gov/dnav/pet/pet_move_imp_dc_NUS-Z00_mbbl_a.htm), motor gasoline blending components: **192,257 thousand barrels/year**. | 192,257 ÷ 365 = 526.7 thousand barrels/day, shown as ~527 thousand. Components may be blended into finished gasoline in the U.S. They are not the same product as finished gasoline imports. These four measures are not pieces of a single pie chart. |
| Barrel size and gasoline yield | [EIA FAQ, products from a barrel of crude](https://www.eia.gov/TOOLS/FAQS/faq.php?id=327&t=10). | A 42-gallon barrel typically yields about 19–20 gallons of gasoline and other co-products. The simulator divides a barrel price change by **42**, then applies the user's assumed pass-through. It does **not** divide by gasoline yield because all barrel cost cannot be assigned only to gasoline. |
| Refining stages | [EIA, *The refining process*](https://www.eia.gov/energyexplained/oil-and-petroleum-products/refining-crude-oil-the-refining-process.php). | Four clickable cards simplify production and distribution. They do not identify a station's actual refinery. |
| Price components and regional factors | [EIA, pump price component methodology](https://www.eia.gov/petroleum/gasdiesel/pump_methodology.php); [EIA, regional price differences](https://www.eia.gov/energyexplained/gasoline/regional-price-differences.php). | Qualitative explanations only. The site does not assign a universal fixed cents-per-gallon charge to each stage. |
| Lag scenario context | [EIA pass-through research](https://www.eia.gov/petroleum/articles/passthroughindex.php); [EIA gasoline price study](https://www.eia.gov/analysis/studies/gasoline/pdf/gasolinepricestudy.pdf). | The drawn curve is **entirely user-controlled**: crude change ÷ 42 × pass-through share; zero before selected delay; straight-line progression over selected spread. This is deliberately not fitted to the EIA research or offered as a prediction. A station's fuel travel time is not identical to price pass-through time. |
| 1973–74 oil embargo example | [EIA Annual Energy Review, Table 5.24](https://www.eia.gov/totalenergy/data/annual/txt/ptb0524.html), U.S. annual average **leaded regular** gasoline: $0.388 in 1973, $0.532 in 1974. [EIA petroleum history](https://www.eia.gov/kids/history-of-energy/timelines/oil-petroleum.php). | Annual, national, historical fuel grade. The card does not imply a weekly price path. For CPI comparison, June 1974 is a **midyear proxy** for the annual $0.532, not a June pump price. |
| September 2001 example | [EIA weekly U.S. regular gasoline price series](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg): $1.562 Sept. 10; $1.564 Sept. 17; $1.522 Sept. 24, 2001. [EIA October 2001 Short-Term Energy Outlook](https://www.eia.gov/outlooks/steo/archives/oct01.pdf). | National weekly average. It does not describe a particular station or every local spike. Sept. 2001 CPI is used for inflation. |
| Hurricane Katrina example | [Same EIA weekly regular gasoline series](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg): $2.610 Aug. 29; $3.069 Sept. 5; $2.955 Sept. 12, 2005. [EIA September 2005 outlook](https://www.eia.gov/outlooks/steo/archives/sep05.pdf). | National weekly average. Sept. 2005 CPI is used for inflation. EIA discussed Gulf refinery outages and gasoline product supply. |
| Inflation adjustment | [BLS CPI-U, U.S. city average, all items, not seasonally adjusted, series `CUUR0000SA0`](https://www.bls.gov/cpi/factsheets/cpi-series-ids.htm), retrieved from the [BLS public API](https://www.bls.gov/developers/api_FAQs.htm). [BLS calculation guidance](https://www.bls.gov/cpi/factsheets/calculating-percent-changes.htm). | `historical price × CPI(comparison month) ÷ CPI(historical month)`. [Committed monthly CPI file](assets/data/cpi.json) contains 679 published months from Jan. 1970 to Aug. 2026. BLS returned `-` for October 2025, so that month is excluded. CPI measures general consumer inflation, **not gasoline-specific price changes**. |
| State map | [U.S. Census Bureau 2018 1:5m cartographic state boundary file](https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html), downloaded from [this ZIP](https://www2.census.gov/geo/tiger/GENZ2018/shp/cb_2018_us_state_5m.zip). | 50 states and DC converted to [GeoJSON](assets/data/states.geojson). Territories are omitted because the five displayed PADD price values do not apply to them. Alaska and Hawaii are moved into visual insets. Boundaries are for interaction, not fuel flow. |
| ZIP lookup | [U.S. Census Bureau 2020 ZCTA national Gazetteer](https://www.census.gov/geographies/reference-files/2020/geo/gazetter-file.html), downloaded from [this ZIP](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip). [Census ZCTA definition](https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html). | Each ZCTA internal point was assigned to a state polygon. The [lookup file](assets/data/zip-state.json) covers 32,961 ZCTAs. A ZCTA is an approximate geographic representation of a ZIP Code; some postal ZIPs have no ZCTA and some ZIPs cross boundaries. This is a region finder, not address geocoding. |

## How to run and update

Open with any static web server. For example, from the repository root:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. Fetching the data files requires HTTP; opening `index.html` directly from disk can block them in some browsers.

To regenerate the bundled map, ZIP lookup, and CPI JSON files, install `requirements.txt`, download the two Census ZIPs linked above to `data/states.zip` and `data/zcta.zip`, and retrieve monthly BLS series `CUUR0000SA0` into `data/cpi_raw.json` with fields `year`, `period`, and `value`. Then run:

```sh
python scripts/prepare_data.py
```

The raw downloads are included in [`data/`](data/) so the current snapshot is reproducible. The BLS API data was requested in six ten-year windows from 1970 through 2026; only `M01`–`M12` rows with numeric values were retained. The map generator uses `pyshp` and `shapely` only during data preparation. Visitors do not need Python or API credentials.

## Scope and accuracy

- **Prices are snapshots.** The 2025 regional average is not today's price. The site does not automatically update EIA or BLS data.
- **Regional ≠ local.** The state selection maps to a PADD, whose average cannot explain one station or track a literal barrel to that station. Fuel can move across state and regional boundaries.
- **Imports are different products.** Crude imports, finished gasoline imports, and blending components should not be summed into one import percentage. U.S. refineries process both domestic and imported crude.
- **Historical series differ.** The 1973–74 case uses annual leaded regular; the 2001 and 2005 cases use weekly regular gasoline. Comparisons must preserve those differences.
- **Simulation is transparent.** Its formula and assumptions are visible. Actual pass-through may be faster, slower, larger, smaller, or reversed by other conditions.
- **Inflation comparison is purchasing power only.** It does not hold fuel quality, taxes, oil markets, or gasoline supply constant.

## Hosting and keys

GitHub Pages serves the repository root over HTTPS. The site requires **no API keys or certificates**. GitHub manages the Pages TLS certificate. A future live-data update could use the [EIA Open Data API](https://www.eia.gov/opendata/register.php), which requires an EIA API key; it should be handled in a GitHub Actions secret during a scheduled build, never exposed in browser code.

## License

Project code and original text are MIT licensed; see [LICENSE](LICENSE). Source data remains subject to the originating U.S. government agencies' terms and documentation.
