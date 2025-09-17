if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

const fileInput = document.getElementById('fileInput');
const statusEl  = document.getElementById('status');
const tableBody = document.querySelector('#resultsTable tbody');
const sortHeaders = Array.from(document.querySelectorAll('#resultsTable th[data-key]'));
const searchBox = document.getElementById('searchBox');
const clearBtn  = document.getElementById('clearBtn');
const resetBtn  = document.getElementById('resetBtn');
const pillEvents = document.getElementById('pillEvents');
const pillExposure = document.getElementById('pillExposure');
const diagEl    = document.getElementById('diag');
const spinner   = document.getElementById('spinner');
const comboSelects = [
  document.getElementById('comboSelect1'),
  document.getElementById('comboSelect2'),
  document.getElementById('comboSelect3')
];
const comboCountEl   = document.getElementById('comboCount');
const comboStakeEl   = document.getElementById('comboStake');
const comboMessageEl = document.getElementById('comboMessage');
const topPairsBody   = document.querySelector('#topPairsTable tbody');
const topPairsEmpty  = document.getElementById('topPairsEmpty');

let rawEvents = [];
let aggRows   = [];
let rawSlips  = [];
let comboTimer = null;
let hasParsedData = false;
let topPairs = [];
const aggDefaultSort = { key: 'total', asc: false };
let aggSortState = { ...aggDefaultSort };

