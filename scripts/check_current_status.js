const fs = require('fs');
const path = require('path');

const bultenPath = path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json');
const scoresPath = path.join(__dirname, '..', 'data_cache', 'live_scores_feed_today.json');

const bulten = JSON.parse(fs.readFileSync(bultenPath, 'utf8'));
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));

console.log('--- BULTEN & CANLI SKOR KONTROLÜ (02.11.2026) ---');
console.log('Nesine Bültendeki maç sayısı:', (bulten.sg && bulten.sg.EA) ? bulten.sg.EA.length : 0);
console.log('Canlı skor akışındaki maç sayısı:', (scores.matches || scores || []).length);

// Check upcoming matches for today (02.11.2026)
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

const todayMatches = events.filter(e => e.D === '02.11.2026' && e.GT === 1 && e.TYPE === 1);
console.log('02.11.2026 tarihindeki gerçek futbol maçları:', todayMatches.length);

todayMatches.slice(0, 15).forEach(m => {
    const l = leagueMap.get(m.LC) || { N: '' };
    console.log(`[${m.C}] ${m.T} | ${l.N} | ${m.HN} vs ${m.AN} (MBS: ${m.EMBS || m.MBS || 1})`);
});
