const $ = (id) => document.getElementById(id);
const regions = {
  east: { name: 'East Coast', price: 2.980, color: '#b4d9ca', states: 'ME NH VT MA RI CT NY PA NJ DE MD DC VA WV NC SC GA FL'.split(' '), detail: 'The East Coast receives fuel through refineries, ports, pipelines, and terminals. Distance to supply, local fuel rules, taxes, disruptions, and competition can change the price you see.' },
  mid: { name: 'Midwest', price: 2.944, color: '#9bbbd2', states: 'OH IN IL MI WI MN IA MO KS NE SD ND OK KY TN'.split(' '), detail: 'Midwestern supply is connected by refineries, pipelines, terminals, and rail or truck distribution. Prices can move differently when local refinery or pipeline capacity is constrained.' },
  gulf: { name: 'Gulf Coast', price: 2.677, color: '#f0c891', states: 'TX LA AR MS AL NM'.split(' '), detail: 'The Gulf Coast has a large concentration of refining and petroleum infrastructure. That helps explain its lower 2025 regional average, though storms and outages can quickly disrupt supply.' },
  rocky: { name: 'Rocky Mountain', price: 3.022, color: '#cfb6d5', states: 'MT ID WY UT CO'.split(' '), detail: 'Mountain states are connected to a smaller regional refining and transport network. Geography, fuel movements, taxes, and local market conditions all affect prices.' },
  west: { name: 'West Coast', price: 4.094, color: '#dfaa9d', states: 'WA OR CA NV AZ AK HI'.split(' '), detail: 'West Coast prices reflect fuel specifications, taxes, operating costs, and supply constraints as well as transport distance. California’s special blend can limit substitutions during outages.' }
};
const regionFor = (abbr) => Object.keys(regions).find(key => regions[key].states.includes(abbr));
let features = [], zipLookup = {}, cpi = {}, chosenState = null, eia = null, statePrices = null, supply = null, origins = null;
const heatBands = [
  { max: 3, color: '#e5eee8', label: 'Under $3.00' },
  { max: 3.25, color: '#c0d7cc', label: '$3.00–$3.24' },
  { max: 3.5, color: '#94bdb0', label: '$3.25–$3.49' },
  { max: 4, color: '#659a8e', label: '$3.50–$3.99' },
  { max: Infinity, color: '#336f6b', label: '$4.00+' }
];
const heatColor = price => heatBands.find(band => price < band.max)?.color || '#e5eee8';
document.querySelectorAll('.mode-nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.mode-nav a').forEach(item => item.classList.toggle('active', item === link));
  if (link.dataset.openMode) window.showPriceMode(link.dataset.openMode);
}));
function showPriceMode(mode) {
  const scenario = mode === 'scenario';
  $('history-pane').hidden = scenario;
  $('scenario-pane').hidden = !scenario;
  $('history-mode-tab').setAttribute('aria-selected', String(!scenario));
  $('scenario').setAttribute('aria-selected', String(scenario));
  $('history-mode-tab').tabIndex = scenario ? -1 : 0;
  $('scenario').tabIndex = scenario ? 0 : -1;
}
window.showPriceMode = showPriceMode;
document.querySelectorAll('[data-price-mode]').forEach(button => button.addEventListener('click', () => showPriceMode(button.dataset.priceMode)));
document.querySelector('.price-mode-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const target = event.key === 'ArrowLeft' || event.key === 'Home' ? $('history-mode-tab') : $('scenario');
  showPriceMode(target.dataset.priceMode); target.focus();
});
const mapToggle = $('map-toggle');
mapToggle.addEventListener('click', () => {
  const open = $('map-content').classList.toggle('open');
  mapToggle.setAttribute('aria-expanded', String(open));
  mapToggle.textContent = open ? 'Hide map' : 'Explore map';
});
$('state-select').addEventListener('change', event => selectState(event.target.value));
['layer-crude','layer-gas','layer-refineries','layer-prices'].forEach(id => $(id).addEventListener('change', drawMap));
$('supply-select').addEventListener('change', event => {
  if (!event.target.value) return;
  const [type, index] = event.target.value.split(':');
  inspectSupply(type, Number(index));
});

