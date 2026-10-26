const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1500,
        height: 950,
        title: 'Nesine.com — Otomatik Kupon Ekleyici (SportAnaliz Pro)',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadURL('https://www.nesine.com/iddaa');

    win.webContents.on('did-finish-load', () => {
        console.log('Nesine sayfası yüklendi, bülten taranıyor...');
        setTimeout(async () => {
            try {
                const addResult = await win.webContents.executeJavaScript(`
                    (() => {
                        // 1. Çerez ve bildirim popuplarını kapat
                        const allBtns = Array.from(document.querySelectorAll('button, a, span'));
                        allBtns.forEach(b => {
                            const t = (b.innerText || '').toLowerCase().trim();
                            if (t === 'kabul et' || t === 'tamam' || t === 'anladım' || t === 'kapat' || b.getAttribute('aria-label') === 'Kapat') {
                                try { b.click(); } catch(e){}
                            }
                        });

                        // 2. Bülten içindeki oran butonlarını topla
                        const oddButtons = Array.from(document.querySelectorAll('button, a, div')).filter(el => {
                            const t = el.innerText.trim();
                            // Sadece geçerli oran formatındaki butonlar (1.20 - 4.50 arası)
                            if (/^\\d+\\.\\d{2}$/.test(t)) {
                                const val = parseFloat(t);
                                return val >= 1.20 && val <= 3.50 && el.offsetHeight > 10;
                            }
                            return false;
                        });

                        console.log('Bulunan oran butonu sayısı:', oddButtons.length);

                        // 3. Farklı maçlardan 3 tane garantör / ideal oran seç ve tıkla
                        const clicked = [];
                        const clickedParents = new Set();

                        for (const btn of oddButtons) {
                            if (clicked.length >= 3) break;
                            
                            // Aynı maçtan birden fazla oran seçmemek için üst konteynırı kontrol et
                            let parentRow = btn.parentElement;
                            for (let i = 0; i < 5; i++) {
                                if (parentRow && (parentRow.innerText.includes(' - ') || parentRow.innerText.includes('\\n'))) break;
                                if (parentRow) parentRow = parentRow.parentElement;
                            }
                            const rowKey = parentRow ? parentRow.innerText.slice(0, 50) : null;
                            if (rowKey && clickedParents.has(rowKey)) continue;

                            // Orana tıkla
                            try {
                                btn.click();
                                btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                const oddVal = btn.innerText.trim();
                                clicked.push({
                                    odd: oddVal,
                                    matchText: parentRow ? parentRow.innerText.replace(/\\s+/g, ' ').slice(0, 80) : 'Maç'
                                });
                                if (rowKey) clickedParents.add(rowKey);
                            } catch(e) {}
                        }

                        // Kupon kontrolü
                        const kuponText = (document.body.innerText || '');
                        const hasKupon = kuponText.includes('Kuponum') || kuponText.includes('Kupon Tutarı') || kuponText.includes('Toplam Oran');

                        return {
                            success: clicked.length > 0,
                            clickedCount: clicked.length,
                            clicked,
                            hasKupon
                        };
                    })()
                `);

                console.log('KUPO NA EKLEME SONUCU:', JSON.stringify(addResult, null, 2));

                // 2 saniye sonra kuponun güncellenmesini bekle ve ekran görüntüsü al
                setTimeout(async () => {
                    const image = await win.capturePage();
                    const artifactDir = path.join('C:\\Users\\gökhan\\.gemini\\antigravity-ide\\brain\\dbc56cea-2049-4934-99a7-897c052bfaac');
                    const screenshotPath = path.join(artifactDir, 'nesine_kupon_eklendi.png');
                    fs.writeFileSync(screenshotPath, image.toPNG());
                    console.log('✅ Ekran görüntüsü kaydedildi:', screenshotPath);
                }, 2500);

            } catch (err) {
                console.error('Kupon ekleme hatası:', err.message);
            }
        }, 5000);
    });
});
