const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

const codes = [3264518, 3273974, 3210717, 3288435, 3273994];

codes.forEach(code => {
  const ev = events.find(e => e.C === code);
  if (!ev) {
    console.log(`Code ${code} NOT FOUND in bulletin!`);
  } else {
    const ma = ev.MA || [];
    const hasMtid5 = ma.some(m => m.MTID === 5);
    const mtids = ma.map(m => m.MTID);
    console.log(`[${ev.C}] ${ev.HN} vs ${ev.AN} (Date: ${ev.D} ${ev.T}): Total Markets: ${ma.length} | Has MTID 5 (İY/MS): ${hasMtid5}`);
    console.log(`   MTIDs present: ${mtids.join(', ')}`);
  }
});
