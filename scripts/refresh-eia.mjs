import { mkdir, readFile, writeFile } from 'node:fs/promises';

// EIA publishes these tables without an API key. A changed table format fails the
// refresh rather than silently publishing an empty or mislabeled price series.
const series = {
  national: 'EMM_EPMR_PTE_NUS_DPG',
  east: 'EMM_EPMR_PTE_R10_DPG',
  mid: 'EMM_EPMR_PTE_R20_DPG',
  gulf: 'EMM_EPMR_PTE_R30_DPG',
  rocky: 'EMM_EPMR_PTE_R40_DPG',
  west: 'EMM_EPMR_PTE_R50_DPG',
  wti: 'RWTC',
  wholesale: 'EER_EPMRU_PF4_Y35NY_DPG'
};
const base = 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=';
const monthNumber = Object.fromEntries(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => [m, String(i + 1).padStart(2, '0')]));

function parseTable(html, label) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>\s*<td class=['"]B6['"]>(?:\s|&nbsp;)*(\d{4})-([A-Z][a-z]{2})<\/td>([\s\S]*?)<\/tr>/g)) {
    const [, year, month, cells] = match;
    if (!monthNumber[month]) continue;
    const pairs = [...cells.matchAll(/<td class=['"]B5['"]>\s*(\d{2})\/(\d{2})[^<]*<\/td>\s*<td class=['"]B3['"]>\s*([\d.]+)[^<]*<\/td>/g)];
    for (const [, mm, day, raw] of pairs) {
      if (mm !== monthNumber[month]) throw new Error(`${label}: month mismatch ${year}-${month} ${mm}/${day}`);
      rows.push([`${year}-${mm}-${day}`, Number(raw)]);
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length < 1000 || rows.at(-1)[0] < '2026-01-01') throw new Error(`${label}: missing or stale EIA data (${rows.length} rows)`);
  if (new Set(rows.map(row => row[0])).size !== rows.length) throw new Error(`${label}: duplicate dates`);
  return rows;
}

const data = { source: 'U.S. Energy Information Administration', retrieved: new Date().toISOString().slice(0, 10), units: { gasoline: 'retail dollars per gallon, including taxes', wti: 'dollars per barrel', wholesale: 'New York Harbor conventional regular gasoline spot dollars per gallon, FOB' }, series: {} };
for (const [key, code] of Object.entries(series)) {
  const url = base + code;
  let html;
  if (process.env.EIA_SOURCE_DIR) {
    const name = key === 'national' ? 'eia-weekly-retail.html' : key === 'wti' ? 'eia-weekly-wti.html' : `eia-weekly-${key}.html`;
    html = await readFile(`${process.env.EIA_SOURCE_DIR}/${name}`, 'utf8');
  } else {
    const response = await fetch(url, { headers: { 'User-Agent': 'from-barrel-to-pump/1.0 (public educational dashboard)' } });
    if (!response.ok) throw new Error(`${key}: EIA returned ${response.status}`);
    html = await response.text();
  }
  data.series[key] = { code, url, values: parseTable(html, key) };
  console.log(key, data.series[key].values.length, data.series[key].values.at(-1));
}
await mkdir(new URL('../assets/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/data/eia-weekly.json', import.meta.url), JSON.stringify(data));
