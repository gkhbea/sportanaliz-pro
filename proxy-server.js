const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - tüm originlere izin
app.use(cors());
app.use(express.json());

// Statik dosyaları sun
app.use(express.static(path.join(__dirname)));

// ---- In-Memory Cache ----
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

function getCached(key) {
    const item = cache.get(key);
    if (item && Date.now() - item.time < CACHE_TTL) return item.data;
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, time: Date.now() });
    // Cache boyutunu sınırla
    if (cache.size > 500) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
}

// ---- Rate Limiting ----
const requestCounts = new Map();
const RATE_LIMIT = 300; // dakikada max istek (artırıldı, multi-component yüklemeleri için)
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
    const now = Date.now();
    const record = requestCounts.get(ip);
    if (!record || now - record.start > RATE_WINDOW) {
        requestCounts.set(ip, { count: 1, start: now });
        return true;
    }
    if (record.count >= RATE_LIMIT) return false;
    record.count++;
    return true;
}

// Rate limit middleware
app.use('/api/proxy', (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Rate limit aşıldı. Lütfen biraz bekleyin.' });
    }
    next();
});

// ---- Nesine Proxy ----
app.get('/api/proxy/nesine/bulten', async (req, res) => {
    try {
        const cacheKey = 'nesine_bulten_' + JSON.stringify(req.query);
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `https://cdnbulten.nesine.com/api/bulten/getprebultenfull`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.nesine.com/',
                'Origin': 'https://www.nesine.com'
            }
        });

        if (!response.ok) throw new Error(`Nesine API: ${response.status}`);
        const data = await response.json();
        setCache(cacheKey, data);
        res.json(data);
    } catch (err) {
        console.error('Nesine proxy hatası:', err.message);
        res.status(502).json({ error: 'Nesine verisi alınamadı', detail: err.message });
    }
});

app.get('/api/proxy/nesine/events/:sportType', async (req, res) => {
    try {
        const { sportType } = req.params;
        const cacheKey = `nesine_events_${sportType}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `https://cdnbulten.nesine.com/api/bulten/getprebultenfull?st=${sportType}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.nesine.com/',
                'Origin': 'https://www.nesine.com'
            }
        });

        if (!response.ok) throw new Error(`Nesine Events API: ${response.status}`);
        const data = await response.json();
        setCache(cacheKey, data);
        res.json(data);
    } catch (err) {
        console.error('Nesine events hatası:', err.message);
        res.status(502).json({ error: 'Nesine event verisi alınamadı', detail: err.message });
    }
});

// ---- Bilyoner Proxy ----
app.get('/api/proxy/bilyoner/events', async (req, res) => {
    try {
        const cacheKey = 'bilyoner_events_' + JSON.stringify(req.query);
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const sportType = req.query.sport || 'FOOTBALL';
        const url = `https://aping.bilyoner.com/sportsbook/v1/events?sportKey=${sportType}&status=NOT_STARTED&limit=100`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.bilyoner.com/',
                'Origin': 'https://www.bilyoner.com'
            }
        });

        if (!response.ok) throw new Error(`Bilyoner API: ${response.status}`);
        const data = await response.json();
        setCache(cacheKey, data);
        res.json(data);
    } catch (err) {
        console.warn('Bilyoner proxy hatası (uyarı):', err.message);
        res.json({ data: [] });
    }
});

app.get('/api/proxy/bilyoner/odds/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const cacheKey = `bilyoner_odds_${eventId}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `https://aping.bilyoner.com/sportsbook/v1/events/${eventId}/odds`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.bilyoner.com/',
                'Origin': 'https://www.bilyoner.com'
            }
        });

        if (!response.ok) throw new Error(`Bilyoner Odds API: ${response.status}`);
        const data = await response.json();
        setCache(cacheKey, data);
        res.json(data);
    } catch (err) {
        console.error('Bilyoner odds hatası:', err.message);
        res.status(502).json({ error: 'Bilyoner oran verisi alınamadı', detail: err.message });
    }
});

