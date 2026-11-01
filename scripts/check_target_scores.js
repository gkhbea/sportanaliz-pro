const fs = require('fs');
const path = require('path');

const scoresPath = path.join(__dirname, '..', 'data_cache', 'live_scores_feed_today.json');
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
const matches = scores.matches || scores || [];

const targetTeams = ['Juventus', 'Napoli', 'Braga', 'Famalicao', 'Elche', 'Valencia', 'Boca', 'River', 'Gremio', 'Belgrano', 'Newcastle', 'Atalanta', 'Benfica'];
console.log('--- CANLI VE BİTEN MAÇ SKORLARI ---');
matches.forEach(m => {
    const h = m.homeTeam || m.HN || m.home || '';
    const a = m.awayTeam || m.AN || m.away || '';
    if (targetTeams.some(t => (h && h.includes(t)) || (a && a.includes(t)))) {
        const sc = m.score || `${m.homeScore ?? ''} - ${m.awayScore ?? ''}`.trim() || 'Bekliyor';
        const st = m.status || m.state || 'Bitti/Canlı';
        console.log(`[${st}] ${h} ${sc} ${a}`);
    }
});
