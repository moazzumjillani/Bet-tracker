(function(){
  function normalizeName(n){ try{ n=n.normalize('NFC'); }catch(e){} return (n||'').replace(/\s+/g,' ').trim().replace(/\.(?=\s|$)/g,''); }
  function normalizeEvent(raw){
    const clean=s=> (s||'').replace(/\s+/g,' ').trim();
    let comp=clean(raw.competition), p1=normalizeName(clean(raw.p1)), p2=normalizeName(clean(raw.p2));
    let market=clean(raw.market), line=clean(raw.line), sel=clean(raw.selection);

    if(/^(w1|ml\s*player\s*1|money\s*line\s*player\s*1|player\s*1)$/i.test(market)||/^w1$/i.test(sel)){ market='Match Winner'; sel='Player 1'; }
    else if(/^(w2|ml\s*player\s*2|money\s*line\s*player\s*2|player\s*2)$/i.test(market)||/^w2$/i.test(sel)){ market='Match Winner'; sel='Player 2'; }
    else if(/\bml\b|money\s*line/i.test(market)){ market='Match Winner'; }

    if(/set(s)?\s*handicap|handicap\s*.*set/i.test(market)) market='Sets Handicap';
    if(/game(s)?\s*handicap|handicap\s*.*game/i.test(market)) market='Games Handicap';

    if(!line){ const m=raw.market && raw.market.match(/([+-]?\d+(?:\.\d+)?)/); if(m) line=m[1]; }
    line=(line||'').replace(/[()]/g,'').replace(/\s*games?\b/i,'').replace(/\s*sets?\b/i,'');

    if(!sel){ if(raw.market && /\bplayer\s*1\b/i.test(raw.market)) sel='Player 1'; if(raw.market && /\bplayer\s*2\b/i.test(raw.market)) sel='Player 2'; }
    if(!sel && raw.market && /\bw1\b/i.test(raw.market)) sel='Player 1';
    if(!sel && raw.market && /\bw2\b/i.test(raw.market)) sel='Player 2';

    return [comp.replace(/^Tennis\.\s*/i,'').replace(/\.+$/,'' )||'Tennis', `${p1} vs ${p2}`.trim(), market||'Market', line||'', sel||'']
      .map(s=>s.trim()).join(' — ').replace(/\s+—\s+—/g,' — ');
  }
  window.normalizeEvent=normalizeEvent;
})();