// ---- API-Football Proxy (API key gerekli) ----
app.get('/api/proxy/football/*', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) return res.status(401).json({ error: 'API-Football anahtarı gerekli' });

        const endpoint = req.params[0];
        const queryString = new URLSearchParams(req.query).toString();
        const url = `https://v3.football.api-sports.io/${endpoint}${queryString ? '?' + queryString : ''}`;

        const response = await fetch(url, {
            headers: {
                'x-apisports-key': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`API-Football: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('API-Football hatası:', err.message);
        res.status(502).json({ error: 'API-Football verisi alınamadı', detail: err.message });
    }
});

// ---- Mackolik Canlı Sonuçlar Servisi (arsiv.mackolik.com / vd.mackolik.com) ----
async function fetchMackolikLiveScores(targetDate = null) {
    try {
        let dateQuery = targetDate;
        if (!dateQuery) {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const y = now.getFullYear();
            dateQuery = `${d}/${m}/${y}`;
        } else {
            // YYYY-MM-DD formatı geldiyse DD/MM/YYYY yap
            if (dateQuery.includes('-')) {
                const parts = dateQuery.split('-');
                if (parts.length === 3) {
                    dateQuery = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            } else if (dateQuery.includes('.')) {
                dateQuery = dateQuery.replace(/\./g, '/');
            }
        }

        const url = `https://vd.mackolik.com/livedata?date=${dateQuery}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://arsiv.mackolik.com/Canli-Sonuclar',
                'Accept': '*/*'
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        const rawList = data.m || [];
        const matches = [];

        rawList.forEach(m => {
            const id = m[0];
            const home = m[2];
            const away = m[4];
            if (!home || !away) return;

            const statusCode = m[5];
            const minuteStr = m[6] || '';
            const halfTimeStr = m[7] || ''; // m[7] Maçkolik'te İLK YARI (İY) skorudur (örn: "3-0")

            // Gerçek Maç Sonu / Anlık Canlı skorlar Maçkolik API'sinde m[12] ve m[13]'tür!
            let homeScore = (typeof m[12] === 'number') ? m[12] : parseInt(m[12]) || 0;
            let awayScore = (typeof m[13] === 'number') ? m[13] : parseInt(m[13]) || 0;

            // İlk yarı skoru ayrıştırması
            let fhHome = 0;
            let fhAway = 0;
            if (halfTimeStr && halfTimeStr.includes('-')) {
                const parts = halfTimeStr.split('-');
                fhHome = parseInt(parts[0]) || 0;
                fhAway = parseInt(parts[1]) || 0;
            }

            const isFinished = statusCode === 4 || minuteStr === 'MS';
            const isLive = !isFinished && (statusCode > 0 || (minuteStr && minuteStr !== 'MS' && minuteStr !== ''));

            let status = 'NOT_STARTED';
            let displayMinute = 'Başlamadı';

            if (isFinished) {
                status = 'FINISHED';
                displayMinute = 'MS';
            } else if (isLive) {
                status = 'LIVE';
                displayMinute = minuteStr ? (minuteStr.includes('IY') ? 'İY' : `${minuteStr}'`) : 'Canlı';
            }

            matches.push({
                id: String(id),
                homeTeam: home,
                awayTeam: away,
                homeScore,
                awayScore,
                firstHalfHome: fhHome,
                firstHalfAway: fhAway,
                status,
                minute: displayMinute,
                kickoffTime: m[16] || '',
                date: m[35] || '',
                league: m[36] ? m[36][1] : 'Futbol',
                mackolikUrl: `https://arsiv.mackolik.com/Match/Default.aspx?id=${id}`,
                source: 'Mackolik'
            });
        });

        return matches;
    } catch (e) {
        console.warn('Mackolik live fetch hatası:', e.message);
        return [];
    }
}

// ---- Mackolik Canlı Skorlar Uç Noktası ----
app.get('/api/proxy/mackolik/live', async (req, res) => {
    try {
        const queryDate = req.query.date || null;
        const cacheKey = `mackolik_live_feed_${queryDate || 'today'}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const list = await fetchMackolikLiveScores(queryDate);
        setCache(cacheKey, list);
        res.json(list);
    } catch (err) {
        res.status(502).json({ error: 'Mackolik canlı skor çekilemedi', detail: err.message });
    }
});

// ---- Gerçek Canlı ve Biten Maç Skorları (Maçkolik & ESPN Birleşik Feed) ----
app.get('/api/proxy/live/scores', async (req, res) => {
    try {
        const queryDate = req.query.date || null;
        const cacheKey = `live_scores_feed_${queryDate || 'today'}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const matches = [];
        const seenTeams = new Set();

        // 1. Önce Maçkolik verilerini çek (Kullanıcının talep ettiği resmi Türkiye kaynağı: arsiv.mackolik.com)
        try {
            const mackolikList = await fetchMackolikLiveScores(queryDate);
            mackolikList.forEach(m => {
                const normKey = `${m.homeTeam.toLowerCase()}_${m.awayTeam.toLowerCase()}`;
                seenTeams.add(normKey);
                matches.push(m);
            });
            console.log(`✅ Maçkolik'ten ${mackolikList.length} maç skoru çekildi.`);
        } catch (mErr) {
            console.warn('Maçkolik feed hatası:', mErr.message);
        }

        // 2. ESPN ve Global Ligleri ekle (Eğer Maçkolik'te henüz olmayan uluslararası maçlar varsa)
        const endpoints = [
            'https://site.api.espn.com/apis/site/v2/sports/soccer/scorepanel',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard',
            'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard'
        ];

        const fetchPromises = endpoints.map(u => 
            fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );

        const allData = await Promise.all(fetchPromises);

        allData.forEach(data => {
            if (!data) return;
            const rawEvents = [];
            if (Array.isArray(data.events)) rawEvents.push(...data.events);
            if (Array.isArray(data.scores)) {
                data.scores.forEach(s => {
                    if (Array.isArray(s.events)) rawEvents.push(...s.events);
                });
            }

            rawEvents.forEach(e => {
                const comp = e.competitions?.[0];
                const home = comp?.competitors?.find(c => c.homeAway === 'home');
                const away = comp?.competitors?.find(c => c.homeAway === 'away');
                if (!home || !away) return;

                const hName = home.team?.displayName || home.team?.name || '';
                const aName = away.team?.displayName || away.team?.name || '';
                const normKey = `${hName.toLowerCase()}_${aName.toLowerCase()}`;

                // Eğer Maçkolik'te zaten varsa ESPN mükerrerini ekleme
                if (seenTeams.has(normKey)) return;
                seenTeams.add(normKey);

                const state = e.status?.type?.state;
                let status = 'NOT_STARTED';
                let minute = 'Başlamadı';

                if (state === 'post') {
                    status = 'FINISHED';
                    minute = 'MS';
                } else if (state === 'in') {
                    status = 'LIVE';
                    minute = e.status?.displayClock ? `${e.status.displayClock}'` : 'Canlı';
                }

                let fhHome = 0;
                let fhAway = 0;
                if (home.linescores && home.linescores[0]) {
                    fhHome = parseInt(home.linescores[0].value) || 0;
                }
                if (away.linescores && away.linescores[0]) {
                    fhAway = parseInt(away.linescores[0].value) || 0;
                }

                matches.push({
                    id: String(e.id),
                    homeTeam: hName,
                    awayTeam: aName,
                    homeScore: parseInt(home.score) || 0,
                    awayScore: parseInt(away.score) || 0,
                    firstHalfHome: fhHome,
                    firstHalfAway: fhAway,
                    status,
                    minute,
                    date: e.date,
                    league: e.season?.name || comp?.league?.name || 'Futbol',
                    mackolikUrl: 'https://arsiv.mackolik.com/Canli-Sonuclar',
                    source: 'ESPN'
                });
            });
        });

        // Live score cache: 30 saniye
        setCache(cacheKey, matches);
        res.json(matches);
    } catch (err) {
        console.error('Live scores proxy hatası:', err.message);
        res.status(502).json({ error: 'Canlı skor verisi alınamadı', detail: err.message });
    }
});

// ============================================================
// ---- Mail / E-posta Gönderim Servisi (Nodemailer) ----
// ============================================================
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');

function getSubscribers() {
    try {
        if (fs.existsSync(SUBSCRIBERS_FILE)) {
            const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('Abone listesi okuma hatası:', e.message);
    }
    return [];
}

function saveSubscribers(list) {
    try {
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Abone listesi kaydetme hatası:', e.message);
        return false;
    }
}

/**
 * Kuponlar için şık, responsive HTML e-posta şablonu oluştur
 */
function buildCouponsEmailHtml({ coupons = [], dateStr = '', targetEmail = '' }) {
    const todayFormatted = dateStr || '10 Eylül 2026';
    let totalBetsCount = 0;
    coupons.forEach(c => totalBetsCount += (c.matches ? c.matches.length : 0));

    let couponsCardsHtml = '';

    coupons.forEach((coupon, idx) => {
        const title = coupon.title || `Kupon #${idx + 1}`;
        const badge = coupon.badge || 'GÜVENLİ TERCİH';
        const totalOdd = coupon.totalOdd || '1.00';
        const avgConfidence = coupon.avgConfidence || 75;
        const themeColor = coupon.themeColor || '#7C3AED';
        const icon = coupon.icon || '🎯';

        let matchesHtml = '';
        (coupon.matches || []).forEach((m, mIdx) => {
            const time = m.timeStr || m.matchTime || '20:00';
            const league = m.league || 'Futbol';
            const home = m.homeTeam || 'Ev Sahibi';
            const away = m.awayTeam || 'Deplasman';
            const pick = m.pickTitle || m.marketTitle || 'MS 1';
            const odd = m.odd || '1.50';
            const prob = m.probability || m.confidenceScore || 75;
            const reason = m.reason || 'İstatistiksel xG ve form modellemesi';
            const mackolik = (m.match && m.match.mackolikUrl) ? m.match.mackolikUrl : (m.mackolikUrl || 'https://arsiv.mackolik.com/Canli-Sonuclar');

            matchesHtml += `
            <div style="background:#131527;border:1px solid #232742;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#94a3b8;margin-bottom:6px;">
                    <span>⚽ ${league} · <strong style="color:#38bdf8;">${time}</strong></span>
                    <span style="background:#1e293b;padding:2px 8px;border-radius:4px;color:#cbd5e1;font-size:11px;">#${mIdx + 1}</span>
                </div>
                <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:6px;">
                    ${home} <span style="color:#64748b;font-weight:400;">vs</span> ${away}
                </div>
                <div style="background:#1e1b4b;border-left:3px solid ${themeColor};padding:8px 10px;border-radius:6px;margin-bottom:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="color:#e0e7ff;font-weight:700;font-size:14px;">👉 ${pick}</span>
                        <span style="background:${themeColor};color:#ffffff;padding:2px 8px;border-radius:4px;font-weight:800;font-size:13px;">Oran: ${odd}</span>
                    </div>
                    <div style="font-size:11px;color:#a5b4fc;margin-top:4px;">
                        🎯 Model İhtimali: <strong>%${prob}</strong>
                    </div>
                </div>
                <div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-bottom:6px;">
                    💡 <em>${reason}</em>
                </div>
                <div style="text-align:right;">
                    <a href="${mackolik}" target="_blank" style="color:#38bdf8;font-size:11px;text-decoration:none;font-weight:600;">
                        🔗 Maçkolik Detay & Canlı Skor ➔
                    </a>
                </div>
            </div>`;
        });

        couponsCardsHtml += `
        <div style="background:#0e101f;border:1px solid #1e2238;border-radius:14px;padding:18px;margin-bottom:20px;box-shadow:0 6px 16px rgba(0,0,0,0.4);">
            <div style="border-bottom:1px solid #232742;padding-bottom:12px;margin-bottom:14px;">
                <div style="display:inline-block;background:${themeColor}22;color:${themeColor};border:1px solid ${themeColor}44;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.5px;margin-bottom:6px;">
                    ${badge}
                </div>
                <h3 style="margin:0 0 4px 0;font-size:18px;font-weight:800;color:#ffffff;">
                    ${icon} ${title}
                </h3>
                <div style="display:flex;gap:12px;font-size:13px;color:#cbd5e1;margin-top:8px;">
                    <span style="background:#10b98122;color:#34d399;padding:4px 10px;border-radius:6px;font-weight:800;">
                        💰 Toplam Oran: ${totalOdd}
                    </span>
                    <span style="background:#38bdf822;color:#38bdf8;padding:4px 10px;border-radius:6px;font-weight:700;">
                        ⭐ Ortalama Güven: %${avgConfidence}
                    </span>
                    <span style="background:#6366f122;color:#a5b4fc;padding:4px 10px;border-radius:6px;font-weight:700;">
                        📋 ${coupon.matches ? coupon.matches.length : 0} Maç
                    </span>
                </div>
            </div>
            <div>
                ${matchesHtml}
            </div>
            <div style="background:#090a12;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#94a3b8;margin-top:10px;">
                <span>💵 100 TL Yatırımla Olası Kazanç:</span>
                <strong style="color:#10b981;font-size:14px;">${(100 * parseFloat(totalOdd || 1)).toFixed(2)} TL</strong>
            </div>
        </div>`;
    });

    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SportAnaliz Pro Günlük Kuponlar</title>
    </head>
    <body style="margin:0;padding:0;background-color:#06070d;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;color:#f1f5f9;">
        <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
            <!-- Header Banner -->
            <div style="background:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);border:1px solid #312e81;border-radius:18px;padding:26px;text-align:center;margin-bottom:24px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <div style="display:inline-flex;align-items:center;gap:8px;font-size:24px;font-weight:900;color:#ffffff;margin-bottom:6px;">
                    ⚡ Sport<span style="color:#00f0ff;">Analiz</span> Pro
                </div>
                <h1 style="margin:6px 0;font-size:22px;color:#ffffff;font-weight:800;">
                    📅 Günün Garantör Kuponları & Analiz Bülteni
                </h1>
                <p style="margin:4px 0 12px 0;color:#94a3b8;font-size:13px;">
                    Tarih: <strong style="color:#38bdf8;">${todayFormatted}</strong> · 4 Platform Konsensüsü (Nesine, Bilyoner, İddaa, Misli)
                </p>
                <div style="display:inline-block;background:#059669;color:#ffffff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;">
                    ✅ %100 Bugüne Özel Maçlar · 13.09 ve İleri Tarihler Elendi
                </div>
            </div>

            <!-- Özet İstatistikler -->
            <div style="display:flex;gap:10px;margin-bottom:20px;text-align:center;">
                <div style="flex:1;background:#0e101f;border:1px solid #1e2238;border-radius:10px;padding:12px;">
                    <div style="font-size:20px;font-weight:800;color:#00f0ff;">${coupons.length}</div>
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Hazır Kupon</div>
                </div>
                <div style="flex:1;background:#0e101f;border:1px solid #1e2238;border-radius:10px;padding:12px;">
                    <div style="font-size:20px;font-weight:800;color:#10b981;">${totalBetsCount}</div>
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Toplam Maç</div>
                </div>
                <div style="flex:1;background:#0e101f;border:1px solid #1e2238;border-radius:10px;padding:12px;">
                    <div style="font-size:20px;font-weight:800;color:#f59e0b;">10.09</div>
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Bugünün Bülteni</div>
                </div>
            </div>

            <!-- Kupon Kartları -->
            ${couponsCardsHtml}

            <!-- Footer & Uyarı -->
            <div style="background:#0a0c16;border:1px solid #1e2238;border-radius:12px;padding:18px;text-align:center;font-size:11px;color:#64748b;line-height:1.6;margin-top:24px;">
                <p style="margin:0 0 6px 0;color:#94a3b8;">
                    ⚠️ <strong>Sorumlu Bahis Uyarısı:</strong> Bu e-postadaki tüm veriler istatistiksel Poisson modelleri ve konsensüs analizleriyle üretilmiştir. Kesin kazanç taahhüt etmez.
                </p>
                <p style="margin:0;">
                    SportAnaliz Pro · Otomatik Günlük E-posta Servisi · Alıcı: ${targetEmail || 'Kullanıcı'}
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Mail Taşıyıcı Oluşturucu
 */
async function createMailTransporter(smtpConfig) {
    if (smtpConfig && smtpConfig.user && smtpConfig.pass) {
        // Özel SMTP / Gmail Uygulama Şifresi sağlandı
        if (smtpConfig.host) {
            return {
                transporter: nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: parseInt(smtpConfig.port) || 587,
                    secure: smtpConfig.secure === true || parseInt(smtpConfig.port) === 465,
                    auth: {
                        user: smtpConfig.user,
                        pass: smtpConfig.pass
                    }
                }),
                isTest: false,
                from: smtpConfig.from || smtpConfig.user
            };
        } else {
            // Standart Gmail servisi
            return {
                transporter: nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: smtpConfig.user,
                        pass: smtpConfig.pass
                    }
                }),
                isTest: false,
                from: smtpConfig.user
            };
        }
    }

    // SMTP yapılandırılmamışsa otomatik Ethereal Test Hesabı oluştur
    const testAccount = await nodemailer.createTestAccount();
    return {
        transporter: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        }),
        isTest: true,
        from: `"SportAnaliz Pro" <${testAccount.user}>`
    };
}

