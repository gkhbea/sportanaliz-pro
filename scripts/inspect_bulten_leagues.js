const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));

console.log('Keys of b.sg:', Object.keys(bulten.sg));
if (bulten.sg.LA) {
    console.log('LA length:', bulten.sg.LA.length);
    console.log('First 3 of LA:', JSON.stringify(bulten.sg.LA.slice(0, 3), null, 2));
}

if (bulten.nsn) {
    console.log('Keys of bulten.nsn:', Object.keys(bulten.nsn));
    console.log('Sample nsn:', JSON.stringify(Object.values(bulten.nsn)[0] || {}, null, 2).slice(0, 500));
}

