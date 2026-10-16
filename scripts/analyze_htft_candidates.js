const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

const htftNames = {
  1: '1/1',
  2: '1/X',
  3: '1/2',
  4: 'X/1',
  5: 'X/X',
  6: 'X/2',
  7: '2/1',
  8: '2/X',
  9: '2/2'
};

const oct16 = events.filter(e => (e.D || '').includes('16.10.2026'));
const list = [];

oct16.forEach(e => {
  const ma = e.MA || [];
  const ma5 = ma.find(m => m.MTID === 5);
  const ma1 = ma.find(m => m.MTID === 1);
  if (ma5 && ma5.OCA) {
    const htft = {};
    ma5.OCA.forEach(o => htft[htftNames[o.N]] = o.O);
    const ms = {};
    if (ma1 && ma1.OCA) {
      ma1.OCA.forEach(o => {
        if (o.N === 1) ms['1'] = o.O;
        if (o.N === 2) ms['X'] = o.O;
        if (o.N === 3) ms['2'] = o.O;
      });
    }
    list.push({
      code: e.C,
      home: e.HN,
      away: e.AN,
      time: e.T,
      league: e.LN || e.BC || '',
      ms,
      htft
    });
  }
});

// Sort by time
list.sort((a,b) => (a.time || '').localeCompare(b.time || ''));

list.forEach(m => {
  console.log(`[Kod: ${m.code}] ${m.time} | ${m.league} | ${m.home} vs ${m.away}`);
  console.log(`   MS: 1=${m.ms['1']}, X=${m.ms['X']}, 2=${m.ms['2']}`);
  console.log(`   İY/MS: 1/1=${m.htft['1/1']} | X/1=${m.htft['X/1']} | X/X=${m.htft['X/X']} | X/2=${m.htft['X/2']} | 2/2=${m.htft['2/2']}`);
  console.log(`----------------------------------------------------------------------`);
});
