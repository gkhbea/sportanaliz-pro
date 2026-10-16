const fs = require('fs');

const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const f16 = 'data_cache/nesine_bulten_today_2026-10-16.json';

[f15, f16].forEach(f => {
  console.log(`\n=================== ${f} ===================`);
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const events = data.sg && data.sg.EA ? data.sg.EA : [];
  console.log('Total events in EA:', events.length);
  
  const oct16 = events.filter(e => (e.D || '').includes('16.10.2026'));
  console.log('Events on 16.10.2026:', oct16.length);

  // Check market count and market types for oct16
  const footballOct16 = oct16.filter(e => e.TYPE === 1 || e.GT === 1 || (e.HN && e.AN));
  console.log('Football matches on 16.10.2026:', footballOct16.length);

  // Check markets in e.MA
  let mtid5Count = 0;
  footballOct16.forEach(e => {
    const ma = e.MA || [];
    const ma5 = ma.find(m => m.MTID === 5);
    if (ma5) {
      mtid5Count++;
      const ocs = ma5.OCA || ma5.OC || [];
      console.log(`[Kod: ${e.C}] ${e.HN} vs ${e.AN} (${e.T || ''}) | Market count: ${ma.length}`);
      console.log(`   MTID 5 keys:`, Object.keys(ma5), 'Outcomes count:', ocs.length);
      if (ocs.length > 0) {
        console.log(`   Sample outcomes:`, JSON.stringify(ocs.slice(0, 3)));
      }
    }
  });
  console.log(`Total MTID 5 matches on 16.10.2026: ${mtid5Count}`);
});
