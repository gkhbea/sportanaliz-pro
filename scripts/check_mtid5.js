const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

// Check markets definition or market types in data.sg
console.log('data.sg keys:', Object.keys(data.sg));
if (data.sg.EWMA) {
  console.log('data.sg.EWMA count:', data.sg.EWMA.length);
  const m5 = data.sg.EWMA.find(m => m.MTID === 5 || m.ID === 5);
  console.log('EWMA m5:', m5);
}

// Let's inspect MTID 5 outcomes for one match
const sample = events.find(e => (e.MA||[]).some(m => m.MTID === 5));
if (sample) {
  const m5 = sample.MA.find(m => m.MTID === 5);
  console.log('Sample match:', sample.HN, 'vs', sample.AN);
  console.log('m5:', JSON.stringify(m5, null, 2));
}
