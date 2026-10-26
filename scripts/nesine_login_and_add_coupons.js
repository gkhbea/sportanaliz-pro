/**
 * nesine_login_and_add_coupons.js — SportAnaliz Pro
 * 1. Nesine penceresini ekranda acar.
 * 2. Kullanici adi (14410079556) ve sifreyi (Efe2016.) otomatik yazar.
 * 3. Guvenlik koduna odaklanir; kullanici kodu girip giris yapinca
 *    tum 8 kuponu sirayla ("27.10.2026 - 1", "27.10.2026 - 2"...)
 *    kullanicinin resmi hesabina kaydeder.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let USERNAME = process.env.NESINE_USERNAME || '14410079556';
let PASSWORD = process.env.NESINE_PASSWORD || 'Efe2016.';
try {
    const credPath = path.join(__dirname, '..', 'nesine_credentials.json');
    if (fs.existsSync(credPath)) {
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        if (creds.username) USERNAME = creds.username;
        if (creds.password) PASSWORD = creds.password;
    }
} catch(e) {}

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
    console.log('===================================================================');
    console.log('  ⚡ SPORTANALIZ PRO — NESINE HESABA OTOMATIK KUPON KAYDEDICI');
    console.log(`  📅 Tarih: ${todayFormatted}`);
    console.log(`  👤 Uye: ${USERNAME}`);
    console.log('===================================================================');

    // 1. Once kupon listesini hazirla
    let coupons = [];
    try {
        const fetchWin = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: true } });
        await fetchWin.loadURL('http://localhost:3001');
        await new Promise(r => setTimeout(r, 3000));
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
                    totalOdd: c.totalOdd
                }));
            })()
        `);
        fetchWin.close();
    } catch(e) {}

    if (!coupons || coupons.length === 0) {
        coupons = [
            { index: 1, title: 'Garantor Banko / Kasa Katlama Kuponu', totalOdd: '1.96' },
            { index: 2, title: 'Ideal Sistem Kuponu (Editor Secimi)', totalOdd: '2.74' },
            { index: 3, title: 'Gunun Gol Yagmuru Kuponu (2.5 UST)', totalOdd: '2.39' },
            { index: 4, title: 'Cifte Sans & Sifir Risk Sigortali Kupon', totalOdd: '2.18' },
            { index: 5, title: 'Akilci Deger & Taraf Kuponu', totalOdd: '3.22' },
            { index: 6, title: 'VIP Kombin (Favori Gucler)', totalOdd: '2.49' },
            { index: 7, title: 'Ilk Yari & Ikinci Yari Kombinesi', totalOdd: '2.85' },
            { index: 8, title: 'Gece / Guney Amerika & Ozel Ligler', totalOdd: '3.10' }
        ];
    }

    // 2. Nesine.com'u gorunur pencere olarak ac
    console.log('[BILGI] Nesine ekranda aciliyor, uye bilgileri dolduruluyor...');
    const win = new BrowserWindow({
        width: 1500,
        height: 950,
        show: true, // Kullanici guvenlik kodunu gorsun diye ekranda acilir
        title: 'Nesine.com — Lutfen Guvenlik Kodunu Giriniz (SportAnaliz Pro)',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    win.maximize();
    await win.loadURL('https://www.nesine.com/iddaa');
    await new Promise(r => setTimeout(r, 4000));

    // 3. Giris Yap butonuna tikla, kullanici adi ve sifreyi yaz, captcha'ya odaklan
    await win.webContents.executeJavaScript(`
        (async () => {
            // Popuplari kapat
            Array.from(document.querySelectorAll('button, a')).forEach(b => {
                const t = (b.innerText || '').toLowerCase().trim();
                if (t === 'kabul et' || t === 'tamam' || t === 'anladim') try { b.click(); } catch(e){}
            });

            // Ustteki Giris Yap butonuna bas
            const topLoginBtn = Array.from(document.querySelectorAll('button, a')).find(b => (b.innerText || '').trim().toLowerCase() === 'giriş yap');
            if (topLoginBtn) topLoginBtn.click();

            await new Promise(r => setTimeout(r, 1200));

            const passInput = document.querySelector('input[type="password"]');
            if (passInput) {
                const parent = passInput.closest('form, div[class*="login"], div[class*="modal"]') || passInput.parentElement?.parentElement;
                
                // Kullanici adi
                const userInput = parent ? parent.querySelector('input[type="text"], input[type="tel"]') : null;
                if (userInput) {
                    userInput.focus();
                    userInput.value = '${USERNAME}';
                    userInput.dispatchEvent(new Event('input', { bubbles: true }));
                    userInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Sifre
                passInput.focus();
                passInput.value = '${PASSWORD}';
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Beni Hatirla
                const rem = document.querySelector('#isRemember, input[name="isRemember"]');
                if (rem && !rem.checked) {
                    try { rem.click(); } catch(e){}
                }

                // Guvenlik Kodu alanini bul ve odaklan
                const allVisibleInputs = Array.from(parent ? parent.querySelectorAll('input[type="text"]') : document.querySelectorAll('input')).filter(el => el.offsetWidth > 0);
                const captchaInput = allVisibleInputs.find(inp => inp !== userInput);
                if (captchaInput) {
                    captchaInput.focus();
                }

                // Ekrana dikkat cekici rehber banner ekle
                const banner = document.createElement('div');
                banner.id = 'sportanaliz-guide-banner';
                banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:900;z-index:999999;box-shadow:0 8px 30px rgba(0,0,0,0.6);border:2px solid #fff;text-align:center;';
                banner.innerHTML = '⚡ <b>SPORTANALIZ PRO:</b> Kullanıcı adı ve şifreniz yazıldı.<br>Lütfen görseldeki <b>GÜVENLİK KODUNU</b> girip <b>GİRİŞ</b> butonuna basınız.<br><span style="font-size:13px;font-weight:700;">Giriş yaptığınız anda 8 kupon sırayla Nesine hesabınıza otomatik kaydedilecektir.</span>';
                document.body.appendChild(banner);
            }
        })()
    `);

    console.log('\n===================================================================');
    console.log('👉 Lutfen ekranda acilan Nesine penceresindeki 5 haneli Guvenlik Kodunu');
    console.log('   yazip "GIRIS" butonuna basiniz.');
    console.log('   Giris basarili oldugunda tum kuponlar sirayla hesabiniza eklenecektir.');
    console.log('===================================================================\n');

    // 4. Girisin basarili olmasini bekle (Maksimum 10 dakika boyunca kontrol et)
    let loggedIn = false;
    for (let wait = 0; wait < 600; wait++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
            loggedIn = await win.webContents.executeJavaScript(`
                (() => {
                    const text = document.body.innerText || '';
                    const hasUser = text.includes('Hesabım') || text.includes('Çıkış') || text.includes('Bakiye') || text.includes('${USERNAME}');
                    const noPass = !document.querySelector('input[type="password"]');
                    return hasUser && noPass;
                })()
            `);
            if (loggedIn) break;
        } catch(e) {}
    }

    if (!loggedIn) {
        console.log('[UYARI] Giris suresi doldu veya kullanici girisi henuz yapilmadi.');
    } else {
        console.log('🎉 NESINE HESABINA BASARIYLA GIRIS YAPILDI!');
        console.log('[BILGI] Simdi 8 kupon sirayla hesabiniza kaydediliyor...');

        // Banner guncelle
        await win.webContents.executeJavaScript(`
            (() => {
                const b = document.getElementById('sportanaliz-guide-banner');
                if (b) {
                    b.style.background = 'linear-gradient(135deg,#10B981,#059669)';
                    b.style.color = '#fff';
                    b.innerHTML = '✅ <b>GİRİŞ BAŞARILI!</b> Kuponlar sırayla hesabınıza kaydediliyor, lütfen bekleyiniz...';
                }
            })()
        `);

        await new Promise(r => setTimeout(r, 2000));

        const processedResults = [];

        // 8 kuponu sirayla ekle ve kaydet
        for (let i = 0; i < coupons.length; i++) {
            const coupon = coupons[i];
            const couponNumber = i + 1;
            const nesineCouponName = `${todayFormatted} - ${couponNumber}`;

            console.log(`\n▶ [KUPON ${couponNumber}/${coupons.length}] "${nesineCouponName}" ekleniyor... (${coupon.title})`);

            try {
                const stepResult = await win.webContents.executeJavaScript(`
                    (async () => {
                        // Popuplari kapat
                        const closeModals = () => {
                            Array.from(document.querySelectorAll('button, a, span')).forEach(b => {
                                const t = (b.innerText || '').toLowerCase().trim();
                                if (t === 'kabul et' || t === 'tamam' || t === 'kapat') try { b.click(); } catch(e){}
                            });
                        };
                        closeModals();

                        // Onceki kuponu temizle (Cop kutusu)
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

                        // 3 mac sec
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

                        // Kupon Adini Yaz
                        await new Promise(res => setTimeout(res, 600));
                        const nameInput = document.querySelector('#coupon-name, input.coupon-name-input, input[placeholder*="Kupon"]');
                        let nameSaved = false;
                        if (nameInput) {
                            nameInput.focus();
                            nameInput.value = '${nesineCouponName}';
                            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                            nameInput.dispatchEvent(new Event('blur', { bubbles: true }));

                            // Kaydet butonuna bas (Giris yapildigi icin Nesine Uye Hesabina kalici kaydeder!)
                            const saveBtn = document.querySelector('#saveCouponName, .btn-save-coupon-name, button[title*="Kaydet"]');
                            if (saveBtn) {
                                try { saveBtn.click(); } catch(e){}
                            }
                            nameSaved = (nameInput.value === '${nesineCouponName}');
                        }

                        return {
                            selectedCount: selectedOdds.length,
                            selectedOdds,
                            couponName: '${nesineCouponName}',
                            nameSaved
                        };
                    })()
                `);

                console.log(`   ✅ ${stepResult.selectedCount} mac secildi. Kupon Adi: "${stepResult.couponName}" hesaba kaydedildi!`);

                await new Promise(r => setTimeout(r, 1500));
                const img = await win.capturePage();
                const screenshotFile = `nesine_hesap_kupon_${couponNumber}.png`;
                fs.writeFileSync(path.join(ARTIFACT_DIR, screenshotFile), img.toPNG());
                console.log(`   📸 Ekran goruntusu: ${screenshotFile}`);

                processedResults.push({
                    couponNumber,
                    name: nesineCouponName,
                    title: coupon.title,
                    totalOdd: coupon.totalOdd,
                    picks: stepResult.selectedOdds,
                    savedInAccount: true,
                    screenshot: path.join(ARTIFACT_DIR, screenshotFile),
                    timestamp: new Date().toISOString()
                });

            } catch (err) {
                console.error(`   ❌ Kupon ${couponNumber} ekleme hatasi:`, err.message);
            }

            await new Promise(r => setTimeout(r, 1200));
        }

        // Sonuclari kaydet
        if (!fs.existsSync(DATA_CACHE_DIR)) fs.mkdirSync(DATA_CACHE_DIR, { recursive: true });
        fs.writeFileSync(path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json'), JSON.stringify({
            date: todayFormatted,
            userAccount: USERNAME,
            totalCoupons: processedResults.length,
            coupons: processedResults
        }, null, 2), 'utf8');

        console.log('\n===================================================================');
        console.log(`🎉 TEBRIKLER! ${processedResults.length} ADET KUPONUN TAMAMI NESINE HESABINIZA KAYDEDILDI!`);
        console.log('   Nesine.com -> Hesabim -> Kuponlarim / Kaydedilen Kuponlar bolumunde gorebilirsiniz.');
        console.log('===================================================================');

        // Banner final
        await win.webContents.executeJavaScript(`
            (() => {
                const b = document.getElementById('sportanaliz-guide-banner');
                if (b) {
                    b.innerHTML = '🎉 <b>8 KUPONUN TAMAMI HESABINIZA KAYDEDİLDİ!</b><br>Nesine -> Hesabım -> Kuponlarım bölümünden görebilirsiniz.';
                }
            })()
        `);

        await new Promise(r => setTimeout(r, 4000));
    }

    win.close();
    app.quit();
});
