const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

const sand = events.find(e => (e.HN||'').toLowerCase().includes('sandhausen') || (e.AN||'').toLowerCase().includes('sandhausen') || (e.HN||'').toLowerCase().includes('offenbach') || (e.AN||'').toLowerCase().includes('offenbach'));
console.log('Sandhausen found:', sand ? `${sand.C} ${sand.HN} vs ${sand.AN} (D: ${sand.D})` : 'None');
