const fs = require('fs');
const path = require('path');

const bulten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_cache', 'nesine_bulten_today.json'), 'utf8'));

if (bulten.sg.FB) {
    console.log('FB keys/sample:', JSON.stringify(bulten.sg.FB).slice(0, 500));
}

