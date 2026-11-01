const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

const premier = events.filter(e => {
    const l = leagueMap.get(e.LC);
    return l && (l.N.includes('Premier') || l.N.includes('Şampiyonlar') || l.N.includes('Serie A') || l.N.includes('La Liga') || l.N.includes('Bundesliga') || l.N.includes('Süper Lig'));
});

console.log('Found premier/top league events count:', premier.length);
premier.forEach(e => {
    const l = leagueMap.get(e.LC);
    console.log(`[${e.C}] ${e.D} ${e.T} | ${l.N} | ENN: ${e.ENN} | HN: ${e.HN} AN: ${e.AN} | GT: ${e.GT} | TYPE: ${e.TYPE}`);
    if (e.MA && e.MA.length > 0) {
        console.log('   Markets count:', e.MA.length);
        const ms = e.MA.find(m => m.N && m.N.includes('Maç Sonucu')) || e.MA[0];
        if (ms) {
            console.log(`   Market: ${ms.N} -> Odds:`, (ms.OCA || []).map(o => `${o.N}: ${o.O}`).join(', '));
        }
    }
});

