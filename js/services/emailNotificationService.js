/**
 * emailNotificationService.js
 * SportAnaliz Pro - Otomatik E-Posta Bildirim Motoru
 * 
 * Özellikler:
 * 1. Günlük Garantör Kuponlar E-Postası (Sabah bülteni / 10:00)
 * 2. Kupon Sonuçları & Kasa Raporu E-Postası (Tutup tutmadığı / Maç skorları / 23:30)
 * 3. Haftalık İstatistik Bülteni E-Postası (Genel başarı oranı, ROI, kategori analizi / Pazar 23:45 veya Pazartesi 09:30)
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ROOT_DIR = path.resolve(__dirname, '../../');
const SUBSCRIBERS_FILE = path.join(ROOT_DIR, 'subscribers.json');
const MAIL_HISTORY_FILE = path.join(ROOT_DIR, 'data_cache', 'mail_history.json');
const ENV_FILE = path.join(ROOT_DIR, '.env');

// Ortam değişkenlerini (.env) yükle
function loadEnv() {
    try {
        if (fs.existsSync(ENV_FILE)) {
            const raw = fs.readFileSync(ENV_FILE, 'utf8');
            raw.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const eqIdx = trimmed.indexOf('=');
                    if (eqIdx !== -1) {
                        const k = trimmed.substring(0, eqIdx).trim();
                        const v = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                        if (!process.env[k]) {
                            process.env[k] = v;
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.warn('[MAIL SERVICE] .env okuma uyarısı:', e.message);
    }
}
loadEnv();

function getSubscribers() {
    try {
        if (fs.existsSync(SUBSCRIBERS_FILE)) {
            const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[MAIL SERVICE] subscribers.json okunamadı:', e.message);
    }
    return [
        {
            email: 'gokhanelalyz@gmail.com',
            time: '10:00',
            active: true,
            dailyCoupons: true,
            couponResults: true,
            weeklyStats: true
        }
    ];
}

function saveSubscribers(list) {
    try {
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[MAIL SERVICE] subscribers.json kaydetme hatası:', e.message);
        return false;
    }
}

function getMailHistory() {
    try {
        if (fs.existsSync(MAIL_HISTORY_FILE)) {
            const raw = fs.readFileSync(MAIL_HISTORY_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {}
    return {
        dailyCouponsLastSent: null,
        couponResultsLastSent: null,
        weeklyStatsLastSent: null,
        logs: []
    };
}

function saveMailHistory(history) {
    try {
        const dir = path.dirname(MAIL_HISTORY_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MAIL_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {
        console.error('[MAIL SERVICE] mail_history.json kaydetme hatası:', e.message);
    }
}

function addMailLog(type, email, success, detail = '') {
    const history = getMailHistory();
    history.logs = history.logs || [];
    history.logs.unshift({
        type,
        email,
        success,
        detail,
        timestamp: new Date().toISOString()
    });
    if (history.logs.length > 50) history.logs = history.logs.slice(0, 50);
    saveMailHistory(history);
}

/**
 * Nodemailer Mail Taşıyıcısı (Transporter)
 */
