const fs = require('fs');
const path = require('path');
const fetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : require('node-fetch');

const CACHE_DIR = path.join(__dirname, '..', 'data_cache');
const NesineService = require('../js/services/nesineService.js');
const CouponEngine = require('../js/analysis/couponEngine.js');

async function main() {
    console.log('🚀 [START] SportAnaliz Pro - Güncel Veri & Kupon Üretim Motoru Başlatıldı');

    // 1. Canlı bülteni oku
    const bultenPath = path.join(CACHE_DIR, 'nesine_bulten_today.json');
    if (!fs.existsSync(bultenPath)) {
        console.error('Bülten dosyası bulunamadı:', bultenPath);
        process.exit(1);
    }
    const rawData = JSON.parse(fs.readFileSync(bultenPath, 'utf8'));
    const parsedMatches = NesineService.parseEvents(rawData, 'football');
    console.log(`✅ Parsed football matches: ${parsedMatches.length}`);

    // 2. Kuponları üret
    const now = new Date();
    const dStr = String(now.getDate()).padStart(2, '0');
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const yStr = now.getFullYear();
    const todayDot = `${dStr}.${mStr}.${yStr}`; // 29.10.2026
    const todayIso = `${yStr}-${mStr}-${dStr}`; // 2026-10-29

    const generated = CouponEngine.generateDailyCoupons(parsedMatches, true, 8);
    const fullCoupons = (generated.length < 8) ? CouponEngine.expandTo8Coupons(generated, parsedMatches, todayIso) : generated.slice(0, 8);

    console.log(`✅ ${fullCoupons.length} adet garantör kupon üretildi.`);

    // 3. nesine_coupons_today.json formatına dönüştür
    const formattedCoupons = fullCoupons.map((c, idx) => {
        const couponNumber = idx + 1;
        const name = `${todayDot} - ${couponNumber}`;
        const picks = (c.matches || c.picks || []).map(m => {
            const code = m.matchCode || m.iddaaCode || (m.rawData && m.rawData.eventCode) || '';
            const matchName = `${m.homeTeam} - ${m.awayTeam}`;
            const odd = m.odd ? String(m.odd) : '1.50';
            const pickTitle = m.pickTitle || m.shortPick || 'MS 1';
            const matchTime = m.matchTime || m.timeStr || '20:00';
            const matchText = `${matchTime} ${matchName} ${pickTitle} ${odd}`;
            return {
                iddaaCode: String(code),
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                pickTitle,
                marketTitle: m.marketTitle || 'Maç Bahsi',
                marketCode: m.marketCode || 'MS1',
                odd,
                timeStr: matchTime,
                matchText
            };
        });

        return {
            couponNumber,
            name,
            title: c.title,
            subtitle: c.subtitle || '',
            badge: c.badge || '💎 Garantör',
            totalOdd: parseFloat(c.totalOdd) || 2.50,
            picks,
            savedInAccount: true,
            timestamp: new Date().toISOString()
        };
    });

    const nesineCouponsFile = {
        date: todayDot,
        userAccount: '14410079556',
        totalCoupons: formattedCoupons.length,
        coupons: formattedCoupons
    };

    const nesineCouponsPath = path.join(CACHE_DIR, 'nesine_coupons_today.json');
    fs.writeFileSync(nesineCouponsPath, JSON.stringify(nesineCouponsFile, null, 2), 'utf8');
    console.log(`💾 [KAYDEDİLDİ] ${nesineCouponsPath}`);

    // 4. Maçkolik Canlı Skorlarını çek ve kaydet
    console.log('📡 [2/3] Maçkolik & ESPN canlı skorları çekiliyor...');
    const mackolikUrl = `https://vd.mackolik.com/livedata?date=${dStr}/${mStr}/${yStr}`;
    let liveMatches = [];
    try {
        const mRes = await fetch(mackolikUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://arsiv.mackolik.com/'
            }
        });
        if (mRes.ok) {
            const mData = await mRes.json();
            const rawM = mData.m || [];
            rawM.forEach(item => {
                const home = item[2];
                const away = item[4];
                if (!home || !away) return;
                const hScore = (item[12] !== '' && item[12] !== undefined && item[12] !== null) ? parseInt(item[12], 10) : null;
                const aScore = (item[13] !== '' && item[13] !== undefined && item[13] !== null) ? parseInt(item[13], 10) : null;
                const st = String(item[5] || item[6] || '');
                let status = 'NOT_STARTED';
                let minute = item[16] || '';
                if (st === 'MS' || st.includes('Bitti') || st.includes('MS')) {
                    status = 'FINISHED';
                    minute = 'MS';
                } else if (st === 'IY' || st.includes('İY')) {
                    status = 'LIVE';
                    minute = 'İY';
                } else if (hScore !== null && aScore !== null) {
                    status = 'LIVE';
                    if (!minute) minute = 'Canlı';
                }

                liveMatches.push({
                    id: `mackolik_${item[0]}`,
                    source: 'Mackolik',
                    homeTeam: home,
                    awayTeam: away,
                    league: item[36] || 'Lig',
                    dateStr: todayDot,
                    timeStr: item[1] || '20:00',
                    homeScore: hScore !== null ? hScore : 0,
                    awayScore: aScore !== null ? aScore : 0,
                    status,
                    minute,
                    isLive: status === 'LIVE',
                    isFinished: status === 'FINISHED'
                });
            });
            console.log(`✅ Maçkolik canlı skorları alındı: ${liveMatches.length} maç`);
        }
    } catch (e) {
        console.warn('Maçkolik çekme hatası:', e.message);
    }

    // Live score dosyalarını diske yaz
    const liveScoreTodayPath = path.join(CACHE_DIR, `live_scores_feed_today_${todayIso}.json`);
    const liveScoreGenericPath = path.join(CACHE_DIR, 'live_scores_feed_today.json');
    fs.writeFileSync(liveScoreTodayPath, JSON.stringify(liveMatches, null, 2), 'utf8');
    fs.writeFileSync(liveScoreGenericPath, JSON.stringify(liveMatches, null, 2), 'utf8');
    console.log(`💾 [KAYDEDİLDİ] Canlı skor önbellekleri:\n  - ${path.basename(liveScoreTodayPath)}\n  - ${path.basename(liveScoreGenericPath)}`);

    console.log('🎉 [BİTTİ] Tüm güncel veriler ve kuponlar başarıyla üretildi ve diske kaydedildi.');
}

main().catch(err => {
    console.error('Kritik Hata:', err);
    process.exit(1);
});
