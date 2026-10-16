const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

console.log('--- ALL FOOTBALL MATCHES WITH MTID 5 (İY/MS) IN THIS BULLETIN ---');
const list = [];
rawEvents.forEach(e => {
    if (!e.HN || !e.AN || !e.MA) return;
    const m5 = e.MA.find(m => m.MTID === 5 && m.OCA && m.OCA.length === 9);
    if (m5) {
        list.push({
            code: e.C,
            date: e.D,
            time: e.T,
            home: e.HN,
            away: e.AN,
            htft: m5.OCA
        });
    }
});

console.log('Total matches with MTID 5:', list.length);
list.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.code}] ${m.home} vs ${m.away} (${m.date} ${m.time})`);
});
