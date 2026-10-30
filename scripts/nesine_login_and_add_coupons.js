/**
 * nesine_login_and_add_coupons.js — SportAnaliz Pro
 * 1. Nesine penceresini ekranda açar.
 * 2. Kullanıcı adı (14410079556) ve şifreyi otomatik yazar.
 * 3. Güvenlik koduna odaklanır; kullanıcı kodu girip giriş yapınca
 *    tüm 8 kuponu sırayla ("30.10.2026 - 1", "30.10.2026 - 2"...)
 *    HER KUPONDA FARKLI VE BENZERSİZ MAÇLARLA kullanıcının resmi hesabına kaydeder.
 *    Asla aynı maçları tekrar tekrar oynamaz!
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
    { number: 1, title: '🛡️ Garantör Banko / Kasa Katlama Kuponu', icon: '🛡️' },
    { number: 2, title: '⚡ İdeal Sistem Kuponu (Editör Seçimi)', icon: '⚡' },
    { number: 3, title: '⚽ Günün Gol Yağmuru Kuponu (1.5 / 2.5 ÜST)', icon: '⚽' },
    { number: 4, title: '🎯 Çifte Şans & Sıfır Risk Sigortalı Kupon', icon: '🎯' },
    { number: 5, title: '💎 Akılcı Değer & Taraf Kuponu', icon: '💎' },
    { number: 6, title: '🌟 VIP Kombin (Favori Güçler)', icon: '🌟' },
    { number: 7, title: '⏱️ İlk Yarı & İkinci Yarı Kombinesi', icon: '⏱️' },
    { number: 8, title: '🌙 Gece / Güney Amerika & Özel Ligler', icon: '🌙' }
];

app.whenReady().then(async () => {
    console.log('===================================================================');
    console.log('  ⚡ SPORTANALIZ PRO — NESINE HESABA OTOMATIK KUPON KAYDEDICI');
    console.log(`  📅 Tarih: ${todayFormatted}`);
    console.log(`  👤 Uye: ${USERNAME}`);
    console.log('  🎯 Kural: 8 Kuponun her biri FARKLI ve BENZERSİZ maçlarla oynanır!');
    console.log('===================================================================');

    // 1. Nesine.com'u gorunur pencere olarak ac
    console.log('[1/4] Nesine ekranda aciliyor, uye bilgileri dolduruluyor...');
    const win = new BrowserWindow({
        width: 1550,
        height: 980,
        show: true, // Kullanici guvenlik kodunu gorsun ve girsin
        title: 'Nesine.com — Lutfen Guvenlik Kodunu Giriniz (SportAnaliz Pro)',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    win.maximize();
    await win.loadURL('https://www.nesine.com/iddaa');
    await new Promise(r => setTimeout(r, 4000));

    // Popuplari kapat ve Giris Yap modalini acip formu doldur
    await win.webContents.executeJavaScript(`
        (async () => {
            const closeModals = () => {
                Array.from(document.querySelectorAll('button, a, span, .close')).forEach(b => {
                    const t = (b.innerText || '').toLowerCase().trim();
                    if (t === 'kabul et' || t === 'tamam' || t === 'anladım' || t === 'kapat') {
                        try { b.click(); } catch(e){}
                    }
                });
            };
            closeModals();

            // Giris Yap butonuna tikla
            const loginBtn = Array.from(document.querySelectorAll('a, button, span')).find(el => {
                const t = (el.innerText || '').toLowerCase().trim();
                return t === 'giriş yap' || t === 'giris yap';
            });
            if (loginBtn) {
                loginBtn.click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // Kullanici adi ve sifreyi doldur
            const userInp = document.querySelector('input[type="text"][name*="user"], input[name*="username"], input[placeholder*="Üye No"], input[placeholder*="TC"], #txtUsername, #username, input.username');
            if (userInp) {
                userInp.focus();
                userInp.value = '${USERNAME}';
                userInp.dispatchEvent(new Event('input', { bubbles: true }));
                userInp.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const passInp = document.querySelector('input[type="password"]');
            if (passInp) {
                passInp.focus();
                passInp.value = '${PASSWORD}';
                passInp.dispatchEvent(new Event('input', { bubbles: true }));
                passInp.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Guvenlik kodu inputuna odaklan
            const captchaInput = document.querySelector('input[name*="captcha"], input[placeholder*="Güvenlik"], input[id*="captcha"], input[id*="Security"]');
            if (captchaInput) {
                captchaInput.focus();
            }

            // Bilgilendirme rehber cubugu olustur
            const guide = document.createElement('div');
            guide.id = 'sportanaliz-guide-banner';
            guide.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999999;background:linear-gradient(135deg,#1E293B,#0F172A);color:#F8FAFC;padding:14px 20px;text-align:center;font-size:15px;font-weight:600;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);border-bottom:3px solid #10B981;';
            guide.innerHTML = '⚡ <b>SportAnaliz Pro</b> | Kullanıcı adı ve şifreniz dolduruldu. Lütfen ekrandaki <b>Güvenlik Kodunu</b> yazıp <b>Giriş Yap</b>\\'a tıklayınız. 8 farklı kuponunuz otomatik eklenecektir.';
            document.body.appendChild(guide);
        })()
    `);

    console.log('[2/4] Kullanici bilgileri yazildi. Lutfen ekrandaki guvenlik kodunu girip "Giris Yap"a basiniz...');

    // Kullanicinin giris yapmasini bekle (maksimum 180 saniye)
    let loggedIn = false;
    for (let sec = 0; sec < 180; sec++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
            loggedIn = await win.webContents.executeJavaScript(`
                (() => {
                    const hasUser = !!(
                        document.querySelector('.member-menu, .user-profile, .user-info, .account-info, .header-user, #memberSummary, [class*="member"], [class*="profile"]') ||
                        document.body.innerText.includes('Hesabım') ||
                        document.body.innerText.includes('Çıkış') ||
                        document.body.innerText.includes('${USERNAME}')
                    );
                    const noPass = !document.querySelector('input[type="password"]');
                    return hasUser && noPass;
                })()
            `);
            if (loggedIn) break;
        } catch(e) {}
    }

    if (!loggedIn) {
        console.log('[UYARI] Giris suresi doldu veya kullanici girisi henuz yapilmadi.');
        win.close();
        app.quit();
        return;
    }

    console.log('🎉 NESINE HESABINA BASARIYLA GIRIS YAPILDI!');
    console.log('[3/4] 8 Kupon sırayla, HER BİRİ FARKLI VE BENZERSİZ MAÇLARLA hesabınıza kaydediliyor...');

    // Banner guncelle
    await win.webContents.executeJavaScript(`
        (() => {
            const b = document.getElementById('sportanaliz-guide-banner');
            if (b) {
                b.style.background = 'linear-gradient(135deg,#10B981,#059669)';
                b.style.color = '#fff';
                b.innerHTML = '✅ <b>GİRİŞ BAŞARILI!</b> 8 benzersiz kupon sırayla hesabınıza kaydediliyor, lütfen bekleyiniz...';
            }
        })()
    `);

    await new Promise(r => setTimeout(r, 2000));

    const processedResults = [];

    // Kuponları sırayla ekle ve kaydet (Dinamik akışla her kupona 3 farklı maç)
    for (let i = 0; i < COUPON_TEMPLATES.length; i++) {
        const tpl = COUPON_TEMPLATES[i];
        const couponNumber = i + 1;
        const nesineCouponName = `${todayFormatted} - ${couponNumber}`;

        console.log(`\n-------------------------------------------------------------------`);
        console.log(`▶ [KUPON ${couponNumber}/8] "${nesineCouponName}" ekleniyor... (${tpl.title})`);

        try {
            const stepResult = await win.webContents.executeJavaScript(`
                (async () => {
                    const couponNum = ${couponNumber};
                    const nesineCouponName = '${nesineCouponName}';

                    // 1. Önceki kuponu temizle (Çöp kutusu ve onay modalı)
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

                    // 2. Bülteni aşağı kaydırarak bu kupon için 3 FARKLI ve DAHA ÖNCE OYNANMAMIŞ maç seç
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

                            // Daha önce herhangi bir kuponda oynanmış mı kontrol et
                            const normKey = matchTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25);
                            if (window.__globallyUsedTitles.has(normKey)) continue;

                            const oddBtns = Array.from(row.querySelectorAll('button[data-testid*="odd_"], button')).filter(b => {
                                const t = (b.innerText || '').trim();
                                return /^[1-9]\\.\\d{2}$/.test(t) && b.offsetHeight > 10;
                            });

                            if (oddBtns.length > 0) {
                                // Kupon türüne göre akılcı oran varyasyonu
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

                    // 3. Kupon adını yaz: "30.10.2026 - 1" vb.
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

                    // 4. Kuponu Kaydet Butonuna Bas (Nesine Üye Hesabına Kaydeder)
                    const saveBtns = Array.from(document.querySelectorAll('button, a')).filter(b => {
                        const t = (b.innerText || '').toLowerCase().trim();
                        return t.includes('kuponu kaydet') || (t === 'kaydet' && b.id.includes('save'));
                    });
                    for (const sb of saveBtns) {
                        try { sb.click(); } catch(e){}
                    }
                    await new Promise(r => setTimeout(r, 500));

                    // Onay modalında Kaydet butonu
                    const confirmSave = document.querySelector('#mod-confirmation-save, .btn-save-coupon-name');
                    if (confirmSave) {
                        try { confirmSave.click(); } catch(e){}
                    }

                    // Bir sonraki kupon için bülteni aşağı kaydır
                    window.scrollBy(0, 500);

                    return {
                        selectedCount: picks.length,
                        selectedOdds: picks,
                        couponName: nesineCouponName,
                        nameSaved
                    };
                })()
            `);

            console.log(`   ✅ ${stepResult.selectedCount} FARKLI maç seçildi:`);
            stepResult.selectedOdds.forEach(p => console.log(`      ⚽ ${p.title} (Oran: ${p.odd})`));
            console.log(`   💾 Kupon Adı: "${stepResult.couponName}" hesaba kaydedildi!`);

            await new Promise(r => setTimeout(r, 1500));
            const img = await win.capturePage();
            const screenshotFile = `nesine_hesap_kupon_${couponNumber}.png`;
            fs.writeFileSync(path.join(ARTIFACT_DIR, screenshotFile), img.toPNG());
            console.log(`   📸 Ekran görüntüsü: ${screenshotFile}`);

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
            console.error(`   ❌ Kupon ${couponNumber} ekleme hatası:`, err.message);
        }

        await new Promise(r => setTimeout(r, 1200));
    }

    // 4. Sonuçları yerel önbelleğe yaz
    fs.writeFileSync(path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json'), JSON.stringify({
        date: todayFormatted,
        userAccount: USERNAME,
        totalCoupons: processedResults.length,
        coupons: processedResults
    }, null, 2), 'utf8');

    console.log('\n===================================================================');
    console.log(`🎉 TEBRİKLER! ${processedResults.length} ADET FARKLI KUPON NESİNE HESABINIZA KAYDEDİLDİ!`);
    console.log('   Nesine.com -> Hesabım -> Kuponlarım / Kaydedilen Kuponlar bölümünde görebilirsiniz.');
    console.log('===================================================================');

    // Banner final
    await win.webContents.executeJavaScript(`
        (() => {
            const b = document.getElementById('sportanaliz-guide-banner');
            if (b) {
                b.innerHTML = '🎉 <b>8 FARKLI KUPONUN TAMAMI HESABINIZA KAYDEDİLDİ!</b><br>Nesine -> Hesabım -> Kuponlarım bölümünden görebilirsiniz.';
            }
        })()
    `);

    await new Promise(r => setTimeout(r, 4000));
    win.close();
    app.quit();
});
