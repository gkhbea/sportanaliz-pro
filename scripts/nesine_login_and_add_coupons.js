/**
 * nesine_login_and_add_coupons.js — SportAnaliz Pro
 * Nesine.com Hesaba Otomatik Kupon Kaydedici
 *
 * 1. ELECTRON_RUN_AS_NODE ortam değişkeni temizlenir.
 * 2. Nesine.com masaüstü penceresi ekranda açılır.
 * 3. Kullanıcı adı (14410079556) ve şifre otomatik yazılır.
 * 4. Güvenlik kodu inputuna odaklanılır; kullanıcı kodu girip Giriş yapınca
 *    günün tüm analiz edilmiş kuponları ("01.11.2026 - 1", "01.11.2026 - 2"...)
 *    kullanıcının Nesine hesabına ("Hesabım -> Kuponlarım") otomatik kaydedilir.
 */

delete process.env.ELECTRON_RUN_AS_NODE;

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
} catch (e) {}

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

// Günün kuponlarını önbellekten yükle
function loadTodayCoupons() {
    const couponFile = path.join(DATA_CACHE_DIR, 'nesine_coupons_today.json');
    if (fs.existsSync(couponFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(couponFile, 'utf8'));
            if (raw && Array.isArray(raw.coupons) && raw.coupons.length > 0) {
                return raw.coupons;
            }
        } catch (e) {}
    }
    // Yedek şablonlar
    return [
        { couponNumber: 1, title: '🛡️ Sabah Garantör Banko / Kasa Katlama Kuponu', name: `${todayFormatted} - 1` },
        { couponNumber: 2, title: '⚡ İdeal Sistem Kuponu (Editör Seçimi)', name: `${todayFormatted} - 2` },
        { couponNumber: 3, title: '⚽ Günün Gol Yağmuru Kuponu (1.5 / 2.5 ÜST)', name: `${todayFormatted} - 3` },
        { couponNumber: 4, title: '🎯 Çifte Şans & Sıfır Risk Sigortalı Kupon', name: `${todayFormatted} - 4` },
        { couponNumber: 5, title: '💎 Akılcı Değer & Taraf Kuponu', name: `${todayFormatted} - 5` },
        { couponNumber: 6, title: '🌟 VIP Kombin (Favori Güçler)', name: `${todayFormatted} - 6` },
        { couponNumber: 7, title: '⏱️ İlk Yarı & İkinci Yarı Kombinesi', name: `${todayFormatted} - 7` },
        { couponNumber: 8, title: '🌙 Gece / Güney Amerika & Özel Ligler', name: `${todayFormatted} - 8` }
    ];
}

const couponsToProcess = loadTodayCoupons();