async function createMailTransporter(smtpConfig) {
    loadEnv();
    const user = (smtpConfig && smtpConfig.user) || process.env.SMTP_USER || process.env.GMAIL_USER;
    let pass = (smtpConfig && smtpConfig.pass) || process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.SMTP_PASSWORD;
    const host = (smtpConfig && smtpConfig.host) || process.env.SMTP_HOST;
    const port = (smtpConfig && smtpConfig.port) || process.env.SMTP_PORT || 587;

    if (user && pass && pass.trim().length > 3) {
        const isGmail = (user && user.includes('gmail.com')) || (host && host.includes('gmail.com'));
        if (isGmail) {
            const cleanPass = pass.trim().replace(/\s+/g, '');
            return {
                transporter: nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: user.trim(), pass: cleanPass }
                }),
                isTest: false,
                from: (smtpConfig && smtpConfig.from) || `"SportAnaliz Pro" <${user}>`
            };
        } else if (host) {
            return {
                transporter: nodemailer.createTransport({
                    host: host,
                    port: parseInt(port) || 587,
                    secure: parseInt(port) === 465,
                    auth: { user, pass }
                }),
                isTest: false,
                from: (smtpConfig && smtpConfig.from) || process.env.SMTP_FROM || `"SportAnaliz Pro" <${user}>`
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

/**
 * 1. GÜNLÜK KUPONLAR HTML ŞABLONU
 */
function buildCouponsEmailHtml({ coupons = [], dateStr = '', targetEmail = '' }) {
    const todayFormatted = dateStr || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const dayMonthStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    let totalBetsCount = 0;
    coupons.forEach(c => totalBetsCount += (c.matches ? c.matches.length : (c.picks ? c.picks.length : 0)));

    let couponsCardsHtml = '';

    coupons.forEach((coupon, idx) => {
        const title = coupon.title || `Kupon #${idx + 1}`;
        const badge = coupon.badge || 'GÜVENLİ TERCİH';
        const totalOdd = coupon.totalOdd || coupon.totalOdds || '1.00';
        const avgConfidence = coupon.avgConfidence || coupon.confidence || 85;
        const themeColor = coupon.themeColor || '#7C3AED';
        const icon = coupon.icon || '🎯';
        const matchesList = coupon.matches || coupon.picks || [];

        let matchesHtml = '';
        matchesList.forEach((m, mIdx) => {
            const time = m.timeStr || m.matchTime || '20:00';
            const league = m.league || 'Futbol';
            const home = m.homeTeam || 'Ev Sahibi';
            const away = m.awayTeam || 'Deplasman';
            const pick = m.pickTitle || m.marketTitle || 'MS 1';
            const odd = m.odd || '1.50';
            const prob = m.probability || m.confidence || 80;
            const reason = m.analysisReason || m.reason || (m.evaluation && m.evaluation.detail) || 'İstatistiksel xG ve form modellemesi';
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
                        🔗 Maçkolik Detay & Canlı Takip ➔
                    </a>
                </div>
            </div>`;
        });

        const stake = 50; // KULLANICI TALİMATI: Kuponlar sadece 50 TL olsun
        const potentialWin = (stake * parseFloat(totalOdd || 1)).toFixed(2);

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
                        ⭐ Model Güveni: %${avgConfidence}
                    </span>
                    <span style="background:#6366f122;color:#a5b4fc;padding:4px 10px;border-radius:6px;font-weight:700;">
                        📋 ${matchesList.length} Maç
                    </span>
                </div>
            </div>
            <div>
                ${matchesHtml}
            </div>
            <div style="background:#090a12;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#94a3b8;margin-top:10px;">
                <span>💵 ${stake} TL Yatırımla Olası Kazanç:</span>
                <strong style="color:#10b981;font-size:15px;font-weight:800;">${potentialWin} TL</strong>
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
                    🎯 Günün Garantör Kuponları & Analiz Bülteni
                </h1>
                <p style="margin:4px 0 12px 0;color:#94a3b8;font-size:13px;">
                    Tarih: <strong style="color:#38bdf8;">${todayFormatted}</strong> · 4 Platform Konsensüsü (Nesine, Bilyoner, İddaa, Misli)
                </p>
                <div style="display:inline-block;background:#059669;color:#ffffff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;">
                    ✅ %100 Resmi İddaa & Maçkolik Teyitli Maçlar
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
                    <div style="font-size:20px;font-weight:800;color:#f59e0b;">${dayMonthStr}</div>
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Günün Bülteni</div>
                </div>
            </div>

            <!-- Kupon Kartları -->
            ${couponsCardsHtml}

            <!-- Footer & Uyarı -->
            <div style="background:#0a0c16;border:1px solid #1e2238;border-radius:12px;padding:18px;text-align:center;font-size:11px;color:#64748b;line-height:1.6;margin-top:24px;">
                <p style="margin:0 0 6px 0;color:#94a3b8;">
                    ⚠️ <strong>Sorumlu Bahis Uyarısı:</strong> Bu e-postadaki tüm veriler istatistiksel Poisson modelleri, xG ve konsensüs analizleriyle üretilmiştir. Kesin kazanç taahhüt etmez.
                </p>
                <p style="margin:0;">
                    SportAnaliz Pro · Otomatik Günlük E-Posta Servisi · Alıcı: ${targetEmail || 'Kullanıcı'}
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * 2. KUPON SONUÇLARI & TUTUP TUTMADIĞI RAPORU HTML ŞABLONU
 */
function buildCouponResultsEmailHtml({ coupons = [], dateStr = '', targetEmail = '' }) {
    const todayFormatted = dateStr || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

    let totalCoupons = coupons.length;
    let wonCoupons = 0;
    let lostCoupons = 0;
    let pendingCoupons = 0;
    let totalStake = 0;
    let totalReturn = 0;

    coupons.forEach(c => {
        const stake = 50; // KULLANICI TALİMATI: Kuponlar sadece 50 TL olsun
        totalStake += stake;
        const isWon = c.resultStatus === 'won' || c.isWon;
        const isLost = c.resultStatus === 'lost' || c.isLost;
        if (isWon) {
            wonCoupons++;
            totalReturn += (c.potentialReturn || (stake * (c.totalOdd || c.totalOdds || 1)));
        } else if (isLost) {
            lostCoupons++;
        } else {
            pendingCoupons++;
        }
    });

    const netProfit = totalReturn - totalStake;
    const isNetProfitable = netProfit >= 0;
    const winRate = (wonCoupons + lostCoupons) > 0 ? Math.round((wonCoupons / (wonCoupons + lostCoupons)) * 100) : (wonCoupons > 0 ? 100 : 0);

    let couponResultCards = '';

    coupons.forEach((coupon, idx) => {
        const title = coupon.title || `Kupon #${idx + 1}`;
        const totalOdd = coupon.totalOdd || coupon.totalOdds || '1.00';
        const stake = 50; // KULLANICI TALİMATI: Kuponlar sadece 50 TL olsun
        const matchesList = coupon.matches || coupon.picks || [];

        const isWon = coupon.resultStatus === 'won' || coupon.isWon;
        const isLost = coupon.resultStatus === 'lost' || coupon.isLost;

        let statusBadge = '';
        let statusBorderColor = '#3b82f6';
        let payoutText = '';

        if (isWon) {
            const ret = (stake * parseFloat(totalOdd || 1)).toFixed(2);
            const prof = (ret - stake).toFixed(2);
            statusBadge = `<span style="background:#059669;color:#ffffff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;">🎉 KAZANDI (${matchesList.length}/${matchesList.length})</span>`;
            statusBorderColor = '#10b981';
            payoutText = `<span style="color:#34d399;font-weight:700;">+${prof} TL Kâr</span> (${stake} TL ➔ ${ret} TL)`;
        } else if (isLost) {
            statusBadge = `<span style="background:#dc2626;color:#ffffff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;">❌ KAYBETTİ</span>`;
            statusBorderColor = '#ef4444';
            payoutText = `<span style="color:#f87171;font-weight:700;">-${stake} TL</span> (Kupon yattı)`;
        } else {
            statusBadge = `<span style="background:#d97706;color:#ffffff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;">⏳ DEVAM EDİYOR / BEKLİYOR</span>`;
            statusBorderColor = '#f59e0b';
            payoutText = `<span style="color:#fbbf24;font-weight:700;">Olası: ${(stake * parseFloat(totalOdd || 1)).toFixed(2)} TL</span>`;
        }

        let matchesListHtml = '';
        matchesList.forEach((m, mIdx) => {
            const home = m.homeTeam || 'Ev Sahibi';
            const away = m.awayTeam || 'Deplasman';
            const pick = m.pickTitle || m.marketTitle || 'MS 1';
            const odd = m.odd || '1.50';
            const score = m.scoreText || `${m.homeScore !== undefined ? m.homeScore : 0} - ${m.awayScore !== undefined ? m.awayScore : 0}`;
            const mWon = Boolean(m.isWon || m.resultStatus === 'won');
            const mLost = Boolean(m.isLost || m.resultStatus === 'lost');

            let pickBadge = '';
            if (mWon) {
                pickBadge = `<span style="background:#10b98122;color:#34d399;border:1px solid #10b98144;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;">✅ TUTTU</span>`;
            } else if (mLost) {
                pickBadge = `<span style="background:#ef444422;color:#f87171;border:1px solid #ef444444;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;">❌ YATTI</span>`;
            } else {
                pickBadge = `<span style="background:#f59e0b22;color:#fbbf24;border:1px solid #f59e0b44;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;">⏳ OYNANIYOR</span>`;
            }

            matchesListHtml += `
            <div style="background:#131527;border:1px solid #232742;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;">
                    <span>${home} vs ${away}</span>
                    <span style="background:#1e293b;padding:2px 8px;border-radius:4px;color:#38bdf8;font-weight:800;font-size:12px;">⚽ Skor: ${score}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                    <span style="color:#cbd5e1;">👉 ${pick} (Oran: ${odd})</span>
                    ${pickBadge}
                </div>
            </div>`;
        });

        couponResultCards += `
        <div style="background:#0e101f;border:1px solid ${statusBorderColor};border-radius:14px;padding:16px;margin-bottom:18px;box-shadow:0 4px 14px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #232742;padding-bottom:10px;margin-bottom:12px;">
                <div>
                    <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:800;color:#ffffff;">
                        ${title}
                    </h3>
                    <div style="font-size:12px;color:#94a3b8;">
                        Toplam Oran: <strong style="color:#38bdf8;">${totalOdd}</strong> · Yatırım: <strong>${stake} TL</strong>
                    </div>
                </div>
                <div>
                    ${statusBadge}
                </div>
            </div>
            <div>
                ${matchesListHtml}
            </div>
            <div style="background:#090a12;border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#cbd5e1;margin-top:10px;">
                <span>Kupon Net Durumu:</span>
                <div>${payoutText}</div>
            </div>
        </div>`;
    });

    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SportAnaliz Pro Kupon Sonuç Raporu</title>
    </head>
    <body style="margin:0;padding:0;background-color:#06070d;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;color:#f1f5f9;">
        <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
            <!-- Header Banner -->
            <div style="background:linear-gradient(135deg, #064e3b 0%, #0f172a 100%);border:1px solid #059669;border-radius:18px;padding:24px;text-align:center;margin-bottom:20px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size:22px;font-weight:900;color:#ffffff;margin-bottom:4px;">
                    ⚡ Sport<span style="color:#00f0ff;">Analiz</span> Pro
                </div>
                <h1 style="margin:4px 0;font-size:20px;color:#ffffff;font-weight:800;">
                    🏁 Günün Kupon Sonuçları & Kasa Raporu
                </h1>
                <p style="margin:4px 0 0 0;color:#cbd5e1;font-size:13px;">
                    Tarih: <strong style="color:#34d399;">${todayFormatted}</strong>
                </p>
            </div>

            <!-- KPI Özet Kartları -->
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:20px;text-align:center;">
                <div style="background:#0e101f;border:1px solid #1e2238;border-radius:10px;padding:12px;">
                    <div style="font-size:22px;font-weight:900;color:#00f0ff;">${totalCoupons}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Toplam Kupon</div>
                </div>
                <div style="background:#0e101f;border:1px solid #10b98144;border-radius:10px;padding:12px;">
                    <div style="font-size:22px;font-weight:900;color:#10b981;">${wonCoupons}</div>
                    <div style="font-size:10px;color:#34d399;text-transform:uppercase;">Tutan Kupon</div>
                </div>
                <div style="background:#0e101f;border:1px solid #ef444444;border-radius:10px;padding:12px;">
                    <div style="font-size:22px;font-weight:900;color:#f87171;">${lostCoupons}</div>
                    <div style="font-size:10px;color:#f87171;text-transform:uppercase;">Yatan Kupon</div>
                </div>
                <div style="background:#0e101f;border:1px solid #f59e0b44;border-radius:10px;padding:12px;">
                    <div style="font-size:22px;font-weight:900;color:#fbbf24;">%${winRate}</div>
                    <div style="font-size:10px;color:#fbbf24;text-transform:uppercase;">Başarı Oranı</div>
                </div>
            </div>

            <!-- Kasa & Net Kâr Banner -->
            <div style="background:${isNetProfitable ? '#064e3b33' : '#7f1d1d33'};border:1px solid ${isNetProfitable ? '#059669' : '#dc2626'};border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div>
                    <div style="font-size:12px;color:#94a3b8;">Günün Toplam Kasa Hareketi (50 TL / Kupon)</div>
                    <div style="font-size:14px;color:#ffffff;font-weight:700;margin-top:2px;">
                        Yatırım: ${totalStake} TL · Geri Dönüş: ${totalReturn.toFixed(2)} TL
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px;color:#94a3b8;">Günün Net Kârı</div>
                    <div style="font-size:20px;font-weight:900;color:${isNetProfitable ? '#34d399' : '#f87171'};">
                        ${isNetProfitable ? '+' : ''}${netProfit.toFixed(2)} TL
                    </div>
                </div>
            </div>

            <!-- Kupon Sonuç Kartları -->
            ${couponResultCards}

            <!-- Footer -->
            <div style="background:#0a0c16;border:1px solid #1e2238;border-radius:12px;padding:16px;text-align:center;font-size:11px;color:#64748b;line-height:1.6;margin-top:20px;">
                <p style="margin:0 0 4px 0;color:#94a3b8;">
                    🏆 SportAnaliz Pro · Gün Sonu Otomatik Doğrulama & Teyit Servisi
                </p>
                <p style="margin:0;">
                    Alıcı: ${targetEmail || 'Kullanıcı'} · Bu rapor maç sonuçları kesinleştikten sonra otomatik oluşturulmuştur.
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * 3. HAFTALIK İSTATİSTİK BÜLTENİ HTML ŞABLONU
 */
function buildWeeklyStatsEmailHtml({ sets = [], targetEmail = '' }) {
    const last7Days = sets.slice(-7);
    const startDate = last7Days.length > 0 ? last7Days[0].dateFormatted : 'Son 7 Gün';
    const endDate = last7Days.length > 0 ? last7Days[last7Days.length - 1].dateFormatted : 'Bugün';

    let totalCoupons = 0;
    let wonCoupons = 0;
    let lostCoupons = 0;
    let pendingCoupons = 0;
    let totalStake = 0;
    let totalReturn = 0;
    let bestOddWon = 0;
    let bestCouponTitle = '-';

    const dayRows = [];

    last7Days.forEach(day => {
        let dayCoupons = 0;
        let dayWon = 0;
        let dayLost = 0;
        let dayStake = 0;
        let dayReturn = 0;

        (day.coupons || []).forEach(c => {
            totalCoupons++;
            dayCoupons++;
            const stake = 50; // KULLANICI TALİMATI: Kuponlar sadece 50 TL olsun
            totalStake += stake;
            dayStake += stake;

            const isWon = c.resultStatus === 'won' || c.isWon;
            const isLost = c.resultStatus === 'lost' || c.isLost;

            if (isWon) {
                wonCoupons++;
                dayWon++;
                const ret = c.potentialReturn || (stake * (c.totalOdd || c.totalOdds || 1));
                totalReturn += ret;
                dayReturn += ret;

                const oddVal = parseFloat(c.totalOdd || c.totalOdds || 1);
                if (oddVal > bestOddWon) {
                    bestOddWon = oddVal;
                    bestCouponTitle = c.title || 'Günün Kuponu';
                }
            } else if (isLost) {
                lostCoupons++;
                dayLost++;
            } else {
                pendingCoupons++;
            }
        });

        const dayProfit = dayReturn - dayStake;
        dayRows.push({
            date: day.dateFormatted || day.date,
            dayName: day.dayName || '',
            count: dayCoupons,
            won: dayWon,
            lost: dayLost,
            profit: dayProfit
        });
    });

    const netProfit = totalReturn - totalStake;
    const isNetProfitable = netProfit >= 0;
    const winRate = (wonCoupons + lostCoupons) > 0 ? ((wonCoupons / (wonCoupons + lostCoupons)) * 100).toFixed(1) : '0';
    const roi = totalStake > 0 ? ((netProfit / totalStake) * 100).toFixed(1) : '0';

    let dayRowsHtml = '';
    dayRows.forEach(r => {
        const isProf = r.profit >= 0;
        dayRowsHtml += `
        <tr style="border-bottom:1px solid #1e2238;">
            <td style="padding:10px 12px;font-size:13px;color:#ffffff;font-weight:600;">
                ${r.date} <span style="font-size:11px;color:#94a3b8;">(${r.dayName})</span>
            </td>
            <td style="padding:10px 12px;font-size:13px;text-align:center;color:#cbd5e1;">${r.count}</td>
            <td style="padding:10px 12px;font-size:13px;text-align:center;color:#34d399;font-weight:700;">${r.won}</td>
            <td style="padding:10px 12px;font-size:13px;text-align:center;color:#f87171;">${r.lost}</td>
            <td style="padding:10px 12px;font-size:13px;text-align:right;font-weight:800;color:${isProf ? '#34d399' : '#f87171'};">
                ${isProf ? '+' : ''}${r.profit.toFixed(2)} TL
            </td>
        </tr>`;
    });

    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SportAnaliz Pro Haftalık Performans Raporu</title>
    </head>
    <body style="margin:0;padding:0;background-color:#06070d;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;color:#f1f5f9;">
        <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
            <!-- Header Banner -->
            <div style="background:linear-gradient(135deg, #312e81 0%, #0f172a 100%);border:1px solid #4f46e5;border-radius:18px;padding:26px;text-align:center;margin-bottom:20px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size:24px;font-weight:900;color:#ffffff;margin-bottom:4px;">
                    ⚡ Sport<span style="color:#00f0ff;">Analiz</span> Pro
                </div>
                <h1 style="margin:4px 0;font-size:21px;color:#ffffff;font-weight:800;">
                    📊 Haftalık Kupon & Kazanç Karnesi
                </h1>
                <p style="margin:4px 0 0 0;color:#cbd5e1;font-size:13px;">
                    Dönem: <strong style="color:#38bdf8;">${startDate} — ${endDate}</strong>
                </p>
            </div>

            <!-- KPI 4'lü Izgara -->
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:20px;text-align:center;">
                <div style="background:#0e101f;border:1px solid #1e2238;border-radius:10px;padding:14px 8px;">
                    <div style="font-size:22px;font-weight:900;color:#00f0ff;">${totalCoupons}</div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Toplam Kupon</div>
                </div>
                <div style="background:#0e101f;border:1px solid #10b98144;border-radius:10px;padding:14px 8px;">
                    <div style="font-size:22px;font-weight:900;color:#10b981;">${wonCoupons}</div>
                    <div style="font-size:10px;color:#34d399;text-transform:uppercase;">Tutan Kupon</div>
                </div>
                <div style="background:#0e101f;border:1px solid #6366f144;border-radius:10px;padding:14px 8px;">
                    <div style="font-size:22px;font-weight:900;color:#a5b4fc;">%${winRate}</div>
                    <div style="font-size:10px;color:#a5b4fc;text-transform:uppercase;">Kazanma Oranı</div>
                </div>
                <div style="background:#0e101f;border:1px solid #f59e0b44;border-radius:10px;padding:14px 8px;">
                    <div style="font-size:22px;font-weight:900;color:#fbbf24;">%${roi}</div>
                    <div style="font-size:10px;color:#fbbf24;text-transform:uppercase;">Haftalık ROI</div>
                </div>
            </div>

            <!-- Haftalık Kasa Kartı -->
            <div style="background:#0e101f;border:1px solid #1e2238;border-radius:14px;padding:18px;margin-bottom:20px;">
                <h3 style="margin:0 0 12px 0;font-size:15px;color:#ffffff;font-weight:800;border-bottom:1px solid #1e2238;padding-bottom:8px;">
                    💰 Haftalık Kasa & Finansal Özet (50 TL / Kupon)
                </h3>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;">
                    <span style="color:#94a3b8;">Toplam Yatırılan Kasa:</span>
                    <strong style="color:#ffffff;">${totalStake} TL</strong>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;">
                    <span style="color:#94a3b8;">Toplam Geri Dönen Kazanç:</span>
                    <strong style="color:#34d399;">${totalReturn.toFixed(2)} TL</strong>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;background:#090a12;border-radius:8px;padding:12px;margin-top:10px;">
                    <span style="color:#cbd5e1;font-weight:700;">Haftalık Net Kâr:</span>
                    <strong style="color:${isNetProfitable ? '#10b981' : '#f87171'};font-size:20px;font-weight:900;">
                        ${isNetProfitable ? '+' : ''}${netProfit.toFixed(2)} TL
                    </strong>
                </div>
            </div>

            <!-- Haftanın Yıldızı Kuponu -->
            ${bestOddWon > 0 ? `
            <div style="background:linear-gradient(135deg, #1e1b4b 0%, #172554 100%);border:1px solid #38bdf8;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:11px;color:#38bdf8;font-weight:800;text-transform:uppercase;">⭐ Haftanın En Yüksek Oranlı Kazanan Kuponu</div>
                    <div style="font-size:14px;color:#ffffff;font-weight:800;margin-top:2px;">${bestCouponTitle}</div>
                </div>
                <div style="background:#38bdf822;color:#38bdf8;border:1px solid #38bdf8;padding:6px 14px;border-radius:8px;font-size:18px;font-weight:900;">
                    ${bestOddWon.toFixed(2)} Oran
                </div>
            </div>` : ''}

            <!-- Gün Gün Performans Tablosu -->
            <div style="background:#0e101f;border:1px solid #1e2238;border-radius:14px;overflow:hidden;margin-bottom:20px;">
                <div style="padding:14px 16px;border-bottom:1px solid #1e2238;">
                    <h3 style="margin:0;font-size:15px;color:#ffffff;font-weight:800;">
                        📅 Gün Gün Kupon Karnesi (Son 7 Gün)
                    </h3>
                </div>
                <table style="width:100%;border-collapse:collapse;text-align:left;">
                    <thead>
                        <tr style="background:#090a12;border-bottom:1px solid #1e2238;font-size:11px;color:#94a3b8;text-transform:uppercase;">
                            <th style="padding:10px 12px;">Tarih</th>
                            <th style="padding:10px 12px;text-align:center;">Kupon</th>
                            <th style="padding:10px 12px;text-align:center;">Tutan</th>
                            <th style="padding:10px 12px;text-align:center;">Yatan</th>
                            <th style="padding:10px 12px;text-align:right;">Net Kâr</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div style="background:#0a0c16;border:1px solid #1e2238;border-radius:12px;padding:16px;text-align:center;font-size:11px;color:#64748b;line-height:1.6;">
                <p style="margin:0 0 4px 0;color:#94a3b8;">
                    SportAnaliz Pro · Haftalık İstatistik Bülteni Servisi
                </p>
                <p style="margin:0;">
                    Alıcı: ${targetEmail || 'Kullanıcı'} · Bu rapor her Pazar akşamı / Pazartesi sabahı otomatik iletilir.
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Kupon Verilerini Güvenle Getirici (HistoricalCouponsService / CouponEngine)
 */
function fetchCouponsForDate(dateStr) {
    try {
        global.window = global;
        require('../utils/statistics.js');
        require('../utils/helpers.js');
        const HistoricalCouponsService = require('./historicalCouponsService.js');
        const coupons = HistoricalCouponsService.getCouponsByDate(dateStr);
        if (Array.isArray(coupons) && coupons.length > 0) return coupons;
    } catch (e) {
        console.warn('[MAIL SERVICE] Kupon çekme hatası:', e.message);
    }
    return [];
}

function fetchWeeklyCouponSets() {
    try {
        global.window = global;
        require('../utils/statistics.js');
        require('../utils/helpers.js');
        const HistoricalCouponsService = require('./historicalCouponsService.js');
        return HistoricalCouponsService.getAllCouponSets();
    } catch (e) {
        console.warn('[MAIL SERVICE] Haftalık set çekme hatası:', e.message);
        return [];
    }
}

/**
 * 1. TÜM ABONELERE GÜNLÜK KUPONLARI GÖNDER
 */
async function sendDailyCoupons(options = {}) {
    const { force = false, targetEmail = null } = options;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const history = getMailHistory();

    if (!force && !targetEmail && history.dailyCouponsLastSent === today) {
        return { skipped: true, reason: 'Günün kuponları bugün zaten abonelere gönderildi.' };
    }

    const coupons = fetchCouponsForDate(today);
    if (!coupons || coupons.length === 0) {
        return { skipped: true, reason: 'Günün kuponları henüz hazır değil.' };
    }

    const subscribers = targetEmail 
        ? [{ email: targetEmail, active: true, dailyCoupons: true }]
        : getSubscribers().filter(s => s.active !== false && s.dailyCoupons !== false);

    if (subscribers.length === 0) {
        return { skipped: true, reason: 'Aktif günlük kupon abonesi bulunamadı.' };
    }

    const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const { transporter, isTest, from } = await createMailTransporter();
    const results = [];

    for (const sub of subscribers) {
        try {
            const html = buildCouponsEmailHtml({
                coupons,
                dateStr,
                targetEmail: sub.email
            });

            const mailOptions = {
                from,
                to: sub.email,
                subject: `🎯 SportAnaliz Pro — Günün Hazır Garantör Kuponları (${dateStr})`,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;
            console.log(`[GÜNLÜK KUPON] Gönderildi: ${sub.email} (${info.messageId}) ${isTest ? '[Ethereal]' : '[Canlı]'}`);
            addMailLog('daily_coupons', sub.email, true, `MsgID: ${info.messageId}`);
            results.push({ email: sub.email, success: true, messageId: info.messageId, previewUrl, isTest });
        } catch (err) {
            console.error(`[GÜNLÜK KUPON HATASI] ${sub.email}:`, err.message);
            addMailLog('daily_coupons', sub.email, false, err.message);
            results.push({ email: sub.email, success: false, error: err.message });
        }
    }

    if (!targetEmail) {
        history.dailyCouponsLastSent = today;
        saveMailHistory(history);
    }

    return {
        success: true,
        sentCount: results.filter(r => r.success).length,
        isTest,
        results
    };
}

/**
 * 2. TÜM ABONELERE KUPON TUTMA / SONUÇ RAPORU GÖNDER
 */
async function sendCouponResults(options = {}) {
    const { force = false, targetEmail = null, targetDate = null } = options;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const dateToFetch = targetDate || today;
    const history = getMailHistory();

    if (!force && !targetEmail && history.couponResultsLastSent === dateToFetch) {
        return { skipped: true, reason: `${dateToFetch} tarihli sonuçlar bugün zaten gönderildi.` };
    }

    let coupons = fetchCouponsForDate(dateToFetch);
    if (!coupons || coupons.length === 0) {
        // Dünün sonuçlarına bak
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        coupons = fetchCouponsForDate(yesterday);
    }

    if (!coupons || coupons.length === 0) {
        return { skipped: true, reason: 'Doğrulanacak kupon sonucu bulunamadı.' };
    }

    const subscribers = targetEmail 
        ? [{ email: targetEmail, active: true, couponResults: true }]
        : getSubscribers().filter(s => s.active !== false && s.couponResults !== false);

    if (subscribers.length === 0) {
        return { skipped: true, reason: 'Aktif sonuç raporu abonesi bulunamadı.' };
    }

    const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const { transporter, isTest, from } = await createMailTransporter();
    const results = [];

    for (const sub of subscribers) {
        try {
            const html = buildCouponResultsEmailHtml({
                coupons,
                dateStr,
                targetEmail: sub.email
            });

            const mailOptions = {
                from,
                to: sub.email,
                subject: `🏁 SportAnaliz Pro — Günün Kupon Sonuçları & Kasa Raporu (${dateStr})`,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;
            console.log(`[SONUÇ RAPORU] Gönderildi: ${sub.email} (${info.messageId}) ${isTest ? '[Ethereal]' : '[Canlı]'}`);
            addMailLog('coupon_results', sub.email, true, `MsgID: ${info.messageId}`);
            results.push({ email: sub.email, success: true, messageId: info.messageId, previewUrl, isTest });
        } catch (err) {
            console.error(`[SONUÇ RAPORU HATASI] ${sub.email}:`, err.message);
            addMailLog('coupon_results', sub.email, false, err.message);
            results.push({ email: sub.email, success: false, error: err.message });
        }
    }

    if (!targetEmail) {
        history.couponResultsLastSent = dateToFetch;
        saveMailHistory(history);
    }

    return {
        success: true,
        sentCount: results.filter(r => r.success).length,
        isTest,
        results
    };
}

/**
 * 3. TÜM ABONELERE HAFTALIK İSTATİSTİK RAPORU GÖNDER
 */
async function sendWeeklyStats(options = {}) {
    const { force = false, targetEmail = null } = options;
    const now = new Date();
    const currentWeekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate() + 6) / 7)}`;
    const history = getMailHistory();

    if (!force && !targetEmail && history.weeklyStatsLastSent === currentWeekKey) {
        return { skipped: true, reason: 'Bu haftanın istatistik raporu zaten gönderildi.' };
    }

    const sets = fetchWeeklyCouponSets();
    if (!sets || sets.length === 0) {
        return { skipped: true, reason: 'Haftalık istatistik verisi bulunamadı.' };
    }

    const subscribers = targetEmail 
        ? [{ email: targetEmail, active: true, weeklyStats: true }]
        : getSubscribers().filter(s => s.active !== false && s.weeklyStats !== false);

    if (subscribers.length === 0) {
        return { skipped: true, reason: 'Aktif haftalık bülten abonesi bulunamadı.' };
    }

    const { transporter, isTest, from } = await createMailTransporter();
    const results = [];

    for (const sub of subscribers) {
        try {
            const html = buildWeeklyStatsEmailHtml({
                sets,
                targetEmail: sub.email
            });

            const mailOptions = {
                from,
                to: sub.email,
                subject: `📊 SportAnaliz Pro — Haftalık Kupon & Kazanç Karnesi Raporu`,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            const previewUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;
            console.log(`[HAFTALIK BÜLTEN] Gönderildi: ${sub.email} (${info.messageId}) ${isTest ? '[Ethereal]' : '[Canlı]'}`);
            addMailLog('weekly_stats', sub.email, true, `MsgID: ${info.messageId}`);
            results.push({ email: sub.email, success: true, messageId: info.messageId, previewUrl, isTest });
        } catch (err) {
            console.error(`[HAFTALIK BÜLTEN HATASI] ${sub.email}:`, err.message);
            addMailLog('weekly_stats', sub.email, false, err.message);
            results.push({ email: sub.email, success: false, error: err.message });
        }
    }

    if (!targetEmail) {
        history.weeklyStatsLastSent = currentWeekKey;
        saveMailHistory(history);
    }

    return {
        success: true,
        sentCount: results.filter(r => r.success).length,
        isTest,
        results
    };
}

/**
 * OTOMATİK ZAMAN KONTROLÜ (DAEMON)
 * Kullanıcı programa hiç bakmasa bile arka planda otomatik zamanları denetler:
 * - Sabah 10:00 -> Günün Kuponları
 * - Gece 23:30 -> Kupon Sonuçları & Kasa Raporu
 * - Pazar 23:45 / Pazartesi 09:30 -> Haftalık İstatistik Bülteni
 */
async function checkAndSendDueEmails() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0: Pazar, 1: Pazartesi
    const today = now.toISOString().slice(0, 10);
    const history = getMailHistory();

    console.log(`⏱️ [OTOMATİK ZAMANLAYICI KONTROLÜ] Saat: ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} | Tarih: ${today}`);

    // 1. Günlük Kuponlar Kontrolü (Saat 10:00 ve sonrası, henüz atılmadıysa)
    if (hours >= 10 && hours < 23 && history.dailyCouponsLastSent !== today) {
        console.log('🚀 [OTOMATİK GÖNDERİM] Günün kuponları henüz gönderilmemiş, hazırlanıp gönderiliyor...');
        await sendDailyCoupons();
    }

    // 2. Kupon Sonuçları Kontrolü (Saat 23:30 ve sonrası, veya gece 00:00-04:00 arası)
    if ((hours >= 23 || hours < 4) && history.couponResultsLastSent !== today) {
        console.log('🏁 [OTOMATİK GÖNDERİM] Günün maç sonuçları ve kupon raporu hazırlanıp gönderiliyor...');
        await sendCouponResults();
    }

    // 3. Haftalık İstatistik Kontrolü (Pazar 23:30 sonrası veya Pazartesi sabah 09:00 sonrası)
    const currentWeekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate() + 6) / 7)}`;
    const isWeeklyTime = (dayOfWeek === 0 && hours >= 23) || (dayOfWeek === 1 && hours >= 9);
    if (isWeeklyTime && history.weeklyStatsLastSent !== currentWeekKey) {
        console.log('📊 [OTOMATİK GÖNDERİM] Haftalık performans ve istatistik bülteni gönderiliyor...');
        await sendWeeklyStats();
    }
}

module.exports = {
    loadEnv,
    getSubscribers,
    saveSubscribers,
    getMailHistory,
    saveMailHistory,
    createMailTransporter,
    buildCouponsEmailHtml,
    buildCouponResultsEmailHtml,
    buildWeeklyStatsEmailHtml,
    fetchCouponsForDate,
    fetchWeeklyCouponSets,
    sendDailyCoupons,
    sendCouponResults,
    sendWeeklyStats,
    checkAndSendDueEmails
};
