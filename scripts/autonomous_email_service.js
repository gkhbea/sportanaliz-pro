/**
 * autonomous_email_service.js
 * SportAnaliz Pro - Bağımsız Otonom E-Posta Servisi (Background Daemon)
 * 
 * Bu servis kullanıcının masaüstü uygulamasını veya web tarayıcısını AÇMASINA GEREK KALMADAN:
 * 1. Her gün saat 10:00'da günün hazır garantör kuponlarını gönderir.
 * 2. Her gece saat 23:30'da kuponların tutup tutmadığını, maç skorlarını ve kâr raporunu gönderir.
 * 3. Her Pazar gecesi / Pazartesi sabahı haftalık istatistik ve performans bültenini gönderir.
 * 
 * Kullanım:
 *   node scripts/autonomous_email_service.js           -> Arka plan döngüsünü başlatır
 *   node scripts/autonomous_email_service.js --daily   -> Günlük kuponları hemen gönderir
 *   node scripts/autonomous_email_service.js --results -> Kupon sonuçlarını hemen gönderir
 *   node scripts/autonomous_email_service.js --weekly  -> Haftalık istatistiği hemen gönderir
 *   node scripts/autonomous_email_service.js --all     -> Üç raporu da test için hemen gönderir
 */

const emailService = require('../js/services/emailNotificationService.js');

async function main() {
    const args = process.argv.slice(2);

    console.log(`
╔═════════════════════════════════════════════════════════════════════╗
║  ⚡ SportAnaliz Pro — Otonom E-Posta & Kupon Dağıtım Motoru         ║
║  Alıcı: gokhanelalyz@gmail.com                                      ║
╚═════════════════════════════════════════════════════════════════════╝
    `);

    // 1. Tek Seferlik Manuel Komutlar
    if (args.includes('--daily')) {
        console.log('🚀 [MANUEL TETİKLEME] Günlük kuponlar gönderiliyor...');
        const res = await emailService.sendDailyCoupons({ force: true });
        console.log('Sonuç:', res);
        process.exit(0);
    }

    if (args.includes('--results')) {
        console.log('🏁 [MANUEL TETİKLEME] Kupon sonuçları (tutup tutmadığı) gönderiliyor...');
        const res = await emailService.sendCouponResults({ force: true });
        console.log('Sonuç:', res);
        process.exit(0);
    }

    if (args.includes('--weekly')) {
        console.log('📊 [MANUEL TETİKLEME] Haftalık performans istatistiği gönderiliyor...');
        const res = await emailService.sendWeeklyStats({ force: true });
        console.log('Sonuç:', res);
        process.exit(0);
    }

    if (args.includes('--all')) {
        console.log('⚡ [TEST MODU] Üç e-posta türü de sırayla gönderiliyor...');
        console.log('1/3 Günlük Kuponlar:');
        const r1 = await emailService.sendDailyCoupons({ force: true });
        console.log('   ->', r1.success ? 'Başarılı' : r1.reason || 'Hata');

        console.log('2/3 Kupon Sonuçları (Tutan/Kaybedenler):');
        const r2 = await emailService.sendCouponResults({ force: true });
        console.log('   ->', r2.success ? 'Başarılı' : r2.reason || 'Hata');

        console.log('3/3 Haftalık İstatistik Bülteni:');
        const r3 = await emailService.sendWeeklyStats({ force: true });
        console.log('   ->', r3.success ? 'Başarılı' : r3.reason || 'Hata');

        console.log('\n✅ Tüm test gönderimleri tamamlandı.');
        process.exit(0);
    }

    // 2. Arka Plan Daemon Modu
    console.log('🟢 [DAEMON AKTİF] 7/24 Arka plan zamanlayıcı başlatıldı.');
    console.log('📌 Takvim:');
    console.log('   - Her Sabah 10:00: Günün Hazır Kuponları');
    console.log('   - Her Gece  23:30: Kupon Tutma / Maç Skor Sonuçları & Kâr Raporu');
    console.log('   - Her Pazar 23:45 / Pzt 09:30: Haftalık İstatistik Bülteni\n');

    // İlk açılışta hemen kontrol et (eğer günün maili henüz atılmadıysa gönderir)
    try {
        await emailService.checkAndSendDueEmails();
    } catch (e) {
        console.error('İlk kontrol hatası:', e.message);
    }

    // Her 5 dakikada bir saati kontrol et
    setInterval(async () => {
        try {
            await emailService.checkAndSendDueEmails();
        } catch (e) {
            console.error('Zamanlayıcı kontrol hatası:', e.message);
        }
    }, 5 * 60 * 1000);
}

main().catch(err => {
    console.error('Kritik servis hatası:', err);
});
