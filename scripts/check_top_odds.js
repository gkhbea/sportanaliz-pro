const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

const candidateCodes = [
    // Tonight Top Matches
    '3259141', // Juventus vs Napoli
    '3258867', // Braga vs Famalicao
    '3259275', // Palmeiras vs Vasco
    '3258620', // Gremio vs Atl Mineiro
    '3258277', // Belgrano vs Barracas
    '3254563', // Gremio Novo vs Operario
    '3253309', // Medellin vs Alianza Valledupar
    // Tomorrow Top Matches
    '3262120', // Newcastle vs Everton
    '3262167', // Atalanta vs Parma
    '3262056', // Benfica vs Alverca
    '3254536', // Lorient vs Brest
    '3258713', // Dep. La Coruna vs Osasuna
    '3258685', // Mallorca vs Cadiz
    '3262213', // Gil Vicente vs Guimaraes
    '3253418', // Red Star vs Nancy
    '3354433', // Reims vs Sochaux
    '3262151', // Jong PSV vs NAC Breda
    '3262341', // Jong Ajax vs Vitesse
    '3266672'  // Bragantino vs Santos
];

console.log('--- VERIFYING CANDIDATE TOP MATCHES ---');
candidateCodes.forEach(code => {
    const e = events.find(ev => String(ev.C) === code);
    if (!e) {
        console.log(`[${code}] NOT FOUND IN BULLETIN!`);
        return;
    }
    const l = leagueMap.get(e.LC) || { N: '' };
    console.log(`\n[${code}] ${e.D} ${e.T} | ${l.N} | ${e.HN} vs ${e.AN} (MBS: ${e.EMBS || e.MBS || 1})`);
    
    // Check key markets: MTID 1 (MS), MTID 3 (CS), MTID 455/12 (2.5 ÜST), MTID 457/14 (1.5 ÜST), MTID 450/8 (KG)
    (e.MA || []).forEach(m => {
        if (m.MTID === 1) {
            console.log('   MS (MTID 1):', (m.OCA || []).map(o => `MS${o.N === 1 ? '1' : o.N === 2 ? 'X' : '2'}: ${o.O}`).join(' | '));
        }
        if (m.MTID === 3) {
            console.log('   ÇŞ (MTID 3):', (m.OCA || []).map(o => `CS${o.N === 1 ? '1X' : o.N === 2 ? '12' : 'X2'}: ${o.O}`).join(' | '));
        }
        if (m.MTID === 455 || m.MTID === 12) {
            console.log('   2.5 Gol (MTID ' + m.MTID + '):', (m.OCA || []).map(o => `${o.N === 1 ? 'ALT' : 'ÜST'}: ${o.O}`).join(' | '));
        }
        if (m.MTID === 457 || m.MTID === 14) {
            console.log('   1.5 Gol (MTID ' + m.MTID + '):', (m.OCA || []).map(o => `${o.N === 1 ? 'ALT' : 'ÜST'}: ${o.O}`).join(' | '));
        }
        if (m.MTID === 450 || m.MTID === 8) {
            console.log('   KG (MTID ' + m.MTID + '):', (m.OCA || []).map(o => `${o.N === 1 ? 'VAR' : 'YOK'}: ${o.O}`).join(' | '));
        }
    });
});

