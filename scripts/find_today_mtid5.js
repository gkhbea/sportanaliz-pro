const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

console.log('Searching for 16.10.2026 matches with MTID === 5 (Futbol İY/MS)...');
const todayHtFt = [];

rawEvents.forEach(e => {
    if (!e.HN || !e.AN || !e.MA) return;
    // Check if date is 16.10.2026
    const isToday = e.D === '16.10.2026';
    const htftMarket = e.MA.find(m => m.MTID === 5 && m.OCA && m.OCA.length === 9);
    if (htftMarket) {
        todayHtFt.push({
            date: e.D,
            time: e.T,
            code: e.C,
            home: e.HN,
            away: e.AN,
            leagueId: e.LC,
            isToday,
            outcomes: htftMarket.OCA.map(o => ({ n: o.N, on: o.ON, odd: o.O }))
        });
    }
});

console.log('Total matches with MTID 5 across all dates:', todayHtFt.length);
const only16th = todayHtFt.filter(m => m.isToday);
console.log('Matches on 16.10.2026 with REAL OPEN İY/MS (MTID 5):', only16th.length);

only16th.forEach((m, idx) => {
    console.log(`\n${idx + 1}. [${m.code}] ${m.home} vs ${m.away} (${m.date} ${m.time})`);
    m.outcomes.forEach(o => {
        const labels = ['', '1/1', '1/X', '1/2', 'X/1', 'X/X', 'X/2', '2/1', '2/X', '2/2'];
        console.log(`     ${labels[o.n] || o.n}: ${o.odd}`);
    });
});
