// Robust parser (v7) matching validated Python logic.
(function(){
  function txt(n){ return (n && n.textContent || '').replace(/\s+/g,' ').trim(); }
  function clean(s){ return (s||'').replace(/\s+/g,' ').trim(); }

  function isUnsettledSlip(slip){
    const t = txt(slip).toLowerCase();
    if (t.includes('not paid out')) return true;               // explicit positive
    if (t.includes('paid out'))       return false;            // negative only if not preceded by 'not'
    if (/\b(settled|lost|loss|won|payout|void(?:ed)?|returned|refund(?:ed)?|cancel(?:led)?|reject(?:ed)?|cash(?:ed)?\s*out)\b/i.test(t)) return false;
    return t.includes('unsettled');                            // fallback
  }

  function parseAmountPKR(s){
    const m = /(\d[\d,]*\.?\d*)\s*PKR/i.exec(s);
    return m ? parseFloat(m[1].replace(/,/g,'')) : null;
  }

  function extractStake(table){
    const tds = Array.from(table.querySelectorAll('td'));
    let last = null;
    for (const td of tds){
      const amt = parseAmountPKR(txt(td));
      if (amt!=null) last = amt;
    }
    return last;
  }

  function normalizeName(n){
    return (n||'').replace(/\s+/g,' ').trim().replace(/\.(?=\s|$)/g,'');
  }

  function normalizeEvent(comp, p1, p2, market){
    comp = (comp||'').replace(/^Tennis\.\s*/i,'').trim();
    p1 = normalizeName(p1); p2 = normalizeName(p2);
    market = (market||'').trim();
    if (/\bW1\b/i.test(market)) market = 'Match Winner — Player 1';
    else if (/\bW2\b/i.test(market)) market = 'Match Winner — Player 2';
    return [comp, `${p1} vs ${p2}`, market].filter(Boolean).join(' — ');
  }

  function extractLegs(table){
    const legs = [];
    const rows = Array.from(table.querySelectorAll('tr'));
    for (let i=0;i<rows.length;i++){
      const tr = rows[i];
      const ha = tr.querySelector('td.ha');
      if (!ha) continue;

      const b = ha.querySelector('b');
      let comp='', p1='', p2='';
      if (b){
        const parts = b.innerHTML.split('<br>');
        if (parts.length>=2){
          comp = clean(parts[0].replace(/<[^>]+>/g,''));
          const players = clean(parts[1].replace(/<[^>]+>/g,''));
          const arr = players.split(' - ');
          p1 = clean(arr[0]||''); p2 = clean(arr[1]||'');
        } else {
          const all = clean(b.textContent||'');
          const m = all.match(/^(.*)\s+([^-]+)\s-\s([^-]+)$/);
          if (m){ comp=clean(m[1]); p1=clean(m[2]); p2=clean(m[3]); }
        }
      }

      const ce = tr.querySelectorAll('td.ce');
      let market = ce.length ? txt(ce[0]) : '';
      let status = ce.length ? txt(ce[ce.length-1]).toLowerCase() : '';

      if (!status && i+1<rows.length){
        const ce2 = rows[i+1].querySelectorAll('td.ce');
        if (ce2.length) status = txt(ce2[ce2.length-1]).toLowerCase();
      }

      legs.push({ competition:comp, p1, p2, market, status });
    }
    return legs;
  }

  function parseHTMLToEvents(html){
    const out = [];
    const diag = [];

    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc || !doc.body) throw new Error('Invalid HTML');

    const slips = doc.querySelectorAll('div.cupHisNew');
    diag.push(`Found slips: ${slips.length}`);

    slips.forEach((slip, idx)=>{
      const table = slip.querySelector('div.hisFullProp table.table_prop');
      if (!table){ diag.push(`Slip ${idx+1}: no table`); return; }

      const stake = extractStake(table);
      const live = isUnsettledSlip(slip);
      diag.push(`Slip ${idx+1}: stake=${stake} unsettled=${live}`);
      if (!stake || !live) return;

      const legs = extractLegs(table);
      legs.forEach(leg=>{
        if (/\b(void(?:ed)?|refund(?:ed)?|returned|cancel(?:led)?)\b/i.test(leg.status)) return;
        const eventKey = normalizeEvent(leg.competition, leg.p1, leg.p2, leg.market);
        out.push({ eventKey, stakePKR: stake });
      });
    });

    diag.push(`Total legs parsed: ${out.length}`);
    return { rows: out, diagnostics: diag.join('\n') };
  }

  window.parseHTMLToEvents = parseHTMLToEvents;
})();