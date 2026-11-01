const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];

const juveMatch = events.find(e => String(e.C) === '3259141');
console.log('Juve match details:', {
    C: juveMatch.C,
    HN: juveMatch.HN,
    AN: juveMatch.AN,
    D: juveMatch.D,
    T: juveMatch.T,
    EMBS: juveMatch.EMBS
});

console.log('Markets in Juve match:');
(juveMatch.MA || []).forEach(m => {
    console.log(`Market ID: ${m.ID}, NO: ${m.NO}, MN: ${m.MN}, N: ${m.N}`);
    console.log('   Odds:', (m.OCA || []).map(o => `[${o.N || o.NO}: ${o.O} (${o.ON || ''})]`).join(', '));
});

