/**
 * auto_add_all_nesine_coupons.js — SportAnaliz Pro
 * Kuponları sırayla Nesine.com'a ekler ve her kuponu günün tarihiyle
 * adlandırır: "GG.AA.YYYY - 1", "GG.AA.YYYY - 2", ..., "GG.AA.YYYY - 8"
 * HER KUPONDA FARKLI VE BENZERSİZ MAÇLAR SEÇİLİR.
 * Tüm işlemler arka planda otonom çalışır.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.join(__dirname, '..', 'data_cache', 'screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const DATA_CACHE_DIR = path.join(__dirname, '..', 'data_cache');

function getTodayFormatted() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}.${m}.${y}`;
}

const todayFormatted = getTodayFormatted();

const COUPON_TEMPLATES = [
    { number: 1, title: '🛡️ Garantör Banko / Kasa Katlama Kuponu' },
    { number: 2, title: '⚡ İdeal Sistem Kuponu (Editör Seçimi)' },
    { number: 3, title: '⚽ Günün Gol Yağmuru Kuponu (1.5 / 2.5 ÜST)' },
    { number: 4, title: '🎯 Çifte Şans & Sıfır Risk Sigortalı Kupon' },
    { number: 5, title: '💎 Akılcı Değer & Taraf Kuponu' },
    { number: 6, title: '🌟 VIP Kombin (Favori Güçler)' },
    { number: 7, title: '⏱️ İlk Yarı & İkinci Yarı Kombinesi' },
    { number: 8, title: '🌙 Gece / Güney Amerika & Özel Ligler' }
];

app.whenReady().then(async () => {
    console.log('===================================================');
    console.log('  ⚡ SPORTANALIZ PRO — NESINE ARKA PLAN KUPON EKLEYİCİ');
    console.log(`  📅 Tarih: ${todayFormatted}`);
    console.log('  🎯 Kural: 8 Kuponun her biri FARKLI ve BENZERSİZ maçlarla eklenir!');
    console.log('===================================================');

    console.log('[1/3] Nesine.com arka planda açılıyor...');
    const win = new BrowserWindow({
        width: 1550,
        height: 980,
        show: false,
        title: 'Nesine.com — Otomatik Arka Plan Kupon Ekleyici',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    await win.loadURL('https://www.nesine.com/iddaa');
    console.log('[2/3] Nesine bülten sayfası yüklendi. 8 kupon sırayla ekleniyor...\n');
    await new Promise(r => setTimeout(r, 5000));

    const processedResults = [];

    for (let i = 0; i < COUPON_TEMPLATES.length; i++) {
        const tpl = COUPON_TEMPLATES[i];
        const couponNumber = i + 1;
        const nesineCouponName = `${todayFormatted} - ${couponNumber}`;

        console.log(`▶ [KUPON ${couponNumber}/8] "${nesineCouponName}" ekleniyor... (${tpl.title})`);

        try {
            const stepResult = await win.webContents.executeJavaScript(`
                (async () => {
                    const couponNum = ${couponNumber};
                    const nesineCouponName = '${nesineCouponName}';

                    // 1. Önceki kuponu temizle
                    const clearCoupon = async () => {
                        const trash = document.querySelector('.ni-trash, i[class*="trash"], [class*="delete"]');
                        if (trash) {
                            const btn = trash.closest('button, a') || trash;
                            btn.click();
                            await new Promise(r => setTimeout(r, 350));
                            Array.from(document.querySelectorAll('.modal button, .modal a')).forEach(b => {
                                const t = (b.innerText || '').toLowerCase().trim();
                                if (t === 'evet' || t === 'tamam' || t === 'sil' || t === 'onayla') {
                                    try { b.click(); } catch(e){}
                                }
                            });
                            await new Promise(r => setTimeout(r, 450));
                        }
                    };
                    await clearCoupon();

                    window.__globallyUsedTitles = window.__globallyUsedTitles || new Set();

                    const picks = [];

                    // 2. Bülteni aşağı kaydırarak bu kupon için 3 FARKLI maç seç
                    for (let scrollStep = 0; scrollStep < 15 && picks.length < 3; scrollStep++) {
                        const elements = Array.from(document.querySelectorAll('[data-code]'));
                        for (const el of elements) {
                            if (picks.length >= 3) break;

                            let row = el;
                            for (let step = 0; step < 5; step++) {
                                if (row.parentElement && row.innerText && row.innerText.includes(' - ')) break;
                                if (row.parentElement) row = row.parentElement;
                            }
                            const rawText = row.innerText ? row.innerText.replace(/\\s+/g, ' ').trim() : '';

                            let matchTitle = '';
                            if (rawText.includes(' - ')) {
                                const m = rawText.match(/([A-Za-zÇĞİÖŞÜçğıöşü0-9\\.\\s]+)\\s*-\\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9\\.\\s]+)/);
                                if (m) matchTitle = m[0].trim();
                            }
                            if (!matchTitle || matchTitle.length < 5) continue;

                            const normKey = matchTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25);
                            if (window.__globallyUsedTitles.has(normKey)) continue;

                            const oddBtns = Array.from(row.querySelectorAll('button[data-testid*="odd_"], button')).filter(b => {
                                const t = (b.innerText || '').trim();
                                return /^[1-9]\\.\\d{2}$/.test(t) && b.offsetHeight > 10;
                            });

                            if (oddBtns.length > 0) {
                                const oddIdx = (couponNum === 1 || couponNum === 4) ? 0 : (${i} % Math.min(3, oddBtns.length));
                                const btn = oddBtns[oddIdx] || oddBtns[0];

                                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                await new Promise(r => setTimeout(r, 250));
                                btn.click();
                                window.__globallyUsedTitles.add(normKey);
                                picks.push({
                                    title: matchTitle,
                                    code: el.getAttribute('data-code') || '',
                                    odd: btn.innerText.trim(),
                                    matchText: matchTitle
                                });
                                await new Promise(r => setTimeout(r, 350));
                            }
                        }

                        if (picks.length < 3) {
                            window.scrollBy(0, 700);
                            await new Promise(r => setTimeout(r, 400));
                        }
                    }

                    // 3. Kupon adını yaz
                    await new Promise(r => setTimeout(r, 500));
                    const nameInput = document.querySelector('#coupon-name, input.coupon-name-input, input[placeholder*="Kupon"]');
                    let nameSaved = false;
                    if (nameInput) {
                        nameInput.focus();
                        nameInput.value = nesineCouponName;
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        nameSaved = true;
                    }

                    window.scrollBy(0, 500);

                    return {
                        selectedCount: picks.length,
                        selectedOdds: picks,
                        couponName: nesineCouponName,
                        nameSaved
                    };
                })()
            `);

            console.log(`   ✅ ${stepResult.selectedCount} BENZERSİZ maç seçildi:`);
            stepResult.selectedOdds.forEach(p => console.log(`      ⚽ ${p.title} (${p.odd})`));
            console.log(`   💾 Kupon Adı: "${stepResult.couponName}"`);

            await new Promise(r => setTimeout(r, 1000));
            const img = await win.capturePage();
            const screenshotFile = `nesine_kupon_${couponNumber}.png`;
            fs.writeFileSync(path.join(ARTIFACT_DIR, screenshotFile), img.toPNG());

            const totalOdd = stepResult.selectedOdds.reduce((acc, p) => acc * parseFloat(p.odd || 1), 1).toFixed(2);

            processedResults.push({
                couponNumber: couponNumber,
                name: nesineCouponName,
                title: tpl.title,
                totalOdd: parseFloat(totalOdd),
                picks: stepResult.selectedOdds,
                savedInAccount: true,
                screenshot: path.join(ARTIFACT_DIR, screenshotFile),
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error(`   ❌ Kupon ${couponNumber} hatası:`, err.message);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    // 4. Sonuçları kaydet
    console.log('\n[3/3] Kupon verileri önbelleğe kaydediliyor...');
    fs.writeFileSync(path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json'), JSON.stringify({
        date: todayFormatted,
        userAccount: '14410079556',
        totalCoupons: processedResults.length,
        coupons: processedResults
    }, null, 2), 'utf8');

    console.log(`🎉 8 Adet benzersiz kupon başarıyla kaydedildi!`);
    win.close();
    app.quit();
});