// POST /api/mail/send-coupons: Kuponları e-postaya gönder
app.post('/api/mail/send-coupons', async (req, res) => {
    try {
        const { email, coupons, smtpConfig, dateStr } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
        }

        if (!Array.isArray(coupons) || coupons.length === 0) {
            return res.status(400).json({ error: 'Gönderilecek kupon listesi bulunamadı.' });
        }

        const { transporter, isTest, from } = await createMailTransporter(smtpConfig);

        const htmlContent = buildCouponsEmailHtml({
            coupons,
            dateStr: dateStr || '10 Eylül 2026',
            targetEmail: email
        });

        const mailOptions = {
            from: from || '"SportAnaliz Pro" <noreply@sportanaliz.pro>',
            to: email,
            subject: `⚡ SportAnaliz Pro — Günün Hazır Kuponları (${dateStr || '10 Eylül 2026'})`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;

        console.log(`[MAIL] Kuponlar başarıyla gönderildi: ${email} (MessageID: ${info.messageId}) ${isTest ? '[Ethereal Test Modu]' : '[Canlı SMTP]'}`);

        res.json({
            success: true,
            messageId: info.messageId,
            to: email,
            isTest,
            previewUrl,
            message: isTest 
                ? 'E-posta test sunucusu üzerinden oluşturuldu. Gelen kutusunu ve önizlemeyi açabilirsiniz.' 
                : `${email} adresine günün kuponları başarıyla gönderildi!`
        });
    } catch (err) {
        console.error('[MAIL HATASI]:', err);
        res.status(500).json({
            error: 'E-posta gönderilirken bir hata oluştu.',
            detail: err.message
        });
    }
});

