const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = (data.sg && data.sg.EA ? data.sg.EA : []).filter(e => (e.D || '').includes('16.10.2026'));

console.log(`Analyzing ${events.length} events on 16.10.2026 for odds >= 1.20...`);

// 1. Double Chance (MTID 3)
console.log('\n--- VERIFIED DOUBLE CHANCE (MTID 3) with Odd >= 1.20 ---');
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

// 2. Over 2.5 (MTID 12)
console.log('\n--- VERIFIED OVER 2.5 (MTID 12) with Odd >= 1.20 and <= 1.55 ---');
events.forEach(e => {
  const ma12 = (e.MA || []).find(m => m.MTID === 12);
  if (ma12 && ma12.OCA) {
    const o25 = ma12.OCA.find(o => o.N === 2); // Over
    if (o25 && o25.O >= 1.20 && o25.O <= 1.55) {
      console.log(`[Kod: ${e.C}] ${e.T} | ${e.HN} vs ${e.AN} | 2.5 ÜST @ ${o25.O}`);
    }
  }
});

// 3. Match Result (MTID 1)
console.log('\n--- VERIFIED MATCH RESULT (MTID 1) with Odd >= 1.20 and <= 1.70 ---');
events.forEach(e => {
  const ma1 = (e.MA || []).find(m => m.MTID === 1);
  if (ma1 && ma1.OCA) {
    ma1.OCA.forEach(o => {
      if (o.O >= 1.20 && o.O <= 1.65) {
        const side = o.N === 1 ? 'MS 1' : (o.N === 3 ? 'MS 2' : 'MS X');
        console.log(`[Kod: ${e.C}] ${e.T} | ${e.HN} vs ${e.AN} | ${side} @ ${o.O}`);
      }
    });
  }
});
