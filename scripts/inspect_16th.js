const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

const todayEvents = rawEvents.filter(e => e.D === '16.10.2026');
console.log('Total events on 16.10.2026:', todayEvents.length);

todayEvents.forEach((e, idx) => {
    const markets = e.MA || [];
    const mtids = markets.map(m => m.MTID);
    console.log(`${idx + 1}. [${e.C}] ${e.HN} vs ${e.AN} (${e.T}) TYPE:${e.TYPE} | Markets: ${markets.length} | MTIDs: ${mtids.join(',')}`);
});
