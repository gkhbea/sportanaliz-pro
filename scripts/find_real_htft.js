const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

console.log('Total raw events:', rawEvents.length);

// Find markets with 9 outcomes (HT/FT has 9 outcomes: 1/1, 1/X, 1/2, X/1, X/X, X/2, 2/1, 2/X, 2/2)
// or market names containing "İlk Yarı / Maç Sonucu" or similar
const htftMarkets = [];

rawEvents.forEach(e => {
    if (!e.HN || !e.AN || !e.MA) return;
    e.MA.forEach(m => {
        // Check if market has 9 outcomes
        if (m.OCA && m.OCA.length === 9) {
            htftMarkets.push({
                eventCode: e.C,
                home: e.HN,
                away: e.AN,
                day: e.D,
                time: e.T,
                mtid: m.MTID,
                outcomes: m.OCA.map(o => ({ n: o.N, on: o.ON, odd: o.O }))
            });
        }
    });
});

console.log('Total matches with 9 outcomes (HT/FT market):', htftMarkets.length);
if (htftMarkets.length > 0) {
    console.log('Sample MTID:', htftMarkets[0].mtid);
    console.log('First 15 matches with real open İY/MS in Nesine:');
    htftMarkets.slice(0, 15).forEach((item, idx) => {
        console.log(`${idx + 1}. [${item.eventCode}] ${item.home} vs ${item.away} (${item.day} ${item.time}) MTID: ${item.mtid}`);
        console.log('   Outcomes:', item.outcomes.map(o => `${o.n}: ${o.odd}`).join(', '));
    });
}