// POST /api/mail/subscribe: Günlük otomatik e-posta aboneliği kaydet
app.post('/api/mail/subscribe', (req, res) => {
    try {
        const { email, time = '10:00' } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
        }

        const subscribers = getSubscribers();
        const existing = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());

        if (existing) {
            existing.active = true;
            existing.updatedAt = new Date().toISOString();
            existing.time = time;
        } else {
            subscribers.push({
                email: email.trim().toLowerCase(),
                time,
                active: true,
                createdAt: new Date().toISOString()
            });
        }

        saveSubscribers(subscribers);
        console.log(`[ABONELİK] Yeni günlük abone eklendi/güncellendi: ${email}`);
        res.json({ success: true, message: `${email} adresi günlük kupon bültenine başarıyla kaydedildi.` });
    } catch (err) {
        res.status(500).json({ error: 'Abonelik kaydedilemedi', detail: err.message });
    }
});

// GET /api/mail/subscribers: Abone durumunu sorgula
app.get('/api/mail/subscribers', (req, res) => {
    const subscribers = getSubscribers();
    res.json({ total: subscribers.length, subscribers });
});

// ---- Health Check ----
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        cacheSize: cache.size,
        uptime: process.uptime()
    });
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   🏆 Spor Analiz Platformu - Proxy Sunucusu     ║
║   http://localhost:${PORT}                         ║
║   Durum: Çalışıyor ✅                            ║
╚══════════════════════════════════════════════════╝
    `);
});
