if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

const fileInput = document.getElementById('fileInput');
const statusEl  = document.getElementById('status');
const tableBody = document.querySelector('#resultsTable tbody');
const searchBox = document.getElementById('searchBox');
const clearBtn  = document.getElementById('clearBtn');
const resetBtn  = document.getElementById('resetBtn');
const pillEvents = document.getElementById('pillEvents');
const pillExposure = document.getElementById('pillExposure');
const diagEl    = document.getElementById('diag');
const spinner   = document.getElementById('spinner');

let rawEvents = [];
let aggRows   = [];

function setStatus(msg){ statusEl.textContent = msg || ''; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtPKR(n){ return new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(n); }

function renderAggregates() {
  const map = new Map();
  for (const r of rawEvents) {
    const key = r.eventKey;
    const stake = r.stakePKR || 0;
    const cur = map.get(key) || {event: key, total: 0, count: 0};
    cur.total += stake;
    cur.count += 1;
    map.set(key, cur);
  }
  aggRows = Array.from(map.values()).sort((a,b)=> b.total - a.total);

  const q = (searchBox.value||'').toLowerCase().trim();
  const rows = q ? aggRows.filter(r => r.event.toLowerCase().includes(q)) : aggRows;

  tableBody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.event)}</td>
      <td class="num">${fmtPKR(r.total)}</td>
      <td class="num">${r.count}</td>
    </tr>
  `).join('');

  pillEvents.textContent   = `${aggRows.length} events`;
  const totalStake = aggRows.reduce((s,r)=>s+r.total,0);
  pillExposure.textContent = `Total ${fmtPKR(totalStake)}`;
}

async function parseAndRender(htmlText){
  spinner.classList.remove('hidden');
  setStatus('Parsing…');
  try{
    const { rows, diagnostics } = window.parseHTMLToEvents(htmlText);
    diagEl.textContent = diagnostics || '';
    rawEvents = rows || [];
    renderAggregates();
    setStatus('Done');
  }catch(err){
    setStatus('Parse error');
    diagEl.textContent = String(err && err.message || err);
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
    const asc = th.classList.toggle('asc');
    aggRows.sort((a,b)=>{
      const va = a[key], vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') return asc? va - vb : vb - va;
      return asc? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    renderAggregates();
  });
});

searchBox.addEventListener('input', renderAggregates);
clearBtn.addEventListener('click', ()=>{ searchBox.value=''; renderAggregates(); });
resetBtn.addEventListener('click', ()=>{
  rawEvents = []; aggRows=[]; tableBody.innerHTML='';
  pillEvents.textContent='—'; pillExposure.textContent='—';
  diagEl.textContent=''; setStatus(''); fileInput.value='';
});
