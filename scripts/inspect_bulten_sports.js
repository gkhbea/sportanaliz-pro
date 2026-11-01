const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = (bulten.sg && bulten.sg.EA) ? bulten.sg.EA : [];

console.log('Total events:', events.length);

// Look at the first 5 events to see the schema
console.log('Sample event structure:', JSON.stringify(events[0], null, 2));

// Check distinct sport types or tournament categories
const sports = new Set();
const leagues = new Set();
events.forEach(e => {
    if (e.ST) sports.add(e.ST);
    if (e.S) sports.add('S:' + e.S);
    if (e.LN) leagues.add(e.LN);
    if (e.TN) leagues.add('TN:' + e.TN);
});

console.log('Sports:', Array.from(sports));
console.log('Total distinct leagues/tournaments:', leagues.size);

