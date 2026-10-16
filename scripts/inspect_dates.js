const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

const dateCounts = {};
const htftDateCounts = {};

rawEvents.forEach(e => {
    dateCounts[e.D] = (dateCounts[e.D] || 0) + 1;
    if (e.MA && e.MA.some(m => m.MTID === 5)) {
        htftDateCounts[e.D] = (htftDateCounts[e.D] || 0) + 1;
    }
});

console.log('Overall match counts by date:', dateCounts);
console.log('MTID 5 (HT/FT) match counts by date:', htftDateCounts);
