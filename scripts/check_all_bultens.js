const fs = require('fs');

const files = [
    'data_cache/nesine_bulten_today_2026-10-16.json',
    'data_cache/nesine_bulten_today_2026-10-15.json',
    'data_cache/default_bulten.json'
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
    const rawEvents = raw?.sg?.EA || [];
    console.log(`\n=== File: ${f} (Total events: ${rawEvents.length}) ===`);
    
    // Find events with MTID === 5
    const withM5 = rawEvents.filter(e => e.HN && e.AN && e.MA && e.MA.some(m => m.MTID === 5 && m.OCA?.length === 9));
    console.log(`  Events with MTID 5 (Futbol İY/MS): ${withM5.length}`);
    
    // Group by date
    const dates = {};
    withM5.forEach(e => {
        dates[e.D] = (dates[e.D] || 0) + 1;
    });
    console.log('  Dates with MTID 5:', dates);

    // Also check which of our current coupon matches exist in this file and what MTIDs they have
    const sampleMatches = ['Standard Liege', 'Westerlo', 'Guingamp', 'Chaves', 'Braga', 'Hasselt', 'Cartagena', 'Larne', 'Ruch Chorzow'];
    console.log('  Checking sample coupon teams:');
    sampleMatches.forEach(team => {
        const found = rawEvents.find(e => (e.HN && e.HN.includes(team)) || (e.AN && e.AN.includes(team)));
        if (found) {
            const mtids = (found.MA || []).map(m => m.MTID);
            const hasM5 = mtids.includes(5);
            console.log(`    - ${team}: [${found.C}] ${found.HN} vs ${found.AN} (${found.D} ${found.T}) | Markets: ${found.MA?.length} | İY/MS (MTID 5) Açık mı?: ${hasM5 ? 'EVET' : 'HAYIR'}`);
        } else {
            console.log(`    - ${team}: BULUNAMADI`);
        }
    });
});
