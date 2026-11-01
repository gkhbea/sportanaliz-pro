const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

console.log('Sample event with league:', events.find(e => e.LC && leagueMap.has(e.LC)));
console.log('Sample event fields:', Object.keys(events[10] || {}));

// Let's see all leagues with events today or tomorrow
const eventLeagues = new Map();
events.forEach(e => {
    // Check LC
    const l = leagueMap.get(e.LC);
    const lName = l ? l.N : 'Unknown LC: ' + e.LC;
    eventLeagues.set(lName, (eventLeagues.get(lName) || 0) + 1);
});

console.log('Top leagues by match count:');
const sorted = Array.from(eventLeagues.entries()).sort((a,b) => b[1] - a[1]);
console.log(sorted.slice(0, 30));

