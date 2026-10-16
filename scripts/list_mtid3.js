const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = (data.sg && data.sg.EA ? data.sg.EA : []).filter(e => (e.D || '').includes('16.10.2026'));

console.log('--- VERIFIED DOUBLE CHANCE (MTID 3) with Odd >= 1.20 and <= 1.50 ---');
events.forEach(e => {
  const ma3 = (e.MA || []).find(m => m.MTID === 3);
  if (ma3 && ma3.OCA) {
    ma3.OCA.forEach(o => {
      if (o.O >= 1.20 && o.O <= 1.45) {
        const type = o.N === 1 ? '1-X' : (o.N === 2 ? '1-2' : 'X-2');
        console.log(`[Kod: ${e.C}] ${e.T} | ${e.HN} vs ${e.AN} | ${type} @ ${o.O}`);
      }
    });
  }
});
