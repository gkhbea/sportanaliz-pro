const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];

const juveMatch = events.find(e => String(e.C) === '3259141');
(juveMatch.MA || []).forEach(m => {
    console.log(`MTID: ${m.MTID}, NO: ${m.NO}, Outcomes:`, (m.OCA || []).map(o => `[N:${o.N}, O:${o.O}, ON:${o.ON}]`).join(', '));
});

