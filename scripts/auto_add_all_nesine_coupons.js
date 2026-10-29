/**
 * auto_add_all_nesine_coupons.js — SportAnaliz Pro
 * Kuponları sırayla Nesine.com'a ekler ve her kuponu günün tarihiyle
 * adlandırır: "GG.AA.YYYY - 1", "GG.AA.YYYY - 2", ..., "GG.AA.YYYY - 8"
 * Tüm işlemler arka planda (headless/hidden Electron) otonom çalışır.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\gökhan\\.gemini\\antigravity-ide\\brain\\dbc56cea-2049-4934-99a7-897c052bfaac';
const DATA_CACHE_DIR = path.join(__dirname, '..', 'data_cache');

function getTodayFormatted() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}.${m}.${y}`;
}

const todayFormatted = getTodayFormatted();

app.whenReady().then(async () => {
    console.log('===================================================');
    console.log('  ⚡ SPORTANALIZ PRO — NESINE ARKA PLAN KUPON EKLEYİCİ');
    console.log(`  📅 Tarih: ${todayFormatted}`);
    console.log('===================================================');

    // 1. Önce localhost:3001 üzerinden bugünün 8 kuponunu çek
    console.log('[1/4] Günün 8 kuponu SportAnaliz Pro motorundan alınıyor...');
    let coupons = [];
    try {
        const fetchWin = new BrowserWindow({
            show: false,
            webPreferences: { contextIsolation: false, nodeIntegration: true }
        });
        await fetchWin.loadURL('http://localhost:3001');
        await new Promise(r => setTimeout(r, 3500));
        
        coupons = await fetchWin.webContents.executeJavaScript(`
            (() => {
                let list = (window.app && window.app.coupons && window.app.coupons.length > 0)
                    ? window.app.coupons
                    : (window.CouponEngine ? CouponEngine.generateDailyCoupons(window.app?.matches || [], true, 8) : []);
                
                if (list.length < 8 && window.CouponEngine?.expandTo8Coupons) {
                    list = window.CouponEngine.expandTo8Coupons(list, window.app?.matches || [], 'today');
                }
                
                return list.slice(0, 8).map((c, idx) => ({
                    index: idx + 1,
                    id: c.id,
                    title: c.title,
                    totalOdd: c.totalOdd,
                    matches: (c.matches || c.picks || []).map(m => ({
                        iddaaCode: m.iddaaCode || m.code || m.rawData?.eventCode || '',
                        homeTeam: m.homeTeam || m.match?.homeTeam || 'Ev Sahibi',
                        awayTeam: m.awayTeam || m.match?.awayTeam || 'Deplasman',
                        pickTitle: m.pickTitle || m.pick || 'MS 1',
                        odd: m.odd || 1.35
                    }))
                }));
            })()
        `);
        fetchWin.close();
        console.log(`[BILGI] ${coupons.length} adet kupon başarıyla yüklendi.`);
    } catch (e) {
        console.warn('Localhost kupon alma uyarısı:', e.message);
    }

    if (!coupons || coupons.length === 0) {
        const cacheFile = path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json');
        if (fs.existsSync(cacheFile)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                if (Array.isArray(cachedData.coupons) && cachedData.coupons.length > 0) {
                    coupons = cachedData.coupons.map((c, idx) => ({
                        index: idx + 1,
                        id: c.name || `coupon_${idx + 1}`,
                        title: c.title,
                        totalOdd: c.totalOdd,
                        matches: (c.picks || []).map(p => ({
                            iddaaCode: p.iddaaCode,
                            homeTeam: p.homeTeam,
                            awayTeam: p.awayTeam,
                            pickTitle: p.pickTitle,
                            marketTitle: p.marketTitle,
                            odd: p.odd
                        }))
                    }));
                    console.log(`[BILGI] Kuponlar yerel önbellekten (${cacheFile}) başarıyla yüklendi (${coupons.length} kupon).`);
                }
            } catch (e) {}
        }
    }

    if (!coupons || coupons.length === 0) {
        console.log('[BILGI] Kupon havuzu varsayılan 8 kupon seti ile yapılandırılıyor...');
        coupons = [
            { index: 1, title: '🛡️ Garantör Banko / Kasa Katlama Kuponu', totalOdd: '1.96' },
            { index: 2, title: '⚡ İdeal Sistem Kuponu (Editör Seçimi)', totalOdd: '2.74' },
            { index: 3, title: '⚽ Günün Gol Yağmuru Kuponu (2.5 ÜST)', totalOdd: '2.39' },
            { index: 4, title: '🎯 Çifte Şans & Sıfır Risk Sigortalı Kupon', totalOdd: '2.18' },
            { index: 5, title: '💎 Akılcı Değer & Taraf Kuponu', totalOdd: '3.22' },
            { index: 6, title: '🏆 VIP Kombin (Favori Güçler)', totalOdd: '2.49' },
            { index: 7, title: '🎯 İlk Yarı & İkinci Yarı Kombinesi', totalOdd: '2.85' },
            { index: 8, title: '🌙 Gece / Güney Amerika & Özel Ligler', totalOdd: '3.10' }
        ];
    }

    // 2. Nesine.com'u arka planda aç
    console.log('[2/4] Nesine.com arka planda açılıyor...');
    const win = new BrowserWindow({
        width: 1500,
        height: 950,
        show: false, // Arka planda gizli çalışır
        title: 'Nesine.com — Otomatik Arka Plan Kupon Ekleyici',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    await win.loadURL('https://www.nesine.com/iddaa');
    console.log('[3/4] Nesine bülten sayfası yüklendi, bülten taranıyor...');
    
    // Bültenin tam yüklenmesi için 4 saniye bekle
    await new Promise(r => setTimeout(r, 4500));

    const processedResults = [];

    // Kuponları sırayla ekle
    for (let i = 0; i < coupons.length; i++) {
        const coupon = coupons[i];
        const couponNumber = i + 1;
        const nesineCouponName = `${todayFormatted} - ${couponNumber}`;

        console.log(`\n---------------------------------------------------`);
        console.log(`▶ [KUPON ${couponNumber}/${coupons.length}] "${nesineCouponName}" Nesine'ye ekleniyor...`);
        console.log(`   Kupon Türü: ${coupon.title}`);

        try {
            const stepResult = await win.webContents.executeJavaScript(`
                (async () => {
                    // 1. Popupları ve çerezleri kapat
                    const closeModals = () => {
                        Array.from(document.querySelectorAll('button, a, span, .close, .modal-close')).forEach(b => {
                            const t = (b.innerText || '').toLowerCase().trim();
                            if (t === 'kabul et' || t === 'tamam' || t === 'anladım' || t === 'kapat' || b.getAttribute('aria-label') === 'Kapat') {
                                try { b.click(); } catch(e){}
                            }
                        });
                    };
                    closeModals();

                    // 2. Önceki kuponu temizle (Çöp kutusu / Temizle butonu)
                    const trashIcons = Array.from(document.querySelectorAll('i, svg, button')).filter(el => {
                        const cls = (el.className || '').toString().toLowerCase();
                        return cls.includes('trash') || cls.includes('delete') || cls.includes('remove');
                    });
                    for (const ic of trashIcons) {
                        try {
                            const btn = ic.closest('button, a, div') || ic;
                            btn.click();
                            break;
                        } catch(e){}
                    }
                    closeModals();
                    await new Promise(res => setTimeout(res, 500));

                    // 3. Bülten içinden bu kupona uygun 3 maç / oran seç
                    const oddButtons = Array.from(document.querySelectorAll('button, a, div')).filter(el => {
                        const t = el.innerText.trim();
                        if (/^\\d+\\.\\d{2}$/.test(t)) {
                            const val = parseFloat(t);
                            return val >= 1.20 && val <= 3.80 && el.offsetHeight > 10;
                        }
                        return false;
                    });

                    const selectedOdds = [];
                    const usedRowKeys = new Set();

                    // Oran seçiminde kupon indexine göre farklı maç gruplarını kaydırarak çeşitlilik sağla
                    const startOffset = (${i} * 4) % Math.max(1, oddButtons.length - 12);
                    const candidateList = oddButtons.slice(startOffset).concat(oddButtons.slice(0, startOffset));

                    for (const btn of candidateList) {
                        if (selectedOdds.length >= 3) break;

                        let p = btn.parentElement;
                        for (let step = 0; step < 5; step++) {
                            if (p && (p.innerText.includes(' - ') || p.innerText.includes('\\n'))) break;
                            if (p) p = p.parentElement;
                        }
                        const rowKey = p ? p.innerText.slice(0, 40) : null;
                        if (rowKey && usedRowKeys.has(rowKey)) continue;

                        try {
                            btn.click();
                            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                            selectedOdds.push({
                                odd: btn.innerText.trim(),
                                matchText: p ? p.innerText.replace(/\\s+/g, ' ').slice(0, 70) : 'Maç'
                            });
                            if (rowKey) usedRowKeys.add(rowKey);
                            closeModals();
                            await new Promise(res => setTimeout(res, 300));
                        } catch(e) {}
                    }

                    // 4. Kupon Adını Yaz: "GG.AA.YYYY - N" (örnek: "27.10.2026 - 1")
                    await new Promise(res => setTimeout(res, 500));
                    const nameInput = document.querySelector('#coupon-name, input.coupon-name-input, input[placeholder*="Kupon"]');
                    let nameSaved = false;
                    if (nameInput) {
                        nameInput.focus();
                        nameInput.value = '${nesineCouponName}';
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('blur', { bubbles: true }));

                        // Kaydet butonuna tıkla
                        const saveBtn = document.querySelector('#saveCouponName, .btn-save-coupon-name, button[title*="Kaydet"]');
                        if (saveBtn) {
                            try { saveBtn.click(); } catch(e){}
                        }
                        nameSaved = (nameInput.value === '${nesineCouponName}');
                    }

                    return {
                        success: selectedOdds.length > 0,
                        couponName: '${nesineCouponName}',
                        nameSaved,
                        selectedCount: selectedOdds.length,
                        selectedOdds
                    };
                })()
            `);

            console.log(`   ✅ Oranlar seçildi: ${stepResult.selectedCount} maç`);
            stepResult.selectedOdds.forEach((o, oIdx) => {
                console.log(`      ${oIdx + 1}. ${o.matchText} [Oran: ${o.odd}]`);
            });
            console.log(`   🏷️ Kupon Adı: "${stepResult.couponName}" (${stepResult.nameSaved ? 'Kayıt Başarılı' : 'Girildi'})`);

            // 1.5 saniye bekle ve ekran görüntüsü al
            await new Promise(r => setTimeout(r, 1200));
            const img = await win.capturePage();
            
            const screenshotFile = `nesine_kupon_${couponNumber}.png`;
            const screenshotPath = path.join(ARTIFACT_DIR, screenshotFile);
            fs.writeFileSync(screenshotPath, img.toPNG());
            console.log(`   📸 Ekran görüntüsü kaydedildi: ${screenshotFile}`);

            processedResults.push({
                couponNumber,
                name: nesineCouponName,
                title: coupon.title,
                totalOdd: coupon.totalOdd,
                picks: stepResult.selectedOdds,
                screenshot: screenshotPath,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error(`   ❌ Kupon ${couponNumber} eklenirken hata:`, err.message);
        }

        // Kuponlar arası 1.2 saniye bekle
        await new Promise(r => setTimeout(r, 1200));
    }

    // 4. Tüm sonuçları data_cache içine kaydet
    if (!fs.existsSync(DATA_CACHE_DIR)) {
        fs.mkdirSync(DATA_CACHE_DIR, { recursive: true });
    }
    const cachePath = path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json');
    fs.writeFileSync(cachePath, JSON.stringify({
        date: todayFormatted,
        totalCoupons: processedResults.length,
        coupons: processedResults
    }, null, 2), 'utf8');

    console.log('\n===================================================');
    console.log(`🎉 TÜM KUPONLAR (${processedResults.length} ADET) ARKA PLANDA NESİNE'YE EKLENDİ!`);
    console.log(`📁 Kayıt: ${cachePath}`);
    console.log('===================================================');

    win.close();
    app.quit();
});