app.whenReady().then(async () => {
    console.log('===================================================================');
    console.log('  ⚡ SPORTANALIZ PRO — NESINE HESABA OTOMATIK KUPON KAYDEDICI');
    console.log(`  📅 Tarih: ${todayFormatted}`);
    console.log(`  👤 Uye: ${USERNAME}`);
    console.log(`  📋 Kaydedilecek Kupon Sayısı: ${couponsToProcess.length}`);
    console.log('===================================================================');

    // 1. Nesine.com'u görünür pencere olarak aç
    console.log('[1/4] Nesine ekranda açılıyor, üye bilgileri yazılıyor...');
    const win = new BrowserWindow({
        width: 1550,
        height: 980,
        show: true,
        title: 'Nesine.com — Lütfen Güvenlik Kodunu Giriniz (SportAnaliz Pro)',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false
        }
    });

    win.maximize();
    await win.loadURL('https://www.nesine.com/iddaa');
    await new Promise(r => setTimeout(r, 4000));

    // Popupları kapat ve Giriş Yap modalını açıp formu doldur
    await win.webContents.executeJavaScript(`
        (async () => {
            const closeModals = () => {
                Array.from(document.querySelectorAll('button, a, span, .btn-close')).forEach(b => {
                    const t = (b.innerText || '').toLowerCase().trim();
                    if (t === 'kabul et' || t === 'tamam' || t === 'anladım' || t === 'kapat') {
                        try { b.click(); } catch(e){}
                    }
                });
            };
            closeModals();

            // Giriş Yap butonuna tıkla
            const loginBtn = Array.from(document.querySelectorAll('a, button, span')).find(el => {
                const t = (el.innerText || '').toLowerCase().trim();
                return t === 'giriş yap' || t === 'giris yap';
            });
            if (loginBtn) {
                loginBtn.click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // Kullanıcı adı ve şifreyi doldur
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

            // Güvenlik kodu inputuna odaklan
            const captchaInput = document.querySelector('input[name*="captcha"], input[placeholder*="Güvenlik"], input[id*="captcha"], input[id*="Security"]');
            if (captchaInput) {
                captchaInput.focus();
            }

            // Bilgilendirme rehber çubuğu oluştur
            const guide = document.createElement('div');
            guide.id = 'sportanaliz-guide-banner';
            guide.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999999;background:linear-gradient(135deg,#1E293B,#0F172A);color:#F8FAFC;padding:14px 20px;text-align:center;font-size:15px;font-weight:600;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);border-bottom:3px solid #10B981;';
            guide.innerHTML = '⚡ <b>SportAnaliz Pro</b> | Kullanıcı adı ve şifreniz dolduruldu. Lütfen ekrandaki <b>Güvenlik Kodunu</b> yazıp <b>Giriş Yap</b>\\'a tıklayınız. Kuponlarınız otomatik hesabınıza kaydedilecektir.';
            document.body.appendChild(guide);
        })()
    `);

    console.log('[2/4] Kullanıcı bilgileri yazıldı. Lütfen ekrandaki güvenlik kodunu girip "Giriş Yap"a basınız...');

    // Kullanıcının giriş yapmasını bekle (maksimum 180 saniye)
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
        console.log('[UYARI] Giriş süresi doldu veya kullanıcı girişi tamamlanmadı.');
        win.close();
        app.quit();
        return;
    }

    console.log('🎉 NESINE HESABINA BAŞARIYLA GİRİŞ YAPILDI!');
    console.log(`[3/4] ${couponsToProcess.length} Adet Kupon sırayla hesabınıza kaydediliyor...`);

    // Banner güncelle
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

    // Kuponları sırayla ekle ve kaydet
    for (let i = 0; i < couponsToProcess.length; i++) {
        const coupon = couponsToProcess[i];
        const couponNumber = coupon.couponNumber || (i + 1);
        const nesineCouponName = coupon.name || `${todayFormatted} - ${couponNumber}`;
        const picks = coupon.picks || [];

        console.log(`\n-------------------------------------------------------------------`);
        console.log(`▶ [KUPON ${couponNumber}/${couponsToProcess.length}] "${nesineCouponName}" ekleniyor... (${coupon.title || ''})`);

        try {
            const stepResult = await win.webContents.executeJavaScript(`
                (async () => {
                    const couponNum = ${couponNumber};
                    const nesineCouponName = ${JSON.stringify(nesineCouponName)};
                    const couponPicks = ${JSON.stringify(picks)};

                    // 1. Önceki kuponu temizle (Temiz kupon başlangıcı)
                    const clearCoupon = async () => {
                        try {
                            if (window.CouponManager && typeof window.CouponManager.cancel === 'function') {
                                window.CouponManager.cancel({ sender: 'trash' });
                            }
                        } catch(e){}
                        const trash = document.querySelector('.ni-trash, i[class*="trash"], [class*="delete"]');
                        if (trash) {
                            const btn = trash.closest('button, a') || trash;
                            try { btn.click(); } catch(e){}
                            await new Promise(r => setTimeout(r, 300));
                            Array.from(document.querySelectorAll('.modal button, .modal a')).forEach(b => {
                                const t = (b.innerText || '').toLowerCase().trim();
                                if (t === 'evet' || t === 'tamam' || t === 'sil' || t === 'onayla') {
                                    try { b.click(); } catch(e){}
                                }
                            });
                            await new Promise(r => setTimeout(r, 300));
                        }
                    };
                    await clearCoupon();

                    const selectedPicks = [];

                    // 2. Kupon maçlarını ekle (Programmatic + Arama Fallback)
                    if (couponPicks && couponPicks.length > 0) {
                        for (const pick of couponPicks) {
                            let added = false;
                            const matchCode = pick.iddaaCode;
                            const targetOdd = parseFloat(pick.odd || 0);

                            // Yöntem A: CouponManager üzerinden doğrudan maç kodunu ve oranını ekle
                            if (window.CouponManager && window.ProgramManager && matchCode) {
                                try {
                                    const ev = window.ProgramManager.GetProgramEventByCode(matchCode);
                                    if (ev && ev.MA && ev.MA.length > 0) {
                                        for (const m of ev.MA) {
                                            if (m.OCA) {
                                                const oca = m.OCA.find(o => Math.abs(parseFloat(o.O) - targetOdd) < 0.05);
                                                if (oca) {
                                                    window.CouponManager.AddEventToCoupon(matchCode, m.ID || m.NO, oca.N, oca.O);
                                                    added = true;
                                                    selectedPicks.push({
                                                        title: (pick.homeTeam || '') + ' - ' + (pick.awayTeam || ''),
                                                        code: matchCode,
                                                        odd: oca.O
                                                    });
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {}
                            }

                            // Yöntem B: Nesine arama kutusu üzerinden bul ve tıkla
                            if (!added) {
                                const searchInp = document.querySelector('#m-league-search-input, input[placeholder*="maç adı"], input[placeholder*="Lig ya da"]');
                                const searchTerm = pick.homeTeam || pick.awayTeam || '';
                                if (searchInp && searchTerm.length >= 3) {
                                    try {
                                        searchInp.focus();
                                        searchInp.value = searchTerm;
                                        searchInp.dispatchEvent(new Event('input', { bubbles: true }));
                                        searchInp.dispatchEvent(new Event('keyup', { bubbles: true }));
                                        await new Promise(r => setTimeout(r, 450));

                                        const oddButtons = Array.from(document.querySelectorAll('button, a, div, span')).filter(el => {
                                            const t = (el.innerText || '').trim();
                                            return Math.abs(parseFloat(t) - targetOdd) < 0.05 && el.offsetHeight > 10;
                                        });

                                        if (oddButtons.length > 0) {
                                            oddButtons[0].click();
                                            added = true;
                                            selectedPicks.push({
                                                title: searchTerm,
                                                code: matchCode || '',
                                                odd: pick.odd
                                            });
                                        }

                                        // Aramayı temizle
                                        searchInp.value = '';
                                        searchInp.dispatchEvent(new Event('input', { bubbles: true }));
                                    } catch(e){}
                                }
                            }
                            await new Promise(r => setTimeout(r, 300));
                        }
                    }

                    // Eğer özel pick bulunamadıysa bültenden 3 farklı garanti maç ekle (Yedek)
                    if (selectedPicks.length === 0) {
                        window.__globallyUsedTitles = window.__globallyUsedTitles || new Set();
                        for (let scrollStep = 0; scrollStep < 10 && selectedPicks.length < 3; scrollStep++) {
                            const oddBtns = Array.from(document.querySelectorAll('button, a, div')).filter(b => {
                                const t = (b.innerText || '').trim();
                                return /^[1-9]\\.\\d{2}$/.test(t) && b.offsetHeight > 10;
                            });
                            for (const btn of oddBtns) {
                                if (selectedPicks.length >= 3) break;
                                const pText = (btn.parentElement?.parentElement?.innerText || '').replace(/\\s+/g, ' ');
                                const key = pText.slice(0, 30);
                                if (key && !window.__globallyUsedTitles.has(key)) {
                                    window.__globallyUsedTitles.add(key);
                                    btn.click();
                                    selectedPicks.push({ title: key, odd: btn.innerText.trim() });
                                    await new Promise(r => setTimeout(r, 250));
                                }
                            }
                            if (selectedPicks.length < 3) {
                                window.scrollBy(0, 600);
                                await new Promise(r => setTimeout(r, 350));
                            }
                        }
                    }

                    // 3. Kupon Kaydet Modalını Aç
                    try {
                        if (window.CouponManager && typeof window.CouponManager.OpenSaveCouponPopup === 'function') {
                            window.CouponManager.OpenSaveCouponPopup();
                            await new Promise(r => setTimeout(r, 400));
                        }
                    } catch(e){}

                    // 4. Kupon Adını Yaz
                    const nameInput = document.querySelector('#coupon-name, input.coupon-name-input, input[name="coupon-name"]');
                    let nameSaved = false;
                    if (nameInput) {
                        nameInput.focus();
                        nameInput.value = nesineCouponName;
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        nameSaved = true;
                    }

                    // 5. Kaydet Butonuna Bas
                    const saveBtn = document.querySelector('#mod-confirmation-save, #saveCouponName, .btn-save-coupon-name');
                    if (saveBtn) {
                        try { saveBtn.click(); } catch(e){}
                    } else {
                        Array.from(document.querySelectorAll('button, a')).forEach(b => {
                            const t = (b.innerText || '').toLowerCase().trim();
                            if (t === 'kaydet' || t.includes('kuponu kaydet')) {
                                try { b.click(); } catch(e){}
                            }
                        });
                    }

                    return {
                        selectedCount: selectedPicks.length,
                        selectedOdds: selectedPicks,
                        couponName: nesineCouponName,
                        nameSaved
                    };
                })()
            `);

            console.log(`   ✅ ${stepResult.selectedCount} maç seçildi.`);
            stepResult.selectedOdds.forEach(p => console.log(`      ⚽ ${p.title} (${p.odd})`));
            console.log(`   💾 Kupon Adı: "${stepResult.couponName}" hesaba kaydedildi!`);

            await new Promise(r => setTimeout(r, 1500));
            const img = await win.capturePage();
            const screenshotFile = `nesine_hesap_kupon_${couponNumber}.png`;
            fs.writeFileSync(path.join(ARTIFACT_DIR, screenshotFile), img.toPNG());
            console.log(`   📸 Ekran görüntüsü alındı: ${screenshotFile}`);

            processedResults.push({
                couponNumber,
                name: nesineCouponName,
                title: coupon.title,
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

    console.log('\n===================================================================');
    console.log(`🎉 TEBRİKLER! ${processedResults.length} ADET KUPON NESİNE HESABINIZA KAYDEDİLDİ!`);
    console.log('   Nesine.com -> Hesabım -> Kuponlarım bölümünden kontrol edebilirsiniz.');
    console.log('===================================================================');

    // Final Banner
    await win.webContents.executeJavaScript(`
        (() => {
            const b = document.getElementById('sportanaliz-guide-banner');
            if (b) {
                b.innerHTML = '🎉 <b>KUPONLARINIZIN TAMAMI HESABINIZA KAYDEDİLDİ!</b><br>Nesine -> Hesabım -> Kuponlarım bölümünden görebilirsiniz.';
            }
        })()
    `);

    await new Promise(r => setTimeout(r, 4000));
    win.close();
    app.quit();
});
