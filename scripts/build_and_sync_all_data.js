const fs = require('fs');
const path = require('path');
const fetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : require('node-fetch');

const CACHE_DIR = path.join(__dirname, '..', 'data_cache');
const NesineService = require('../js/services/nesineService.js');
const CouponEngine = require('../js/analysis/couponEngine.js');
let HistoricalCouponsService = null;
try {
    HistoricalCouponsService = require('../js/services/historicalCouponsService.js');
} catch (e) {}

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
    const todayDot = `${dStr}.${mStr}.${yStr}`; // 31.10.2026
    const todayIso = `${yStr}-${mStr}-${dStr}`; // 2026-10-31

    let fullCoupons = [];
    if (HistoricalCouponsService && typeof HistoricalCouponsService.getCouponsByDate === 'function') {
        const histCoupons = HistoricalCouponsService.getCouponsByDate(todayIso);
        if (histCoupons && histCoupons.length >= 10) {
            fullCoupons = histCoupons;
            console.log(`✅ ${fullCoupons.length} adet otantik seans kuponu (Sabah/Öğlen/Akşam) yüklendi.`);
        }
    }

    if (fullCoupons.length === 0) {
        const morning = CouponEngine.generateDailyCoupons(parsedMatches, true, 5, 'morning');
        const noon = CouponEngine.generateDailyCoupons(parsedMatches, true, 5, 'noon');
        const evening = CouponEngine.generateDailyCoupons(parsedMatches, true, 5, 'evening');
        fullCoupons = [...morning, ...noon, ...evening];
        if (fullCoupons.length === 0) {
            const gen = CouponEngine.generateDailyCoupons(parsedMatches, true, 8);
            fullCoupons = (gen.length < 8) ? CouponEngine.expandTo8Coupons(gen, parsedMatches, todayIso) : gen;
        }
        console.log(`✅ ${fullCoupons.length} adet seans kuponu dinamik motor tarafından üretildi.`);
    }

    // 3. nesine_coupons_today.json formatına dönüştür
    const formattedCoupons = fullCoupons.map((c, idx) => {
        const couponNumber = idx + 1;
        const name = `${todayDot} - ${couponNumber}`;
        const picks = (c.matches || c.picks || []).map(m => {
            const code = m.matchCode || m.iddaaCode || (m.rawData && m.rawData.eventCode) || m.code || '';
            const matchName = `${m.homeTeam} - ${m.awayTeam}`;
            const odd = m.odd ? String(m.odd) : '1.50';
            const pickTitle = m.pickTitle || m.shortPick || 'MS 1';
            const matchTime = m.matchTime || m.timeStr || '20:00';
            const matchText = `${matchTime} ${matchName} ${pickTitle} ${odd}`;
            return {
                iddaaCode: String(code),
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                league: m.league,
                pickTitle,
                marketTitle: m.marketTitle || 'Maç Bahsi',
                marketCode: m.marketCode || 'MS1',
                odd,
                timeStr: matchTime,
                matchText
            };
        });

        let sessionTimeRange = '18:00 - 23:59';
        if (c.timeSlot === 'morning') sessionTimeRange = '00:00 - 12:00';
        else if (c.timeSlot === 'noon') sessionTimeRange = '12:00 - 18:00';

        return {
            couponNumber,
            name,
            title: c.title,
            subtitle: c.subtitle || '',
            badge: c.badge || '💎 Garantör',
            totalOdd: parseFloat(c.totalOdd) || 2.50,
            picks,
            savedInAccount: true,
            screenshot: path.join(CACHE_DIR, 'screenshots', `nesine_kupon_${couponNumber}.png`),
            timestamp: new Date().toISOString(),
            timeSlot: c.timeSlot || 'evening',
            sessionName: c.sessionName || 'Akşam Kuponu',
            sessionTimeRange
        };
    });

    const nesineCouponsFile = {
        date: todayDot,
        userAccount: '14410079556',
        totalCoupons: formattedCoupons.length,
        sessions: {
            morning: formattedCoupons.filter(c => c.timeSlot === 'morning').length,
            noon: formattedCoupons.filter(c => c.timeSlot === 'noon').length,
            evening: formattedCoupons.filter(c => c.timeSlot === 'evening').length
        },
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