function project([lon, lat], abbr) {
  if (abbr === 'AK') return [24 + ((lon > 0 ? lon - 360 : lon) + 180) * 4.5, 410 + (72 - lat) * 5.1];
  if (abbr === 'HI') return [267 + (lon + 161) * 15, 490 + (23 - lat) * 18];
  return [91 + (lon + 125) * 13.9, 55 + (50 - lat) * 18.1];
}
function ringPath(ring, abbr) {
  return ring.map((point, index) => { const [x, y] = project(point, abbr); return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('') + 'Z';
}
function geometryPath(geometry, abbr) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map(polygon => polygon.map(ring => ringPath(ring, abbr)).join('')).join('');
}
function drawMap() {
  const svg = $('map');
  svg.innerHTML = '<text x="47" y="162" class="map-water-label">PACIFIC</text><text x="856" y="178" class="map-water-label">ATLANTIC</text><text x="540" y="566" class="map-water-label">GULF OF MEXICO</text>';
  for (const feature of features) {
    const { abbr, name } = feature.properties;
    const region = regions[regionFor(abbr)];
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', geometryPath(feature.geometry, abbr));
    const statePrice = statePrices?.states[abbr]?.pricePerGallon;
    const fill = $('layer-prices').checked && Number.isFinite(statePrice) ? heatColor(statePrice) : '#e5eee8';
    path.setAttribute('fill', fill);
    path.style.setProperty('--state-fill', fill);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('class', 'state');
    path.setAttribute('tabindex', '-1');
    path.setAttribute('aria-label', `${name}: ${Number.isFinite(statePrice) ? `$${statePrice.toFixed(2)} per gallon, 2024 EIA annual state estimate` : 'state estimate unavailable'}. ${region.name} petroleum region. Select for details.`);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${name} · 2024 estimate: ${Number.isFinite(statePrice) ? `$${statePrice.toFixed(2)}/gal` : 'unavailable'}`;
    path.append(title);
    path.dataset.abbr = abbr;
    path.addEventListener('click', () => selectState(abbr));
    path.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectState(abbr); } });
    svg.append(path);
  }
  if ($('layer-refineries').checked) supply.refineries.forEach((site, i) => {
    const [x, y] = project([site.lon, site.lat], site.state === 'Alaska' ? 'AK' : site.state === 'Hawaii' ? 'HI' : '');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', x); marker.setAttribute('cy', y); marker.setAttribute('r', '3.4');
    marker.setAttribute('class', 'refinery-marker'); marker.setAttribute('tabindex', '0');
    marker.setAttribute('aria-label', `${site.site}, ${site.state} refinery. ${site.capacityBpd.toLocaleString()} barrels per calendar day. Select for source.`);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `${site.site}, ${site.state} · ${site.capacityBpd.toLocaleString()} bbl/day`; marker.append(title);
    marker.addEventListener('click', () => inspectSupply('refinery', i));
    marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspectSupply('refinery', i); } });
    svg.append(marker);
  });
  supply.ports.forEach((port, i) => {
    const [x, y] = project([port.lon, port.lat], port.state);
    for (const [layer, value, offset, color] of [['crude',port.crudeForeignTons,-5,'crude'],['gas',port.gasolineForeignTons,5,'gas']]) {
      if (!$(`layer-${layer}`).checked || value <= 0) continue;
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('cx', x + offset); marker.setAttribute('cy', y); marker.setAttribute('r', Math.min(12, 3.5 + Math.sqrt(value / 1000000) * 2));
      marker.setAttribute('class', `port-marker ${color}`); marker.setAttribute('tabindex', '0');
      marker.setAttribute('aria-label', `${port.name}: ${value.toLocaleString()} short tons of foreign ${layer === 'gas' ? 'gasoline cargo' : 'crude petroleum'} received in 2024. Select for details.`);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); title.textContent = `${port.name} · ${layer === 'gas' ? 'gasoline cargo' : 'crude'} · ${(value / 1000000).toFixed(2)} million short tons`; marker.append(title);
      marker.addEventListener('click', () => inspectSupply('port', i));
      marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspectSupply('port', i); } });
      svg.append(marker);
    }
  });
  $('legend').hidden = !$('layer-prices').checked;
  $('legend').innerHTML = `<strong>2024 estimated state price / gallon</strong>${heatBands.map(band => `<span><i class="heat-swatch" style="background:${band.color}"></i>${band.label}</span>`).join('')}<a href="https://www.eia.gov/state/seds/sep_fuel/html/pdf/fuel_pr_mg.pdf" target="_blank" rel="noopener">EIA data ↗</a>`;
  $('states-list').innerHTML = features.map(f => `<option value="${f.properties.name}"></option>`).join('');
  $('state-select').innerHTML = `<option value="">Choose a state</option>${[...features].sort((a,b) => a.properties.name.localeCompare(b.properties.name)).map(f => `<option value="${f.properties.abbr}">${f.properties.name}</option>`).join('')}`;
}
function inspectSupply(type, index) {
  const item = type === 'port' ? supply.ports[index] : supply.refineries[index];
  $('supply-select').value = `${type}:${index}`;
  if (type === 'port') {
    $('supply-detail').innerHTML = `<strong>${item.name} · 2024 inbound waterborne cargo</strong><div class="cargo-pair"><span><b>Foreign crude petroleum</b><strong>${(item.crudeForeignTons / 1000000).toFixed(2)} million</strong><small>short tons</small></span><span><b>Foreign gasoline cargo</b><strong>${(item.gasolineForeignTons / 1000000).toFixed(2)} million</strong><small>short tons</small></span><span><b>Domestic crude petroleum</b><strong>${(item.crudeDomesticTons / 1000000).toFixed(2)} million</strong><small>short tons</small></span><span><b>Domestic gasoline cargo</b><strong>${(item.gasolineDomesticTons / 1000000).toFixed(2)} million</strong><small>short tons</small></span></div><p>USACE commodity 2100 vs 2211. Port boundaries vary. The gasoline category is not EIA's finished-gasoline-import measure. Specific origin country and onward destination are not reported in this table.</p><a href="${item.source}" target="_blank" rel="noopener">View this port's USACE table ↗</a>`;
  } else {
    $('supply-detail').innerHTML = `<strong>${item.site}, ${item.state}</strong><div class="cargo-pair"><span><b>Atmospheric crude capacity</b><strong>${item.capacityBpd.toLocaleString()}</strong><small>barrels per calendar day</small></span><span><b>Operator</b><strong class="operator">${item.company}</strong></span></div><p>${item.locationNote}. Capacity is not actual throughput or gasoline output. EIA snapshot: January 1, 2026.</p><a href="${supply.refinerySource}" target="_blank" rel="noopener">EIA refinery workbook ↗</a>`;
  }
}
function renderOrigins() {
  const product = $('origin-product').value;
  const data = origins[product];
  const remainder = data.total - data.countries.reduce((sum, [, value]) => sum + value, 0);
  const rows = [...data.countries, ['Other countries', remainder]];
  $('origin-bars').innerHTML = rows.map(([country, value]) => `<div class="origin-row"><span>${country}</span><div class="origin-track"><i style="width:${(value / data.total * 100).toFixed(2)}%;background:${product === 'crude' ? '#395f70' : '#b16c50'}"></i></div><b>${(value / data.total * 100).toFixed(1)}%</b></div>`).join('');
  $('origin-note').innerHTML = `2025 U.S. ${product === 'crude' ? 'crude oil' : 'finished motor gasoline'} imports: ${(data.total / 1000).toFixed(1)} million barrels. Bars show national origin shares, not shipments to a specific port. ${product === 'crude' ? 'Crude also enters by land pipeline, especially from Canada; the port circles show waterborne receipts only. ' : ''}<a href="${data.source}" target="_blank" rel="noopener">EIA country table ↗</a>`;
}
$('origin-product').addEventListener('change', renderOrigins);
function selectState(abbr) {
  const feature = features.find(f => f.properties.abbr === abbr);
  if (!feature) return;
  chosenState = abbr;
  const region = regions[regionFor(abbr)];
  const statePrice = statePrices?.states[abbr]?.pricePerGallon;
  $('state-price').textContent = Number.isFinite(statePrice) ? `$${statePrice.toFixed(2)}` : '—';
  $('state-price-scope').textContent = `2024 annual ${feature.properties.name} estimate · all motor gasoline · approximate dollars per gallon. Not today's regular price.`;
  $('region-name').textContent = region.name;
  $('state-name').textContent = `${feature.properties.name} · EIA petroleum region`;
  $('aaa-local').href = `https://gasprices.aaa.com/?state=${encodeURIComponent(abbr)}`;
  $('aaa-local').textContent = `See today's ${feature.properties.name} state, county, and metro averages at AAA ↗`;
  const key = regionFor(abbr);
  const latest = eia?.series[key]?.values.at(-1);
  $('region-price').textContent = latest ? `$${latest[1].toFixed(3)}` : '—';
  $('price-scope').textContent = latest ? `EIA ${latest[0]} survey for the whole ${region.name}; not a station quote. Published weekly.` : 'Latest weekly regional price is unavailable.';
  if (eia?.series[key]) $('regional-source').href = eia.series[key].url;
  $('region-detail').textContent = region.detail;
  $('place').value = feature.properties.name;
  $('state-select').value = abbr;
  $('search-message').textContent = `${feature.properties.name} selected · supply map / latest ${region.name} weekly average`;
  document.querySelectorAll('.state').forEach(path => path.classList.toggle('selected', path.dataset.abbr === abbr));
  window.dispatchEvent(new CustomEvent('region-selected', { detail: { key, name: region.name } }));
}
function findPlace() {
  const query = $('place').value.trim();
  const feature = features.find(f => f.properties.name.toLowerCase() === query.toLowerCase() || f.properties.abbr.toLowerCase() === query.toLowerCase());
  if (feature) { selectState(feature.properties.abbr); return; }
  if (/^\d{5}$/.test(query)) {
    if (zipLookup[query]) { selectState(zipLookup[query]); $('search-message').textContent = `Census ZIP-area ${query} maps to ${$('state-name').textContent.split(' · ')[0]}. This is an approximate geographic lookup.`; }
    else $('search-message').textContent = `No Census ZIP-area match for ${query}. Try a state name. Some postal ZIPs have no Census ZIP Code Tabulation Area.`;
  } else $('search-message').textContent = 'Enter a U.S. state name, two-letter code, or five-digit ZIP Code.';
}
$('region-search').addEventListener('submit', e => { e.preventDefault(); findPlace(); });

const steps = [
  { icon: '◉', name: 'Crude oil', sub: 'A globally traded input', title: 'A barrel is 42 gallons of crude oil', text: 'U.S. refineries process domestic and imported crude. One barrel typically yields about 19–20 gallons of finished motor gasoline, plus diesel, jet fuel, and other products. The whole barrel’s cost cannot be assigned only to gasoline.', link: 'https://www.eia.gov/TOOLS/FAQS/faq.php?id=327&t=10' },
  { icon: '▥', name: 'Refining', sub: 'Separate, convert, treat, blend', title: 'Refining turns crude into many products', text: 'The U.S. had 130 operable petroleum refineries as of January 1, 2026 (128 operating, two idle). Refineries separate crude into fractions, convert heavier material, remove impurities, and blend to product specifications. Their costs and margins vary with capacity, outages, and the fuels a region requires.', link: 'https://www.eia.gov/dnav/pet/pet_pnp_cap1_dcu_nus_a.htm' },
  { icon: '↝', name: 'Distribution', sub: 'Pipelines, ships, terminals, trucks', title: 'Finished fuel travels through a network', text: 'Gasoline moves from refineries and import points through pipelines, ships, terminals, and trucks. Distance can add cost, but local supply constraints and special fuel blends can matter more than miles alone.', link: 'https://www.eia.gov/energyexplained/gasoline/regional-price-differences.php' },
  { icon: '▤', name: 'At the pump', sub: 'Retail price and local conditions', title: 'The posted price includes more than crude', text: 'A station’s price reflects crude, refining, distribution and marketing, and taxes. Retail competition, inventories, and when a station replaces its supply also affect the timing and size of a price change.', link: 'https://www.eia.gov/petroleum/gasdiesel/pump_methodology.php' }
];
function renderSteps(selected = 0) {
  $('steps').innerHTML = steps.map((s, i) => `<button class="step ${i === selected ? 'active' : ''}" data-step="${i}" type="button" aria-pressed="${i === selected}" aria-controls="step-detail"><span class="symbol" aria-hidden="true">${s.icon}</span><b>${s.name}</b><small>${s.sub}</small></button>`).join('');
  $('steps').querySelectorAll('button').forEach(b => b.addEventListener('click', () => renderSteps(Number(b.dataset.step))));
  const s = steps[selected];
  $('step-detail').innerHTML = `<h3>${s.title}</h3><p>${s.text} <a href="${s.link}" target="_blank" rel="noopener">EIA source ↗</a></p>`;
}
renderSteps();

function renderScenario() {
  const shock = Number($('shock').value), pass = Number($('pass').value), delay = Number($('delay').value), spread = Number($('spread').value);
  const change = shock / 42 * pass / 100;
  $('shock-value').textContent = `${shock < 0 ? '−' : '+'}$${Math.abs(shock)} / barrel`;
  $('pass-value').textContent = `${pass}%`;
  $('delay-value').textContent = `${delay} ${delay === 1 ? 'week' : 'weeks'}`;
  $('spread-value').textContent = `${spread} ${spread === 1 ? 'week' : 'weeks'}`;
  $('scenario-total').textContent = `${change < 0 ? '−' : '+'} $${Math.abs(change).toFixed(2)} / gallon`;
  const points = Array.from({ length: 13 }, (_, week) => [week, Math.max(0, Math.min(1, (week - delay) / spread))]);
  const y = fraction => 88 - fraction * (change < 0 ? -62 : 62);
  const x = week => 46 + week * 75;
  const path = points.map(([week, fraction], i) => `${i ? 'L' : 'M'}${x(week)},${y(fraction)}`).join(' ');
  $('chart').innerHTML = `<line x1="46" y1="88" x2="964" y2="88" stroke="#a9bab5"/><line x1="46" y1="${y(1)}" x2="964" y2="${y(1)}" stroke="#d8ded9" stroke-dasharray="5 6"/><line x1="${x(delay)}" y1="22" x2="${x(delay)}" y2="156" stroke="#d8ded9" stroke-dasharray="5 6"/><text x="4" y="92" fill="#607078" font-size="13">0</text><text x="4" y="${y(1)+4}" fill="#607078" font-size="13">${change < 0 ? '−' : '+'}${Math.abs(change).toFixed(2)}</text><path d="${path}" fill="none" stroke="#a6644f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(12)}" cy="${y(points[12][1])}" r="7" fill="#a6644f"/><text x="${Math.min(x(delay)+9,730)}" y="18" fill="#607078" font-size="12">response begins</text><text x="750" y="170" fill="#83513f" font-size="13">illustrative pump change</text>`;
  $('chart').setAttribute('aria-label', `Illustrative ${change < 0 ? 'decrease' : 'increase'} of ${Math.abs(change).toFixed(2)} dollars per gallon, beginning after ${delay} ${delay === 1 ? 'week' : 'weeks'} and spreading over ${spread} ${spread === 1 ? 'week' : 'weeks'}`);
}
['shock','pass','delay','spread'].forEach(id => $(id).addEventListener('input', renderScenario));
renderScenario();

function renderInflation() {
  const amount = Number($('old-price').value), from = $('old-month').value, to = $('compare-month').value;
  if (!Number.isFinite(amount) || amount < 0 || !cpi[from] || !cpi[to]) {
    $('adjusted').textContent = '—';
    $('inflation-formula').textContent = 'Choose months with published CPI values and enter a nonnegative price. October 2025 was not published in this BLS series.';
    return;
  }
  const converted = amount * cpi[to] / cpi[from];
  $('adjusted').textContent = `$${converted.toFixed(2)} / gallon`;
  $('inflation-formula').textContent = `$${amount.toFixed(3)} × CPI ${to} (${cpi[to].toFixed(3)}) ÷ CPI ${from} (${cpi[from].toFixed(3)}). This compares general purchasing power, not gasoline market conditions.`;
}
['old-price','old-month','compare-month'].forEach(id => $(id).addEventListener('input', renderInflation));

Promise.all([
  fetch('./assets/data/states.geojson').then(r => r.json()),
  fetch('./assets/data/zip-state.json').then(r => r.json()),
  fetch('./assets/data/cpi.json').then(r => r.json()),
  fetch(`./assets/data/eia-weekly.json?loaded=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
  fetch('./assets/data/eia-state-2024.json').then(r => r.json()),
  fetch('./assets/data/supply-map.json').then(r => r.json()),
  fetch('./assets/data/import-origins-2025.json').then(r => r.json())
]).then(([geo, zips, prices, measured, stateData, supplyData, originData]) => {
  features = geo.features; zipLookup = zips; cpi = prices; eia = measured; statePrices = stateData; supply = supplyData; origins = originData;
  $('supply-select').innerHTML = '<option value="">Choose a site</option><optgroup label="Ports">' + supply.ports.map((p, i) => `<option value="port:${i}">${p.name}</option>`).join('') + '</optgroup><optgroup label="Refineries">' + supply.refineries.map((r, i) => `<option value="refinery:${i}">${r.site}, ${r.state} · ${r.company}</option>`).join('') + '</optgroup>';
  drawMap(); renderOrigins(); $('footer-data-date').textContent = `From Barrel to Pump · USACE ports ${supply.portYear} · EIA refineries 2026 · weekly prices retrieved ${eia.retrieved} · CPI through August 2026`; selectState('IL'); renderInflation();
}).catch(() => {
  $('search-message').textContent = 'Map data could not load. Please reload the page.';
  $('inflation-formula').textContent = 'CPI data could not load. Please reload the page.';
});
