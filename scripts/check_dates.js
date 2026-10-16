const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];
const dateCounts = {};
events.forEach(e => {
  dateCounts[e.D] = (dateCounts[e.D] || 0) + 1;
});
console.log('Date distribution in f15:', dateCounts);
