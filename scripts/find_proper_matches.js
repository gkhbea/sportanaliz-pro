const fs = require('fs');
const path = require('path');

const bultenPath = path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json');
const b = JSON.parse(fs.readFileSync(bultenPath, 'utf8'));
const events = (b.sg && b.sg.EA) ? b.sg.EA : [];

console.log('Total events in bulten:', events.length);

const results = [];
events.forEach(ev => {
    const home = ev.HN || '';
    const away = ev.AN || '';
    const league = ev.LN || '';
    const dateStr = ev.D || '';
    const timeStr = ev.T || '';
    const mbs = ev.EMBS || ev.MBS || 1;
    const code = ev.C;

    let ms1 = '-', msX = '-', ms2 = '-', u25 = '-', o25 = '-', kgVar = '-', kgYok = '-';
    let u15 = '-', o15 = '-', u35 = '-', o35 = '-';
    if (ev.MA) {
        ev.MA.forEach(m => {
            const mName = m.N || '';
            const mId = m.ID;
            if (mId === 1 || mName.includes('Maç Sonucu')) {
                (m.OCA || []).forEach(o => {
                    if (o.N === '1') ms1 = o.O;
                    if (o.N === 'X') msX = o.O;
                    if (o.N === '2') ms2 = o.O;
                });
            }
            if (mId === 5 || mName.includes('2.5 Alt/Üst') || mName.includes('2.5 Gol')) {
                (m.OCA || []).forEach(o => {
                    if (o.N === 'Alt') u25 = o.O;
                    if (o.N === 'Üst') o25 = o.O;
                });
            }
            if (mName.includes('1.5 Alt/Üst') || mName.includes('1.5 Gol')) {
                (m.OCA || []).forEach(o => {
                    if (o.N === 'Alt') u15 = o.O;
                    if (o.N === 'Üst') o15 = o.O;
                });
            }
            if (mId === 8 || mName.includes('Karşılıklı Gol')) {
                (m.OCA || []).forEach(o => {
                    if (o.N === 'Var') kgVar = o.O;
                    if (o.N === 'Yok') kgYok = o.O;
                });
            }
        });
    }

    results.push({
        code,
        home,
        away,
        league,
        date: dateStr,
        time: timeStr,
        mbs,
        odds: { ms1, msX, ms2, o15, o25, u25, kgVar, kgYok }
    });
});

// Let's filter matches for today (01.11.2026) and upcoming tomorrow
const majorLeaguesKeywords = [
    'Premier', 'La Liga', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 
    'Süper Lig', 'Super Lig', 'Eredivisie', 'Liga Portugal', 'Championship', 
    'Brezilya', 'Arjantin', 'Fransa', 'İtalya', 'İspanya', 'İngiltere', 'Almanya', 
    'Türkiye', 'UEFA', 'Şampiyonlar', 'Avrupa', 'Belçika', 'Hollanda', 'Portekiz', 'İskoçya'
];

const topTeams = [
    'barcelona', 'real madrid', 'atletico', 'roma', 'juventus', 'inter', 'milan', 'napoli', 'lazio',
    'chelsea', 'arsenal', 'liverpool', 'manchester city', 'manchester utd', 'tottenham', 'newcastle', 'aston villa',
    'bayern', 'dortmund', 'leipzig', 'leverkusen', 'frankfurt',
    'psg', 'paris', 'lyon', 'marseille', 'monaco', 'lille',
    'galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'basaksehir',
    'porto', 'benfica', 'sporting', 'braga',
    'ajax', 'feyenoord', 'psv', 'alkmaar',
    'anderlecht', 'club brugge', 'gent', 'genk',
    'celtic', 'rangers',
    'boca juniors', 'river plate', 'racing club',
    'flamengo', 'palmeiras', 'sao paulo', 'corinthians', 'gremio', 'internacional', 'fluminense', 'botafogo', 'atletico mg'
];

const filtered = results.filter(r => {
    const l = r.league.toLowerCase();
    const h = r.home.toLowerCase();
    const a = r.away.toLowerCase();
    
    const isMajorLeague = majorLeaguesKeywords.some(k => l.includes(k.toLowerCase()));
    const isTopTeam = topTeams.some(t => h.includes(t) || a.includes(t));
    return isMajorLeague || isTopTeam;
});

console.log('Filtered top-tier matches count:', filtered.length);

filtered.forEach(m => {
    console.log(`[Kod: ${m.code}] Tarih: ${m.date} ${m.time} | Lig: ${m.league} | Maç: ${m.home} vs ${m.away} | MBS: ${m.mbs} | MS1: ${m.odds.ms1} X: ${m.odds.msX} MS2: ${m.odds.ms2} | 2.5Ü: ${m.odds.o25} | KG-Var: ${m.odds.kgVar}`);
});

