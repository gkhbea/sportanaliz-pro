const fs = require('fs');
const f15 = 'data_cache/nesine_bulten_today_2026-10-15.json';
const data = JSON.parse(fs.readFileSync(f15, 'utf8'));
const events = data.sg && data.sg.EA ? data.sg.EA : [];

const picks = [
  // Kupon 1
  { code: 3273974, name: 'Standard Liege vs FCV Dender EH', market: 'MS1', mtid: 1, outcome: 1, expectedOdd: 1.44 },
  { code: 3273984, name: 'Westerlo vs Patro M.', market: 'MS1', mtid: 1, outcome: 1, expectedOdd: 1.29 },
  { code: 3219736, name: 'D. Bükreş vs Botosani', market: 'MS1', mtid: 1, outcome: 1, expectedOdd: 1.31 },
  // Kupon 2
  { code: 3220099, name: 'NK Rudes vs Rijeka', market: 'MS2', mtid: 1, outcome: 3, expectedOdd: 1.22 },
  { code: 3210717, name: 'Guingamp vs Pau', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.22 },
  { code: 3216616, name: 'Widzew Lodz vs Wisla Krakow', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.21 },
  // Kupon 3
  { code: 3218030, name: 'E. Cottbus vs Nürnberg', market: 'OVER25', mtid: 12, outcome: 2, expectedOdd: 1.21 },
  { code: 3229835, name: 'Baniyas vs Al Wasl', market: 'OVER25', mtid: 12, outcome: 2, expectedOdd: 1.26 },
  { code: 3210706, name: 'Helmond vs NAC Breda', market: 'OVER25', mtid: 12, outcome: 2, expectedOdd: 1.23 },
  // Kupon 5
  { code: 3210984, name: 'MTK Budapeşte vs Vasas', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.22 },
  { code: 3217924, name: 'Larne vs Coleraine', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.21 },
  { code: 3210777, name: 'Aarhus Fremad vs Esbjerg', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.21 },
  { code: 3216783, name: 'Sandhausen vs Offenbacher', market: 'CS1X', mtid: 3, outcome: 1, expectedOdd: 1.21 },
  // Kupon 6
  { code: 3218481, name: 'Cartagena vs Europa', market: 'MS1', mtid: 1, outcome: 1, expectedOdd: 1.44 },
  { code: 3219278, name: 'Ruch Chorzow vs Odra Opole', market: 'MS1', mtid: 1, outcome: 1, expectedOdd: 1.61 },
  { code: 3217726, name: 'Ayr Utd vs P. Thistle', market: 'MS2', mtid: 1, outcome: 3, expectedOdd: 1.51 }
];

console.log('=== VERIFYING ALL EXISTING PICKS IN BULLETIN ===');
picks.forEach(p => {
  const ev = events.find(e => e.C === p.code);
  if (!ev) {
    console.log(`❌ [${p.code}] ${p.name} - NOT FOUND IN BULLETIN`);
    return;
  }
  const ma = ev.MA || [];
  const targetMarket = ma.find(m => m.MTID === p.mtid);
  if (!targetMarket) {
    console.log(`❌ [${p.code}] ${p.name} - MTID ${p.mtid} NOT OPEN (Only has MTIDs: ${ma.map(m=>m.MTID).join(',')})`);
    return;
  }
  const oc = (targetMarket.OCA || []).find(o => o.N === p.outcome);
  const actualOdd = oc ? oc.O : 'N/A';
  console.log(`✅ [${p.code}] ${p.name} | Market ${p.market} (MTID ${p.mtid}) OPEN! Official Odd: ${actualOdd} (Expected: ${p.expectedOdd})`);
});
