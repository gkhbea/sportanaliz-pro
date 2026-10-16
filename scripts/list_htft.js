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
const htftList = [];

oct16.forEach(e => {
  const ma = e.MA || [];
  const ma5 = ma.find(m => m.MTID === 5);
  const ma1 = ma.find(m => m.MTID === 1);
  if (ma5 && ma5.OCA) {
    const odds = {};
    ma5.OCA.forEach(o => {
      odds[htftNames[o.N]] = o.O;
    });
    const msOdds = {};
    if (ma1 && ma1.OCA) {
      ma1.OCA.forEach(o => {
        if (o.N === 1) msOdds['MS1'] = o.O;
        if (o.N === 2) msOdds['MSX'] = o.O;
        if (o.N === 3) msOdds['MS2'] = o.O;
      });
    }
    htftList.push({
      code: e.C,
      home: e.HN,
      away: e.AN,
      time: e.T,
      msOdds,
      htftOdds: odds
    });
  }
});

console.log(`Found ${htftList.length} matches with MTID 5 on 16.10.2026:`);
htftList.forEach((m, idx) => {
  console.log(`${idx+1}. [${m.code}] ${m.home} vs ${m.away} (${m.time}) | MS: 1=${m.msOdds.MS1||'-'}, X=${m.msOdds.MSX||'-'}, 2=${m.msOdds.MS2||'-'}`);
  console.log(`   1/1: ${m.htftOdds['1/1']}, X/1: ${m.htftOdds['X/1']}, X/X: ${m.htftOdds['X/X']}, X/2: ${m.htftOdds['X/2']}, 2/2: ${m.htftOdds['2/2']}`);
});
