const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const windows = {
  all: { title: '1990–present', start: '1990-08-20', monthly: true },
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
let data, cpi, active = 'all', dollarMode = 'nominal', selectedRegion = 'mid', regionName = 'Midwest';
const fmtDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const valueAt = (series, date) => series.find(row => row[0] === date)?.[1];
function add(svg, tag, attrs, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, String(val));
  if (text !== undefined) node.textContent = text;
  svg.append(node);
  return node;
}
const monthLabel = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const money = (value, digits = 2) => `$${value.toFixed(digits)}`;
function monthly(rows) {
  const buckets = new Map();
  rows.forEach(([date, value]) => {
    const key = date.slice(0, 7), item = buckets.get(key) || { total: 0, count: 0 };
    item.total += value; item.count++; buckets.set(key, item);
  });
  return [...buckets].map(([month, item]) => [`${month}-15`, item.total / item.count]);
}
function adjusted(value, date) {
  if (dollarMode === 'nominal') return value;
  const from = cpi?.[date.slice(0, 7)], to = cpi?.[$('compare-month').value];
  return from && to ? value * to / from : null;
}
function seriesInView(key, start, end, useMonthly) {
  if (!data?.series[key]) return [];
  const source = data.series[key].values.filter(([date]) => date >= start && date <= end);
  const rows = useMonthly ? monthly(source) : source;
  return rows.map(([date, original]) => ({ date, original, value: adjusted(original, date) })).filter(row => row.value !== null);
}
function closest(rows, date) {
  if (!rows.length) return null;
  return rows.reduce((best, row) => Math.abs(Date.parse(row.date) - date) < Math.abs(Date.parse(best.date) - date) ? row : best);
}
function renderChart() {
  if (!data || !cpi) return;
  const svg = $('observed-chart'); svg.replaceChildren();
  const win = windows[active], annual = !!win.annual, useMonthly = !!win.monthly;
  const basis = $('compare-month').value, targetCpi = cpi[basis];
  $('dollar-basis-note').textContent = dollarMode === 'real' ? (targetCpi ? `All values in ${monthLabel(basis)} dollars` : 'Choose an available CPI month') : 'Prices as recorded at the time';
  $('observed-caption').textContent = `${win.title} · observed ${annual ? 'annual' : useMonthly ? 'monthly averages of weekly' : 'weekly'} prices · ${dollarMode === 'real' ? `${monthLabel(basis)} dollars` : 'actual dollars'}`;
  $('regional-legend').textContent = `${regionName} region`;
  $('regional-legend-item').hidden = annual;
  $('wholesale-legend-item').hidden = annual || !data.series.wholesale;
  $('wti-legend').textContent = annual ? 'Composite crude acquired by refiners ($/barrel)' : 'WTI spot crude ($/barrel)';
  $('national-legend').textContent = annual ? 'U.S. leaded regular ($/gallon)' : 'U.S. regular retail ($/gallon)';
  const start = annual ? '1973-01-01' : win.start;
  const end = annual ? '1974-12-31' : win.end || data.series.national.values.at(-1)[0];
  const crude = annual ? [['1973-07-01', 4.15], ['1974-07-01', 9.07]].map(([date, original]) => ({ date, original, value: adjusted(original, date) })).filter(row => row.value !== null) : seriesInView('wti', start, end, useMonthly);
  const national = annual ? [['1973-07-01', .388], ['1974-07-01', .532]].map(([date, original]) => ({ date, original, value: adjusted(original, date) })).filter(row => row.value !== null) : seriesInView('national', start, end, useMonthly);
  const region = annual ? [] : seriesInView(selectedRegion, start, end, useMonthly);
  const wholesale = annual ? [] : seriesInView('wholesale', start, end, useMonthly);
  const series = [{ rows: crude, color: '#496e74', panel: 'crude' }, { rows: wholesale, color: '#a47b45', panel: 'gas' }, { rows: national, color: '#ad755d', panel: 'gas' }, { rows: region, color: '#727485', panel: 'gas' }];
  if (!crude.length || !national.length) { $('chart-readout').textContent = 'No overlapping price and CPI observations for this selection.'; return; }
  const minDate = Date.parse(start), maxDate = Date.parse(end);
  const x = date => 78 + (Date.parse(date) - minDate) / (maxDate - minDate) * 862;
  const scales = {};
  for (const panel of ['crude', 'gas']) {
    const vals = series.filter(item => item.panel === panel).flatMap(item => item.rows.map(row => row.value));
    let low = Math.min(...vals), high = Math.max(...vals);
    const padding = Math.max((high - low) * .12, panel === 'crude' ? 1 : .08);
    low = Math.max(0, low - padding); high += padding;
    const top = panel === 'crude' ? 40 : 185, bottom = panel === 'crude' ? 132 : 275;
    const y = value => bottom - (value - low) / (high - low) * (bottom - top);
    scales[panel] = y;
    for (const value of [low, (low + high) / 2, high]) {
      const yy = y(value);
      add(svg, 'line', { x1: 78, x2: 940, y1: yy, y2: yy, stroke: '#d8ded9', 'stroke-width': 1 });
      add(svg, 'text', { x: 68, y: yy + 4, 'text-anchor': 'end', fill: '#607078', 'font-size': 11 }, money(value, panel === 'crude' ? 0 : 2));
    }
  }
  add(svg, 'text', { x: 78, y: 29, fill: '#496e74', 'font-size': 13, 'font-weight': 700 }, annual ? 'Refiner crude cost · $/barrel' : 'WTI crude benchmark · $/barrel');
  add(svg, 'text', { x: 78, y: 174, fill: '#83513f', 'font-size': 13, 'font-weight': 700 }, annual ? 'Leaded regular retail · $/gallon' : 'Gasoline wholesale benchmark and retail · $/gallon');
  const ticks = annual ? ['1973-07-01', '1974-07-01'] : useMonthly ? [start, ...Array.from({ length: 8 }, (_, i) => `${1995 + i * 5}-01-01`).filter(date => date <= end), end] : [start, end];
  ticks.forEach(date => {
    add(svg, 'line', { x1: x(date), x2: x(date), y1: 280, y2: 286, stroke: '#8a9b98' });
    add(svg, 'text', { x: x(date), y: 308, 'text-anchor': 'middle', fill: '#607078', 'font-size': 12 }, useMonthly || annual ? date.slice(0, 4) : fmtDate(date));
  });
  if (win.marker) {
    add(svg, 'line', { x1: x(win.marker), x2: x(win.marker), y1: 35, y2: 278, stroke: '#a6644f', 'stroke-width': 1.4, 'stroke-dasharray': '5 5' });
    add(svg, 'text', { x: x(win.marker) + 5, y: 329, fill: '#83513f', 'font-size': 11 }, fmtDate(win.marker));
  }
  series.forEach(item => {
    if (!item.rows.length) return;
    const y = scales[item.panel];
    if (annual) item.rows.forEach(row => add(svg, 'circle', { cx: x(row.date), cy: y(row.value), r: 5, fill: item.color }));
    else add(svg, 'path', { d: item.rows.map((row, i) => `${i ? 'L' : 'M'}${x(row.date).toFixed(1)},${y(row.value).toFixed(1)}`).join(' '), fill: 'none', stroke: item.color, 'stroke-width': item.panel === 'crude' ? 2.4 : 2, 'stroke-linejoin': 'round' });
  });
  const display = (row, unit) => row ? `${money(row.value, unit === 'barrel' ? 2 : 3)}${dollarMode === 'real' ? ` (${money(row.original, unit === 'barrel' ? 2 : 3)} at the time)` : ''}` : 'not available';
  const inspect = date => {
    const c = closest(crude, date), n = closest(national, date), w = closest(wholesale, date), r = closest(region, date);
    const anchor = n || c;
    $('chart-readout').textContent = `${useMonthly ? monthLabel(anchor.date.slice(0, 7)) : annual ? anchor.date.slice(0, 4) : fmtDate(anchor.date)} · ${annual ? 'refiner crude cost' : 'WTI crude'} ${display(c, 'barrel')}/barrel${annual ? '' : ` · NY Harbor wholesale ${display(w, 'gallon')}/gal`} · U.S. ${annual ? 'leaded regular' : 'pump'} ${display(n, 'gallon')}/gal${r ? ` · ${regionName} pump ${display(r, 'gallon')}/gal` : ''}.`;
  };
  const hover = add(svg, 'rect', { x: 78, y: 36, width: 862, height: 242, fill: 'transparent', tabindex: 0, role: 'button', 'aria-label': 'Inspect historical prices; use arrow keys to move through time' });
  hover.addEventListener('pointermove', event => {
    const rect = svg.getBoundingClientRect();
    const svgX = (event.clientX - rect.left) / rect.width * 1000;
    inspect(minDate + Math.max(0, Math.min(1, (svgX - 78) / 862)) * (maxDate - minDate));
  });
  let keyboardDate = Date.parse(national.at(-1).date);
  hover.addEventListener('focus', () => inspect(keyboardDate));
  hover.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); keyboardDate = Math.max(minDate, Math.min(maxDate, keyboardDate + (event.key === 'ArrowRight' ? 1 : -1) * (useMonthly ? 30 : annual ? 365 : 7) * 86400000)); inspect(keyboardDate);
  });
  if (annual) $('chart-note').textContent = '1973–74 uses annual refiner acquisition cost and leaded regular pump averages. Dots cannot show a monthly lag.';
  else $('chart-note').textContent = `Weekly EIA observations${useMonthly ? ' are averaged by calendar month for the full-history view; the latest month may be partial' : ''}. WTI is a benchmark, not a refinery’s crude cost. NY Harbor spot gasoline is one wholesale market, not a national wholesale average. ${dollarMode === 'real' ? 'Months without a published CPI are omitted.' : ''} No future prices are drawn.`;
  inspect(Date.parse(win.marker || national.at(-1).date));
}
function selectWindow(id, scroll = false) {
  active = id;
  window.showPriceMode?.('history');
  document.querySelectorAll('[data-window]').forEach(button => button.classList.toggle('active', button.dataset.window === id));
  renderChart();
  if (scroll) $('prices').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => selectWindow(button.dataset.window)));