function setStatus(msg){ statusEl.textContent = msg || ''; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtPKR(n){ return new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(n); }

function mapSlips(slips){
  return (slips || []).map((slip, idx) => {
    const stake = Number(slip && slip.stakePKR) || 0;
    const rawList = slip && Array.isArray(slip.events) ? slip.events.filter(Boolean) : [];
    const events = Array.from(new Set(rawList));
    const slipId = slip && slip.slipId ? String(slip.slipId) : `slip-${idx+1}`;
    return { slipId, stakePKR: stake, events, eventSet: new Set(events) };
  });
}

function buildPairStats(slips){
  const pairMap = new Map();
  (slips || []).forEach(slip => {
    if (!slip || !Array.isArray(slip.events)) return;
    const events = slip.events.filter(Boolean);
    if (events.length < 2) return;
    const sorted = Array.from(new Set(events)).sort((a,b)=> a.localeCompare(b));
    for (let i=0; i<sorted.length-1; i++){
      for (let j=i+1; j<sorted.length; j++){
        const a = sorted[i];
        const b = sorted[j];
        const key = `${a}|||${b}`;
        const entry = pairMap.get(key) || { events: [a,b], count: 0, totalStake: 0 };
        entry.count += 1;
        entry.totalStake += Number(slip.stakePKR) || 0;
        pairMap.set(key, entry);
      }
    }
  });

  return Array.from(pairMap.values())
    .sort((a,b)=>{
      if (b.count !== a.count) return b.count - a.count;
      if (b.totalStake !== a.totalStake) return b.totalStake - a.totalStake;
      const nameA = `${a.events[0]}|||${a.events[1]}`;
      const nameB = `${b.events[0]}|||${b.events[1]}`;
      return nameA.localeCompare(nameB);
    })
    .slice(0,5);
}

function uniqueEventsList(){
  return Array.from(new Set(rawEvents.map(r => r.eventKey))).sort((a,b)=> a.localeCompare(b));
}

function scheduleComboRecalc(){
  if (comboTimer) clearTimeout(comboTimer);
  comboTimer = setTimeout(runComboCalculation, 220);
}

function runComboCalculation(){
  comboTimer = null;
  const selections = comboSelects.map(sel => sel ? sel.value : '').filter(Boolean);
  const uniqueSelections = Array.from(new Set(selections));

  if (!rawEvents.length){
    comboCountEl.textContent = '—';
    comboStakeEl.textContent = '—';
    comboMessageEl.textContent = hasParsedData ? 'No unsettled accumulators available.' : 'Import slips to get started.';
    return;
  }

  if (selections.length < 2){
    comboCountEl.textContent = '—';
    comboStakeEl.textContent = '—';
    comboMessageEl.textContent = 'Select at least two events to calculate overlap.';
    return;
  }

  if (uniqueSelections.length !== selections.length){
    comboCountEl.textContent = '—';
    comboStakeEl.textContent = '—';
    comboMessageEl.textContent = 'Choose distinct events to compare overlap.';
    return;
  }

  if (!rawSlips.length){
    comboCountEl.textContent = '0';
    comboStakeEl.textContent = fmtPKR(0);
    comboMessageEl.textContent = 'No unsettled accumulators available.';
    return;
  }

  const matches = rawSlips.filter(slip => uniqueSelections.every(ev => slip.eventSet.has(ev)));
  const count = matches.length;
  const total = matches.reduce((sum, slip) => sum + (slip.stakePKR || 0), 0);

  comboCountEl.textContent = String(count);
  comboStakeEl.textContent = fmtPKR(total);
  if (count){
    comboMessageEl.textContent = `Found ${count} unsettled accumulator${count === 1 ? '' : 's'} with every selected event.`;
  } else {
    comboMessageEl.textContent = 'No unsettled accumulators contain every selected event.';
  }
}

function updateComboSelectors(){
  const events = uniqueEventsList();
  const previous = comboSelects.map(sel => sel.value);

  comboSelects.forEach((sel, idx) => {
    if (!sel) return;
    const docFrag = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select event…';
    docFrag.appendChild(placeholder);

    events.forEach(event => {
      const opt = document.createElement('option');
      opt.value = event;
      opt.textContent = event;
      docFrag.appendChild(opt);
    });

    sel.innerHTML = '';
    sel.appendChild(docFrag);
    const prev = previous[idx];
    if (prev && events.includes(prev)){
      sel.value = prev;
    } else {
      sel.value = '';
    }
    sel.disabled = events.length === 0;
  });

  scheduleComboRecalc();
}

function applyAggSort(){
  const { key, asc } = aggSortState;
  aggRows.sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      return asc ? va - vb : vb - va;
    }
    return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

function updateSortIndicators(){
  const { key, asc } = aggSortState;
  sortHeaders.forEach(header => {
    if (header.dataset.key === key){
      header.classList.toggle('asc', asc);
      header.classList.toggle('desc', !asc);
      header.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
    } else {
      header.classList.remove('asc', 'desc');
      header.setAttribute('aria-sort', 'none');
    }
  });
}

function renderAggregates({ rebuild = false } = {}) {
  if (rebuild) {
    const map = new Map();
    for (const r of rawEvents) {
      const key = r.eventKey;
      const stake = r.stakePKR || 0;
      const cur = map.get(key) || { event: key, total: 0, count: 0 };
      cur.total += stake;
      cur.count += 1;
      map.set(key, cur);
    }
    aggRows = Array.from(map.values());
    aggSortState = { ...aggDefaultSort };
    applyAggSort();
  }

  const q = (searchBox.value || '').toLowerCase().trim();
  const source = q ? aggRows.filter(r => r.event.toLowerCase().includes(q)) : aggRows;

  let rowsHtml = '';
  if (source.length) {
    rowsHtml = source.map(r => `
      <tr>
        <td>${escapeHtml(r.event)}</td>
        <td class="num">${fmtPKR(r.total)}</td>
        <td class="num">${r.count}</td>
      </tr>
    `).join('');
  } else {
    const rawQuery = (searchBox.value || '').trim();
    const message = aggRows.length
      ? (q ? `No events match “${escapeHtml(rawQuery)}”.` : 'No events to display yet.')
      : (hasParsedData ? 'No unsettled events were recognised in the latest import.' : 'Import slips to populate the dashboard.');
    rowsHtml = `
      <tr class="empty-row">
        <td colspan="3">${message}</td>
      </tr>
    `;
  }

  tableBody.innerHTML = rowsHtml;

  if (aggRows.length) {
    pillEvents.textContent = `${aggRows.length} events`;
    const totalStake = aggRows.reduce((s, r) => s + r.total, 0);
    pillExposure.textContent = `Total ${fmtPKR(totalStake)}`;
  } else {
    pillEvents.textContent = '—';
    pillExposure.textContent = '—';
  }

  updateSortIndicators();
}

function renderTopPairs(){
  if (!topPairsBody || !topPairsEmpty) return;
  if (!topPairs.length){
    topPairsBody.innerHTML = '';
    topPairsEmpty.textContent = hasParsedData
      ? 'No qualifying two-leg accumulator pairs found yet.'
      : 'Import slips to surface the top accumulator pairs.';
    topPairsEmpty.classList.remove('hidden');
    return;
  }

  const rows = topPairs.map((pair, idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${escapeHtml(pair.events[0])}</td>
      <td>${escapeHtml(pair.events[1])}</td>
      <td class="num">${pair.count}</td>
      <td class="num">${fmtPKR(pair.totalStake)}</td>
    </tr>
  `).join('');

  topPairsBody.innerHTML = rows;
  topPairsEmpty.classList.add('hidden');
}

async function parseAndRender(htmlText){
  spinner.classList.remove('hidden');
  setStatus('Parsing…');
  try{
    const { rows, slips, diagnostics } = window.parseHTMLToEvents(htmlText);
    diagEl.textContent = diagnostics || '';
    rawEvents = rows || [];
    rawSlips = mapSlips(slips);
    topPairs = buildPairStats(rawSlips);
    hasParsedData = true;
    renderAggregates({ rebuild: true });
    updateComboSelectors();
    renderTopPairs();
    setStatus('Done');
  }catch(err){
    setStatus('Parse error');
    diagEl.textContent = String(err && err.message || err);
    rawEvents = [];
    rawSlips = [];
    aggRows = [];
    hasParsedData = false;
    topPairs = [];
    renderAggregates({ rebuild: true });
    updateComboSelectors();
    renderTopPairs();
  } finally {
    spinner.classList.add('hidden');
  }
}

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  setStatus('Reading file…');
  const text = await f.text();
  await parseAndRender(text);
});

document.querySelectorAll('#resultsTable th').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (!key) return;
    const asc = aggSortState.key === key ? !aggSortState.asc : true;
    aggSortState = { key, asc };
    applyAggSort();
    renderAggregates();
  });
});

updateSortIndicators();

searchBox.addEventListener('input', () => renderAggregates());
clearBtn.addEventListener('click', ()=>{ searchBox.value=''; renderAggregates(); });
resetBtn.addEventListener('click', ()=>{
  rawEvents = []; aggRows=[]; rawSlips=[]; topPairs=[]; tableBody.innerHTML='';
  pillEvents.textContent='—'; pillExposure.textContent='—';
  diagEl.textContent=''; setStatus(''); fileInput.value='';
  searchBox.value='';
  hasParsedData = false;
  aggSortState = { ...aggDefaultSort };
  renderAggregates({ rebuild: true });
  updateComboSelectors();
  renderTopPairs();
});

comboSelects.forEach(sel => {
  if (!sel) return;
  sel.addEventListener('change', scheduleComboRecalc);
});

renderAggregates();
renderTopPairs();
