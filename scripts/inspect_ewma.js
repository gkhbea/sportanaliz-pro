const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));

if (bulten.sg.EWMA) {
    console.log('EWMA length:', bulten.sg.EWMA.length);
    console.log('First 5 EWMA:', JSON.stringify(bulten.sg.EWMA.slice(0, 5), null, 2));
}