document.querySelectorAll('[data-dollar-mode]').forEach(button => button.addEventListener('click', () => {
  dollarMode = button.dataset.dollarMode;
  document.querySelectorAll('[data-dollar-mode]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  renderChart();
}));
$('compare-month').addEventListener('input', renderChart);
window.addEventListener('region-selected', e => { selectedRegion = e.detail.key; regionName = e.detail.name; renderChart(); });
function renderEvent(id = '2001') {
  const event = events.find(item => item.id === id);
  $('events').innerHTML = events.map(item => `<button class="event ${item.id === id ? 'active' : ''}" type="button" data-event="${item.id}"><small>${item.year}</small><strong>${item.title}</strong><span>${item.teaser}</span></button>`).join('');
  $('events').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { renderEvent(button.dataset.event); selectWindow(button.dataset.event, true); }));
  $('event-detail').innerHTML = `<h3>${event.title}: what the data can and cannot show</h3>${event.html}<button id="use-event" type="button">Compare this pump price with inflation</button>`;
  $('use-event').addEventListener('click', () => { window.showPriceMode?.('history'); $('old-price').value = event.price; $('old-month').value = event.month; $('old-price').dispatchEvent(new Event('input')); $('inflation').scrollIntoView({ behavior: 'smooth' }); });
}
renderEvent();
Promise.all([fetch(`./assets/data/eia-weekly.json?loaded=${Date.now()}`, { cache: 'no-store' }).then(response => response.json()), fetch('./assets/data/cpi.json').then(response => response.json())]).then(([measured, prices]) => { data = measured; cpi = prices; renderChart(); }).catch(() => { $('chart-readout').textContent = 'EIA or BLS price data could not load. Reload the page or inspect the source links.'; });
