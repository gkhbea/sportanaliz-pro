const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));
const events = bulten.sg.EA || [];
const leagues = bulten.sg.LA || [];
const leagueMap = new Map();
leagues.forEach(l => leagueMap.set(l.LID, l));

const realFootball = events.filter(e => e.GT === 1 && e.TYPE === 1);
console.log('Total real football matches:', realFootball.length);

const upcoming = [];
realFootball.forEach(e => {
    const l = leagueMap.get(e.LC) || { N: 'Bilinmeyen Lig', CC: '' };
    // Market odds
    let ms1 = '-', msX = '-', ms2 = '-', u25 = '-', o25 = '-', kgVar = '-', kgYok = '-', u15 = '-', o15 = '-';
    (e.MA || []).forEach(m => {
        // Market NO or N
        const mName = m.N || '';
        // 1: MS, 5: 2.5 Alt/Üst, 8: KG, 4: 1.5 Alt/Üst
        if (m.ID === 1 || mName.includes('Maç Sonucu')) {
            (m.OCA || []).forEach(o => {
                if (o.N === '1') ms1 = o.O;
                if (o.N === 'X' || o.N === '0') msX = o.O;
                if (o.N === '2') ms2 = o.O;
            });
        }
        if (m.ID === 5 || mName.includes('2.5')) {
            (m.OCA || []).forEach(o => {
                if (o.N === 'Alt' || o.N === 'A') u25 = o.O;
                if (o.N === 'Üst' || o.N === 'Ü') o25 = o.O;
            });
        }
        if (m.ID === 4 || mName.includes('1.5')) {
            (m.OCA || []).forEach(o => {
                if (o.N === 'Alt' || o.N === 'A') u15 = o.O;
                if (o.N === 'Üst' || o.N === 'Ü') o15 = o.O;
            });
        }
        if (m.ID === 8 || mName.includes('Karşılıklı')) {
            (m.OCA || []).forEach(o => {
                if (o.N === 'Var' || o.N === 'V') kgVar = o.O;
                if (o.N === 'Yok' || o.N === 'Y') kgYok = o.O;
            });
        }
    });

    upcoming.push({
        code: e.C,
        date: e.D,
        time: e.T,
        home: e.HN,
        away: e.AN,
        league: l.N,
        country: l.CC,
        mbs: e.EMBS || e.MBS || 1,
        odds: { ms1, msX, ms2, o15, o25, u25, kgVar, kgYok }
    });
});

console.log('Upcoming matches parsed:', upcoming.length);

// Sort by date and time
upcoming.sort((a, b) => {
    const da = a.date.split('.').reverse().join('-') + ' ' + a.time;
    const db = b.date.split('.').reverse().join('-') + ' ' + b.time;
    return da.localeCompare(db);
});

// Let's filter matches for tonight (01.11.2026 >= 19:45) and 02.11.2026
const targetMatches = upcoming.filter(m => {
    if (m.date === '01.11.2026') {
        return m.time >= '19:45';
    }
    if (m.date === '02.11.2026') {
        return true;
    }
    return false;
});

console.log('\n================ TARGET REAL FOOTBALL MATCHES (TONIGHT & TOMORROW) ================');
console.log('Count:', targetMatches.length);

targetMatches.forEach(m => {
    console.log(`[Kod: ${m.code}] ${m.date} ${m.time} | ${m.league} (${m.country}) | ${m.home} vs ${m.away} | MBS: ${m.mbs} | MS1: ${m.odds.ms1} X: ${m.odds.msX} MS2: ${m.odds.ms2} | 2.5Ü: ${m.odds.o25} | KG-Var: ${m.odds.kgVar}`);
});

