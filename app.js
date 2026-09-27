const $ = (id) => document.getElementById(id);
const regions = {
  east: { name: 'East Coast', price: 2.980, color: '#b4d9ca', states: 'ME NH VT MA RI CT NY PA NJ DE MD DC VA WV NC SC GA FL'.split(' '), detail: 'The East Coast receives fuel through refineries, ports, pipelines, and terminals. Distance to supply, local fuel rules, taxes, disruptions, and competition can change the price you see.' },
  mid: { name: 'Midwest', price: 2.944, color: '#9bbbd2', states: 'OH IN IL MI WI MN IA MO KS NE SD ND OK KY TN'.split(' '), detail: 'Midwestern supply is connected by refineries, pipelines, terminals, and rail or truck distribution. Prices can move differently when local refinery or pipeline capacity is constrained.' },
  gulf: { name: 'Gulf Coast', price: 2.677, color: '#f0c891', states: 'TX LA AR MS AL NM'.split(' '), detail: 'The Gulf Coast has a large concentration of refining and petroleum infrastructure. That helps explain its lower 2025 regional average, though storms and outages can quickly disrupt supply.' },
  rocky: { name: 'Rocky Mountain', price: 3.022, color: '#cfb6d5', states: 'MT ID WY UT CO'.split(' '), detail: 'Mountain states are connected to a smaller regional refining and transport network. Geography, fuel movements, taxes, and local market conditions all affect prices.' },
  west: { name: 'West Coast', price: 4.094, color: '#dfaa9d', states: 'WA OR CA NV AZ AK HI'.split(' '), detail: 'West Coast prices reflect fuel specifications, taxes, operating costs, and supply constraints as well as transport distance. California’s special blend can limit substitutions during outages.' }
};
const regionFor = (abbr) => Object.keys(regions).find(key => regions[key].states.includes(abbr));
let features = [], zipLookup = {}, cpi = {}, chosenState = null;

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
  svg.innerHTML = '<text x="110" y="43" class="map-water-label">PACIFIC</text><text x="851" y="198" class="map-water-label">ATLANTIC</text><text x="534" y="552" class="map-water-label">GULF OF MEXICO</text>';
  for (const feature of features) {
    const { abbr, name } = feature.properties;
    const region = regions[regionFor(abbr)];
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', geometryPath(feature.geometry, abbr));
    path.setAttribute('fill', region.color);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('class', 'state');
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', `${name}, ${region.name} region`);
    path.dataset.abbr = abbr;
    path.addEventListener('click', () => selectState(abbr));
    path.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectState(abbr); } });
    svg.append(path);
  }
  $('legend').innerHTML = Object.values(regions).map(r => `<span><i style="background:${r.color}"></i>${r.name}</span>`).join('');
  $('states-list').innerHTML = features.map(f => `<option value="${f.properties.name}"></option>`).join('');
}
function selectState(abbr) {
  const feature = features.find(f => f.properties.abbr === abbr);
  if (!feature) return;
  chosenState = abbr;
  const region = regions[regionFor(abbr)];
  $('region-name').textContent = region.name;
  $('state-name').textContent = `${feature.properties.name} · EIA petroleum region`;
  $('region-price').textContent = `$${region.price.toFixed(3)}`;
  $('region-detail').textContent = region.detail;
  $('place').value = feature.properties.name;
  $('search-message').textContent = `Showing ${feature.properties.name}. The price is the ${region.name} 2025 regional average.`;
  document.querySelectorAll('.state').forEach(path => path.classList.toggle('selected', path.dataset.abbr === abbr));
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
$('find').addEventListener('click', findPlace);
$('place').addEventListener('keydown', e => { if (e.key === 'Enter') findPlace(); });

const steps = [
  { icon: '◉', name: 'Crude oil', sub: 'A globally traded input', title: 'A barrel is 42 gallons of crude oil', text: 'U.S. refineries process domestic and imported crude. One barrel typically yields about 19–20 gallons of finished motor gasoline, plus diesel, jet fuel, and other products. The whole barrel’s cost cannot be assigned only to gasoline.', link: 'https://www.eia.gov/TOOLS/FAQS/faq.php?id=327&t=10' },
  { icon: '▥', name: 'Refining', sub: 'Separate, convert, treat, blend', title: 'Refining turns crude into many products', text: 'The U.S. had 130 operable petroleum refineries as of January 1, 2026 (128 operating, two idle). Refineries separate crude into fractions, convert heavier material, remove impurities, and blend to product specifications. Their costs and margins vary with capacity, outages, and the fuels a region requires.', link: 'https://www.eia.gov/dnav/pet/pet_pnp_cap1_dcu_nus_a.htm' },
  { icon: '↝', name: 'Distribution', sub: 'Pipelines, ships, terminals, trucks', title: 'Finished fuel travels through a network', text: 'Gasoline moves from refineries and import points through pipelines, ships, terminals, and trucks. Distance can add cost, but local supply constraints and special fuel blends can matter more than miles alone.', link: 'https://www.eia.gov/energyexplained/gasoline/regional-price-differences.php' },
  { icon: '▤', name: 'At the pump', sub: 'Retail price and local conditions', title: 'The posted price includes more than crude', text: 'A station’s price reflects crude, refining, distribution and marketing, and taxes. Retail competition, inventories, and when a station replaces its supply also affect the timing and size of a price change.', link: 'https://www.eia.gov/petroleum/gasdiesel/pump_methodology.php' }
];
function renderSteps(selected = 0) {
  $('steps').innerHTML = steps.map((s, i) => `<button class="step ${i === selected ? 'active' : ''}" data-step="${i}" type="button"><span class="symbol">${s.icon}</span><b>${s.name}</b><small>${s.sub}</small></button>`).join('');
  $('steps').querySelectorAll('button').forEach(b => b.addEventListener('click', () => renderSteps(Number(b.dataset.step))));
  const s = steps[selected];
  $('step-detail').innerHTML = `<b>${s.title}</b><p>${s.text} <a href="${s.link}" target="_blank" rel="noopener">EIA source ↗</a></p>`;
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
  const y = fraction => 240 - fraction * 165;
  const x = week => 47 + week * 52;
  const path = points.map(([week, fraction], i) => `${i ? 'L' : 'M'}${x(week)},${y(fraction)}`).join(' ');
  $('chart').innerHTML = `<line x1="47" y1="240" x2="680" y2="240" stroke="#aabbb8"/><line x1="47" y1="75" x2="680" y2="75" stroke="#d6e3dd" stroke-dasharray="5 5"/><text x="8" y="242" fill="#5e7078" font-size="13">0</text><text x="8" y="82" fill="#5e7078" font-size="13">${Math.abs(change).toFixed(2)}</text>${[0,2,4,6,8,10,12].map(w => `<text x="${x(w)-8}" y="268" fill="#5e7078" font-size="12">${w}</text>`).join('')}<path d="${path}" fill="none" stroke="#087f82" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(12)}" cy="${y(points[12][1])}" r="7" fill="#087f82"/><text x="600" y="55" fill="#365861" font-size="13">${change < 0 ? 'Decrease' : 'Increase'} magnitude</text>`;
  $('chart').setAttribute('aria-label', `Illustrative ${change < 0 ? 'decrease' : 'increase'} of ${Math.abs(change).toFixed(2)} dollars per gallon, beginning after ${delay} weeks and spreading over ${spread} weeks`);
}
['shock','pass','delay','spread'].forEach(id => $(id).addEventListener('input', renderScenario));
renderScenario();

const events = [
  { year: '1973–74', title: 'Oil embargo', teaser: 'National annual prices rose as supply tightened.', detail: 'The oil embargo and broader supply shock raised prices. EIA’s historical table reports a national annual average for leaded regular gasoline of $0.388 in 1973 and $0.532 in 1974. Annual averages smooth the fast changes within each year; leaded regular is a historical grade, not the same specification as today’s unleaded regular.', points: [['1973 annual', '$0.388'], ['1974 annual', '$0.532']], month: '1974-06', price: '0.532', source: 'https://www.eia.gov/totalenergy/data/annual/txt/ptb0524.html', sourceText: 'EIA Annual Energy Review, Table 5.24' },
  { year: '2001', title: 'After September 11', teaser: 'A major event did not create a lasting national pump-price spike.', detail: 'National weekly regular gasoline averaged $1.562 on September 10, $1.564 on September 17, and $1.522 on September 24. Initial local reports of sharp price increases do not describe the sustained national average. EIA’s October 2001 outlook discussed weakening demand and declining gasoline prices.', points: [['Sep 10', '$1.562'], ['Sep 17', '$1.564'], ['Sep 24', '$1.522']], month: '2001-09', price: '1.562', source: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg', sourceText: 'EIA weekly U.S. regular gasoline series' },
  { year: '2005', title: 'Hurricane Katrina', teaser: 'Refinery outages and product supply hit pump prices quickly.', detail: 'National weekly regular gasoline averaged $2.610 on August 29, $3.069 on September 5, and $2.955 on September 12. Katrina disrupted Gulf Coast refining and supply routes. This is a case where the gasoline supply shock mattered alongside crude prices.', points: [['Aug 29', '$2.610'], ['Sep 5', '$3.069'], ['Sep 12', '$2.955']], month: '2005-09', price: '3.069', source: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=w&n=pet&s=emm_epmr_pte_nus_dpg', sourceText: 'EIA weekly U.S. regular gasoline series' }
];
function renderEvent(selected = 0) {
  $('events').innerHTML = events.map((e, i) => `<button class="event ${i === selected ? 'active' : ''}" type="button" data-event="${i}"><small>${e.year}</small><strong>${e.title}</strong><span>${e.teaser}</span></button>`).join('');
  $('events').querySelectorAll('button').forEach(b => b.addEventListener('click', () => renderEvent(Number(b.dataset.event))));
  const e = events[selected];
  $('event-detail').innerHTML = `<h3>${e.title}</h3><p>${e.detail}</p><div class="event-points">${e.points.map(p => `<span>${p[0]}<b>${p[1]}</b></span>`).join('')}</div><p class="micro">${e.year === '1973–74' ? 'Annual leaded regular average; the month used for inflation is a midyear CPI proxy.' : 'Weekly national regular gasoline average; month used for inflation is the event month.'} <a href="${e.source}" target="_blank" rel="noopener">${e.sourceText} ↗</a></p><button id="use-event" type="button">Use this price in inflation comparison ↓</button>`;
  $('use-event').addEventListener('click', () => { $('old-price').value = e.price; $('old-month').value = e.month; renderInflation(); $('inflation').scrollIntoView({ behavior: 'smooth' }); });
}
renderEvent();

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
  fetch('./assets/data/cpi.json').then(r => r.json())
]).then(([geo, zips, prices]) => { features = geo.features; zipLookup = zips; cpi = prices; drawMap(); selectState('IL'); renderInflation(); }).catch(() => {
  $('search-message').textContent = 'Map data could not load. Please reload the page.';
  $('inflation-formula').textContent = 'CPI data could not load. Please reload the page.';
});
