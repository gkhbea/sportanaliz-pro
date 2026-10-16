const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

const hasselt = events.find(e => (e.HN||'').includes('Hasselt') || (e.AN||'').includes('Hasselt'));
if (hasselt) {
  console.log('Found Sporting Hasselt:');
  console.log('Code:', hasselt.C, 'Teams:', hasselt.HN, 'vs', hasselt.AN, 'Date:', hasselt.D, hasselt.T);
  console.log('Market types in MA:');
  (hasselt.MA || []).forEach(m => {
    console.log(`  MTID: ${m.MTID}, SOV: ${m.SOV}, Name/Type: ${m.MT}, Outcomes count: ${(m.OCA||[]).length}`);
    (m.OCA || []).forEach(o => console.log(`     Outcome: N=${o.N}, O=${o.O}`));
  });
} else {
  console.log('Hasselt not found');
}
