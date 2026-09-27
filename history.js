const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const windows = {
  latest: { title: 'Recent year', start: '2025-09-01' },
  '2001': { title: 'September 11, 2001', start: '2001-07-01', end: '2001-12-31', marker: '2001-09-11' },
  '2005': { title: 'Hurricane Katrina', start: '2005-07-01', end: '2005-11-30', marker: '2005-08-29' },
  '1973': { title: '1973–74 oil embargo', annual: true }
};
const events = [
  { id: '1973', year: '1973–74', title: 'Oil embargo', teaser: 'Annual crude acquisition costs and leaded pump prices both rose.', price: .532, month: '1974-06', html: `<p>EIA's annual U.S. composite crude cost to refiners rose from <b>$4.15 to $9.07 per barrel</b> (about 119%). The national annual price of <b>leaded regular</b> rose from <b>$0.388 to $0.532 per gallon</b> (about 37%). These are annual averages; they cannot show the precise month of a pump response. Price controls and the historical fuel grade make this a very different market from today.</p><p class="micro">Sources: <a href="https://www.eia.gov/totalenergy/data/annual/txt/ptb0521.html" target="_blank" rel="noopener">EIA crude acquisition cost, Table 5.21 ↗</a> · <a href="https://www.eia.gov/totalenergy/data/annual/txt/ptb0524.html" target="_blank" rel="noopener">EIA retail gasoline, Table 5.24 ↗</a>.</p>` },
  { id: '2001', year: '2001', title: 'September 11', teaser: 'Local pump spikes versus weekly national prices.', price: 1.529, month: '2001-09', html: `<p>Some stations raised prices sharply in the hours after the attacks. The <a href="https://search.ftc.gov/news-events/news/press-releases/2001/09/consumer-awareness-gasoline-pumps-urged" target="_blank" rel="noopener">FTC recorded numerous complaints of dramatic increases in several states ↗</a>. EIA's <b>weekly national regular</b> survey was <b>$1.527 on September 10</b>, <b>$1.529 on September 17</b>, then <b>$1.485 on September 24</b>. Weekly WTI averaged <b>$27.38 per barrel</b> in the week ending September 7 and <b>$28.22</b> in the week ending September 14. That 84-cent crude move is about 2 cents per input gallon before other effects. The national sample cannot resolve a single station's intraday $4 sign; the local jump cannot be explained by this small benchmark crude move alone.</p><p class="micro">Sources: <a href="https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg" target="_blank" rel="noopener">EIA U.S. regular gasoline ↗</a> · <a href="https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=RWTC" target="_blank" rel="noopener">EIA WTI ↗</a> · <a href="https://www.eia.gov/outlooks/steo/archives/oct01.pdf" target="_blank" rel="noopener">EIA October 2001 outlook ↗</a>.</p>` },
  { id: '2005', year: '2005', title: 'Hurricane Katrina', teaser: 'Pump prices jumped as fuel supply was disrupted.', price: 3.069, month: '2005-09', html: `<p>Between the weeks dated August 29 and September 5, the national regular pump average climbed from <b>$2.610 to $3.069 per gallon</b> (46 cents). Weekly WTI moved from <b>$66.34 per barrel</b> for the week ending August 26 to <b>$68.47</b> for the week ending September 2. A $2.13 crude move is roughly 5 cents per input gallon before other effects. The much larger pump jump points to the importance of refinery and product supply disruption; it cannot be explained by the crude benchmark alone.</p><p class="micro">Sources: <a href="https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg" target="_blank" rel="noopener">EIA U.S. regular gasoline ↗</a> · <a href="https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=RWTC" target="_blank" rel="noopener">EIA WTI ↗</a> · <a href="https://www.ftc.gov/sites/default/files/documents/reports/federal-trade-commission-investigation-gasoline-price-manipulation-and-post-katrina-gasoline-price/060518publicgasolinepricesinvestigationreportfinal.pdf" target="_blank" rel="noopener">FTC Katrina investigation ↗</a>.</p>` }
];
let data, active = 'latest', selectedRegion = 'mid', regionName = 'Midwest';
const fmtDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const valueAt = (series, date) => series.find(row => row[0] === date)?.[1];
function add(svg, tag, attrs, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, String(val));
  if (text !== undefined) node.textContent = text;
  svg.append(node);
  return node;
}
function plotPanel(svg, rows, minDate, maxDate, top, bottom, color, label, unit, annual = false, scaleRows = rows) {
  if (!rows.length) return;
  const values = scaleRows.map(row => row[1]);
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max((hi - lo) * .13, unit === 'barrel' ? 1 : .08);
  lo = Math.max(0, lo - pad); hi += pad;
  const x = date => 74 + (new Date(date).getTime() - minDate) / (maxDate - minDate) * 846;
  const y = value => bottom - (value - lo) / (hi - lo) * (bottom - top);
  [lo, (lo + hi) / 2, hi].forEach(v => {
    const yy = y(v);
    add(svg, 'line', { x1: 74, x2: 920, y1: yy, y2: yy, stroke: '#dce6ee', 'stroke-width': 1 });
    add(svg, 'text', { x: 65, y: yy + 4, 'text-anchor': 'end', fill: '#5f7790', 'font-size': 11 }, unit === 'barrel' ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`);
  });
  add(svg, 'text', { x: 75, y: top - 8, fill: color, 'font-size': 13, 'font-weight': 700 }, label);
  if (!annual) add(svg, 'path', { d: rows.map((row, i) => `${i ? 'L' : 'M'}${x(row[0]).toFixed(1)},${y(row[1]).toFixed(1)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  if (annual) rows.forEach(row => add(svg, 'circle', { cx: x(row[0]), cy: y(row[1]), r: 6, fill: color }));
}
function renderChart() {
  if (!data) return;
  const svg = $('observed-chart'); svg.replaceChildren();
  const win = windows[active];
  $('observed-caption').textContent = `${win.title} · observed EIA data · ${win.annual ? 'annual' : 'weekly'} frequencies`;
  $('regional-legend').textContent = `${regionName} region`;
  $('regional-legend-item').hidden = !!win.annual;
  $('wti-legend').textContent = win.annual ? 'Composite crude acquired by refiners ($/barrel)' : 'Crude: WTI spot ($/barrel)';
  $('national-legend').textContent = win.annual ? 'U.S. leaded regular ($/gallon)' : 'U.S. regular ($/gallon)';
  if (win.annual) {
    const min = new Date('1972-10-01').getTime(), max = new Date('1975-03-01').getTime();
    plotPanel(svg, [['1973-07-01', 4.15], ['1974-07-01', 9.07]], min, max, 36, 126, '#067b92', 'Composite crude acquired by U.S. refiners · annual $/barrel', 'barrel', true);
    plotPanel(svg, [['1973-07-01', .388], ['1974-07-01', .532]], min, max, 174, 264, '#ef8a20', 'U.S. leaded regular retail · annual $/gallon', 'gallon', true);
    ['1973','1974'].forEach((year, i) => add(svg, 'text', { x: 250 + i * 350, y: 298, fill: '#5d7692', 'font-size': 13 }, year));
    $('chart-note').textContent = 'Annual averages only. Crude is composite refinery acquisition cost; gasoline is historical leaded regular. Dots do not reveal the month or lag of change.';
    $('chart-readout').textContent = '1973: crude $4.15/barrel; leaded regular $0.388/gallon. 1974: crude $9.07/barrel; leaded regular $0.532/gallon.';
    return;
  }
  const gas = data.series.national.values, regional = data.series[selectedRegion].values, wti = data.series.wti.values;
  const end = win.end || gas.at(-1)[0], start = win.start;
  const range = series => series.filter(row => row[0] >= start && row[0] <= end);
  const min = new Date(`${start}T00:00:00Z`).getTime(), max = new Date(`${end}T00:00:00Z`).getTime();
  const x = date => 74 + (new Date(`${date}T00:00:00Z`).getTime() - min) / (max - min) * 846;
  if (win.marker) {
    add(svg, 'line', { x1: x(win.marker), x2: x(win.marker), y1: 30, y2: 270, stroke: '#a14949', 'stroke-width': 1.5, 'stroke-dasharray': '5 5' });
    add(svg, 'text', { x: x(win.marker) + 5, y: 23, fill: '#9a4444', 'font-size': 12 }, fmtDate(win.marker));
  }
  plotPanel(svg, range(wti), min, max, 42, 127, '#067b92', 'WTI spot crude · $/barrel', 'barrel');
  plotPanel(svg, range(gas), min, max, 180, 265, '#ef8a20', 'U.S. and selected region regular retail · $/gallon', 'gallon', false, [...range(gas), ...range(regional)]);
  // Overlay selected-region values in the gasoline panel using a shared pump scale.
  const both = [...range(gas), ...range(regional)], values = both.map(row => row[1]);
  const pad = Math.max((Math.max(...values) - Math.min(...values)) * .13, .08);
  const lo = Math.max(0, Math.min(...values) - pad), hi = Math.max(...values) + pad;
  const y = v => 265 - (v - lo) / (hi - lo) * 85;
  const regionPath = range(regional).map((row, i) => `${i ? 'L' : 'M'}${x(row[0]).toFixed(1)},${y(row[1]).toFixed(1)}`).join(' ');
  add(svg, 'path', { d: regionPath, fill: 'none', stroke: '#8058c8', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
  [start, end].forEach((date, i) => add(svg, 'text', { x: i ? 920 : 74, y: 298, 'text-anchor': i ? 'end' : 'start', fill: '#5d7692', 'font-size': 13 }, fmtDate(date)));
  const hover = add(svg, 'rect', { x: 74, y: 32, width: 846, height: 238, fill: 'transparent', tabindex: 0, role: 'button', 'aria-label': 'Inspect prices along the timeline' });
  const inspect = clientX => {
    const bounds = svg.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width * 1000 / 846 - 74 / 846));
    const date = min + frac * (max - min);
    const nearest = rows => rows.reduce((best, row) => Math.abs(new Date(row[0]).getTime() - date) < Math.abs(new Date(best[0]).getTime() - date) ? row : best);
    const g = nearest(range(gas)), r = nearest(range(regional)), c = nearest(range(wti));
    $('chart-readout').textContent = `${fmtDate(g[0])}: U.S. regular $${g[1].toFixed(3)}/gal; ${regionName} $${r[1].toFixed(3)}/gal. WTI week ending ${fmtDate(c[0])}: $${c[1].toFixed(2)}/barrel.`;
  };
  hover.addEventListener('pointermove', e => inspect(e.clientX));
  hover.addEventListener('focus', () => inspect(svg.getBoundingClientRect().left + svg.getBoundingClientRect().width / 2));
  $('chart-note').textContent = 'WTI is a benchmark crude price, not the crude cost of a specific gallon. Crude weeks end Friday; retail survey dates are Monday. Lines share dates, but use separate labeled units.';
  const lastG = range(gas).at(-1), lastR = range(regional).at(-1), lastC = range(wti).at(-1);
  $('chart-readout').textContent = `Latest in view: U.S. regular $${lastG[1].toFixed(3)}/gal (${fmtDate(lastG[0])}); ${regionName} $${lastR[1].toFixed(3)}/gal; WTI $${lastC[1].toFixed(2)}/barrel (${fmtDate(lastC[0])}).`;
}
function selectWindow(id, scroll = false) {
  active = id;
  document.querySelectorAll('[data-window]').forEach(button => button.classList.toggle('active', button.dataset.window === id));
  renderChart();
  if (scroll) $('prices').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => selectWindow(button.dataset.window)));
window.addEventListener('region-selected', e => { selectedRegion = e.detail.key; regionName = e.detail.name; renderChart(); });
function renderEvent(id = '2001') {
  const event = events.find(item => item.id === id);
  $('events').innerHTML = events.map(item => `<button class="event ${item.id === id ? 'active' : ''}" type="button" data-event="${item.id}"><small>${item.year}</small><strong>${item.title}</strong><span>${item.teaser}</span></button>`).join('');
  $('events').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { renderEvent(button.dataset.event); selectWindow(button.dataset.event, true); }));
  $('event-detail').innerHTML = `<h3>${event.title}: what the data can and cannot show</h3>${event.html}<button id="use-event" type="button">Compare this pump price with inflation</button>`;
  $('use-event').addEventListener('click', () => { $('old-price').value = event.price; $('old-month').value = event.month; $('old-price').dispatchEvent(new Event('input')); $('inflation').scrollIntoView({ behavior: 'smooth' }); });
}
renderEvent();
fetch('./assets/data/eia-weekly.json').then(response => response.json()).then(json => { data = json; renderChart(); }).catch(() => { $('chart-readout').textContent = 'EIA price data could not load. Reload the page or inspect the source links.'; });
