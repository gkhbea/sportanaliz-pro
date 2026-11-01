const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];

// Find any market that has MN or N
const marketsWithNames = new Map();
events.forEach(e => {
    (e.MA || []).forEach(m => {
        if (m.MN || m.N) {
            marketsWithNames.set(m.NO, m.MN || m.N);
        }
    });
});

console.log('Markets with names count:', marketsWithNames.size);
Array.from(marketsWithNames.entries()).slice(0, 30).forEach(([no, name]) => {
    console.log(`NO: ${no} -> Name: ${name}`);
});

