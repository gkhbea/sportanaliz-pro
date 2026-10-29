const fs = require('fs');
const path = require('path');
const fetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : require('node-fetch');

const CACHE_DIR = path.join(__dirname, '..', 'data_cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function updateBulletin() {
    console.log('📡 [1/4] Nesine resmi bülteni canlı kaynaktan çekiliyor...');
    const url = 'https://cdnbulten.nesine.com/api/bulten/getprebultenfull';
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nesine.com/',
            'Origin': 'https://www.nesine.com'
        }
    });

    if (!res.ok) {
        throw new Error(`Nesine bülten çekme başarısız: HTTP ${res.status}`);
    }

    const data = await res.json();
    const eventCount = data?.sg?.EA?.length || 0;
    console.log(`✅ Nesine bülteni başarıyla çekildi. Toplam maç sayısı: ${eventCount}`);

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10); // '2026-10-29'
    
    // 1. Dosyalara yaz
    const todayPath = path.join(CACHE_DIR, `nesine_bulten_today_${todayIso}.json`);
    const genericPath = path.join(CACHE_DIR, 'nesine_bulten_today.json');
    const defaultPath = path.join(CACHE_DIR, 'default_bulten.json');

    const jsonStr = JSON.stringify(data);
    fs.writeFileSync(todayPath, jsonStr, 'utf8');
    fs.writeFileSync(genericPath, jsonStr, 'utf8');
    fs.writeFileSync(defaultPath, jsonStr, 'utf8');

    console.log(`💾 Bülten diske kaydedildi:\n  - ${path.basename(todayPath)}\n  - ${path.basename(genericPath)}\n  - ${path.basename(defaultPath)}`);
    return data;
}

updateBulletin().catch(err => {
    console.error('Bülten güncelleme hatası:', err);
    process.exit(1);
});
