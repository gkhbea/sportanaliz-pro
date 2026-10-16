const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data_cache/nesine_bulten_today_2026-10-16.json', 'utf8'));
const rawEvents = raw?.sg?.EA || [];

const foundEvents = rawEvents.filter(e => {
    const s = JSON.stringify(e);
    return s.includes('3273994') || s.includes('Cercle') || s.includes('Hasselt');
});

console.log('Matches matching 3273994 / Cercle / Hasselt:', foundEvents.length);
foundEvents.forEach(e => {
    console.log('C:', e.C, 'HN:', e.HN, 'AN:', e.AN, 'TYPE:', e.TYPE, 'LE:', e.LE);
    console.log('MA length:', e.MA?.length);
    (e.MA || []).forEach(m => {
        console.log('  MTID:', m.MTID, 'OCA:', JSON.stringify(m.OCA));
    });
});
