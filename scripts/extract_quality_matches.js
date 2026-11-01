const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

const topLeaguesAndTeams = [
    // Major Leagues
    'İtalya Serie A', 'İspanya La Liga', 'İngiltere Premier Lig', 'Fransa Ligue 1', 
    'Almanya Bundesliga', 'Portekiz Premier Lig', 'Hollanda Eredivisie', 'Belçika Pro Lig',
    'Arjantin Primera LPF, Kapanış', 'Brezilya Serie A', 'Danimarka Süper Ligi', 
    'Yunanistan Süper Lig', 'İskoçya Premier Lig', 'İspanya 2. Lig', 'Fransa Ligue 2',
    'Türkiye Süper Lig'
];

const parsedMatches = [];

events.forEach(e => {
    if (e.GT !== 1 || e.TYPE !== 1) return; // Only real football
    const l = leagueMap.get(e.LC) || { N: '', CC: '' };
    
    // Check if league is prestigious or recognizable
    const isTopLeague = topLeaguesAndTeams.some(tl => l.N.toLowerCase().includes(tl.toLowerCase()));
    
    // Also check famous teams
    const home = e.HN || '';
    const away = e.AN || '';
    const famousNames = [
        'juventus', 'napoli', 'milan', 'inter', 'roma', 'lazio', 'atalanta', 'fiorentina',
        'real madrid', 'barcelona', 'atletico', 'valencia', 'sevilla', 'athletic', 'betis', 'elche',
        'liverpool', 'arsenal', 'manchester', 'chelsea', 'tottenham', 'newcastle', 'everton',
        'bayern', 'dortmund', 'leipzig', 'leverkusen', 'frankfurt',
        'psg', 'marseille', 'lyon', 'monaco', 'lille', 'brest', 'lorient',
        'porto', 'benfica', 'sporting', 'braga', 'famalicao', 'guimaraes',
        'ajax', 'psv', 'feyenoord', 'alkmaar',
        'boca', 'river', 'palmeiras', 'flamengo', 'gremio', 'santos', 'vasco', 'corinthians',
        'paok', 'panathinaikos', 'aek', 'olympiakos',
        'brondby', 'copenhagen', 'midtjylland', 'aarhus',
        'gent', 'bruges', 'anderlecht', 'standard'
    ];
    const isFamousTeam = famousNames.some(fn => home.toLowerCase().includes(fn) || away.toLowerCase().includes(fn));

    if (!isTopLeague && !isFamousTeam) return;

    // Filter time: 01.11.2026 >= 19:45 or 02.11.2026
    if (e.D === '01.11.2026' && e.T < '19:45') return;

    // Extract odds
    let ms1 = null, msX = null, ms2 = null;
    let cs1X = null, csX2 = null;
    let o25 = null, u25 = null;
    let o15 = null, u15 = null;
    let kgVar = null, kgYok = null;

    (e.MA || []).forEach(m => {
        // MS: MTID 1
        if (m.MTID === 1) {
            (m.OCA || []).forEach(o => {
                if (o.N === 1) ms1 = o.O;
                if (o.N === 2) msX = o.O;
                if (o.N === 3) ms2 = o.O;
            });
        }
        // CS: MTID 3
        if (m.MTID === 3) {
            (m.OCA || []).forEach(o => {
                if (o.N === 1) cs1X = o.O;
                if (o.N === 3) csX2 = o.O;
            });
        }
        // 2.5 Alt/Üst: MTID 455 or MTID 12
        if (m.MTID === 455 || m.MTID === 12) {
            (m.OCA || []).forEach(o => {
                if (o.N === 1) u25 = o.O;
                if (o.N === 2) o25 = o.O;
            });
        }
        // KG: MTID 450 or MTID 8
        if (m.MTID === 450 || m.MTID === 8) {
            (m.OCA || []).forEach(o => {
                if (o.N === 1) kgVar = o.O;
                if (o.N === 2) kgYok = o.O;
            });
        }
        // 1.5 Alt/Üst: MTID 457 or MTID 14
        if (m.MTID === 457 || m.MTID === 14) {
            (m.OCA || []).forEach(o => {
                if (o.N === 1) u15 = o.O;
                if (o.N === 2) o15 = o.O;
            });
        }
    });

    parsedMatches.push({
        code: e.C,
        date: e.D,
        time: e.T,
        league: l.N,
        country: l.CC,
        home,
        away,
        mbs: e.EMBS || e.MBS || 1,
        odds: { ms1, msX, ms2, cs1X, csX2, o25, u25, o15, kgVar, kgYok }
    });
});

// Sort by date and time
parsedMatches.sort((a, b) => {
    const da = a.date.split('.').reverse().join('-') + ' ' + a.time;
    const db = b.date.split('.').reverse().join('-') + ' ' + b.time;
    return da.localeCompare(db);
});

console.log('Total Quality Matches Found:', parsedMatches.length);
console.log(JSON.stringify(parsedMatches, null, 2));

