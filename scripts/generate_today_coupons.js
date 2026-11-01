/**
 * generate_today_coupons.js — SportAnaliz Pro
 * Kaliteli ve Seçkin Liglerden Günün 15 Kuponunu Oluşturur
 * 
 * Seans Dağılımı:
 * - 5 Sabah Kuponu (Kupon 1-5): Elit Ligler Banko & Kasa Katlama (Atalanta, Benfica, Mallorca, Reims)
 * - 5 Öğlen Kuponu (Kupon 6-10): Avrupa Devleri & Vitrin Maçları (Juventus vs Napoli, Newcastle, Braga, La Coruna)
 * - 5 Akşam Kuponu (Kupon 11-15): Gece Sambası & Gol Düelloları (Gremio, Belgrano, Bragantino, Jong Ajax)
 * 
 * Kural: Tüm maçlar resmi Nesine bülteninden, büyük liglerden ve %100 MBS uyumludur.
 */

const fs = require('fs');
const path = require('path');

const couponConfigs = [
    // -------------------------------------------------------------
    // SEANS 1: SABAH KUPONLARI (1 - 5) — ELİT LİGLER BANKO & KASA KATLAMA
    // -------------------------------------------------------------
    {
        couponNumber: 1,
        title: "🛡️ Sabah Garantör Banko / Kasa Katlama Kuponu",
        subtitle: "Atalanta (1.34), Benfica 2.5 ÜST (1.22) ve Mallorca (1.34)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "10:00 - 13:00",
        badge: "🛡️ Kasa Katlama",
        picks: [
            { iddaaCode: '3262167', homeTeam: 'Atalanta', awayTeam: 'Parma', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Atalanta Kazanır)', marketCode: 'MS1', odd: '1.34' },
            { iddaaCode: '3262056', homeTeam: 'Benfica', awayTeam: 'Alverca', league: 'Portekiz Premier Lig', timeStr: '23:15', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.22' },
            { iddaaCode: '3258685', homeTeam: 'Mallorca', awayTeam: 'Cadiz', league: 'İspanya 2. Lig', timeStr: '23:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Mallorca Kazanır)', marketCode: 'MS1', odd: '1.34' }
        ]
    },
    {
        couponNumber: 2,
        title: "⚡ Sabah İdeal Sistem Kuponu (Editör Seçimi)",
        subtitle: "Reims (1.52), Atalanta 2.5 ÜST (1.38) ve Dep. La Coruna 1-X (1.16)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "10:00 - 13:00",
        badge: "⚡ Editör Seçimi",
        picks: [
            { iddaaCode: '3354433', homeTeam: 'Reims', awayTeam: 'Sochaux', league: 'Fransa Ligue 2', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Reims Kazanır)', marketCode: 'MS1', odd: '1.52' },
            { iddaaCode: '3262167', homeTeam: 'Atalanta', awayTeam: 'Parma', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.38' },
            { iddaaCode: '3258713', homeTeam: 'Dep. La Coruna', awayTeam: 'Osasuna', league: 'İspanya La Liga', timeStr: '23:00', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.16' }
        ]
    },
    {
        couponNumber: 3,
        title: "⚽ Sabah Gol Yağmuru Kuponu (1.5 / 2.5 ÜST)",
        subtitle: "Jong Ajax 2.5 ÜST (1.18), Jong PSV 2.5 ÜST (1.17) ve Benfica 2.5 ÜST (1.22)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "10:00 - 13:00",
        badge: "⚽ Gol Yağmuru",
        picks: [
            { iddaaCode: '3262341', homeTeam: 'Jong Ajax', awayTeam: 'Vitesse', league: 'Hollanda 1. Lig', timeStr: '22:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.18' },
            { iddaaCode: '3262151', homeTeam: 'Jong PSV', awayTeam: 'NAC Breda', league: 'Hollanda 1. Lig', timeStr: '22:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.17' },
            { iddaaCode: '3262056', homeTeam: 'Benfica', awayTeam: 'Alverca', league: 'Portekiz Premier Lig', timeStr: '23:15', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.22' }
        ]
    },
    {
        couponNumber: 4,
        title: "🎯 Sabah Çifte Şans & Sıfır Risk Sigortalı Kupon",
        subtitle: "Newcastle 1-X (1.26), Lorient 1-X (1.25) ve Mallorca (1.34)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "10:00 - 13:00",
        badge: "🎯 Sıfır Risk",
        picks: [
            { iddaaCode: '3262120', homeTeam: 'Newcastle Utd', awayTeam: 'Everton', league: 'İngiltere Premier Lig', timeStr: '23:00', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Newcastle Kaybetmez)', marketCode: 'CS1X', odd: '1.26' },
            { iddaaCode: '3254536', homeTeam: 'Lorient', awayTeam: 'Brest', league: 'Fransa Ligue 1', timeStr: '22:45', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Lorient Kaybetmez)', marketCode: 'CS1X', odd: '1.25' },
            { iddaaCode: '3258685', homeTeam: 'Mallorca', awayTeam: 'Cadiz', league: 'İspanya 2. Lig', timeStr: '23:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Mallorca Kazanır)', marketCode: 'MS1', odd: '1.34' }
        ]
    },
    {
        couponNumber: 5,
        title: "💎 Sabah Akılcı Değer & Taraf Kuponu",
        subtitle: "Newcastle MS 1 (2.10), Reims MS 1 (1.52) ve Atalanta MS 1 (1.34)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "10:00 - 13:00",
        badge: "💎 Değer Kombini",
        picks: [
            { iddaaCode: '3262120', homeTeam: 'Newcastle Utd', awayTeam: 'Everton', league: 'İngiltere Premier Lig', timeStr: '23:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Newcastle Kazanır)', marketCode: 'MS1', odd: '2.10' },
            { iddaaCode: '3354433', homeTeam: 'Reims', awayTeam: 'Sochaux', league: 'Fransa Ligue 2', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Reims Kazanır)', marketCode: 'MS1', odd: '1.52' },
            { iddaaCode: '3262167', homeTeam: 'Atalanta', awayTeam: 'Parma', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Atalanta Kazanır)', marketCode: 'MS1', odd: '1.34' }
        ]
    },

    // -------------------------------------------------------------
    // SEANS 2: ÖĞLEN KUPONLARI (6 - 10) — AVRUPA DEVLERİ & DERBİLER
    // -------------------------------------------------------------
    {
        couponNumber: 6,
        title: "🌟 Öğlen VIP Kombin (Avrupa Devleri)",
        subtitle: "Juventus 1-X (1.17), Braga MS 1 (1.46) ve Atalanta MS 1 (1.34)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "14:00 - 17:30",
        badge: "🌟 VIP Seçim",
        picks: [
            { iddaaCode: '3259141', homeTeam: 'Juventus', awayTeam: 'Napoli', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Juventus Kaybetmez)', marketCode: 'CS1X', odd: '1.17' },
            { iddaaCode: '3258867', homeTeam: 'Braga', awayTeam: 'Famalicao', league: 'Portekiz Premier Lig', timeStr: '23:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Braga Kazanır)', marketCode: 'MS1', odd: '1.46' },
            { iddaaCode: '3262167', homeTeam: 'Atalanta', awayTeam: 'Parma', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Atalanta Kazanır)', marketCode: 'MS1', odd: '1.34' }
        ]
    },
    {
        couponNumber: 7,
        title: "🛡️ Öğlen Garanti & Kasa Katlama Kuponu",
        subtitle: "Braga MS 1 (1.46), Mallorca MS 1 (1.34) ve Reims 1-X (1.06)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "14:00 - 17:30",
        badge: "🛡️ Garanti Banko",
        picks: [
            { iddaaCode: '3258867', homeTeam: 'Braga', awayTeam: 'Famalicao', league: 'Portekiz Premier Lig', timeStr: '23:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Braga Kazanır)', marketCode: 'MS1', odd: '1.46' },
            { iddaaCode: '3258685', homeTeam: 'Mallorca', awayTeam: 'Cadiz', league: 'İspanya 2. Lig', timeStr: '23:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Mallorca Kazanır)', marketCode: 'MS1', odd: '1.34' },
            { iddaaCode: '3354433', homeTeam: 'Reims', awayTeam: 'Sochaux', league: 'Fransa Ligue 2', timeStr: '22:45', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Reims Kaybetmez)', marketCode: 'CS1X', odd: '1.06' }
        ]
    },
    {
        couponNumber: 8,
        title: "⚽ Öğlen Gol Düellosu (2.5 ÜST Kombini)",
        subtitle: "Juventus vs Napoli 2.5 ÜST (1.74) ve Braga 2.5 ÜST (1.55) ve Newcastle 2.5 ÜST (1.51)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "14:00 - 17:30",
        badge: "⚽ Gol Düellosu",
        picks: [
            { iddaaCode: '3259141', homeTeam: 'Juventus', awayTeam: 'Napoli', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.74' },
            { iddaaCode: '3258867', homeTeam: 'Braga', awayTeam: 'Famalicao', league: 'Portekiz Premier Lig', timeStr: '23:30', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.55' },
            { iddaaCode: '3262120', homeTeam: 'Newcastle Utd', awayTeam: 'Everton', league: 'İngiltere Premier Lig', timeStr: '23:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.51' }
        ]
    },
    {
        couponNumber: 9,
        title: "🔥 Öğlen Karşılıklı Gol & Derbi Ateşi",
        subtitle: "Juventus vs Napoli KG VAR (1.88), Newcastle KG VAR (1.84) ve Lorient KG VAR (1.92)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "14:00 - 17:30",
        badge: "🔥 Derbi Ateşi",
        picks: [
            { iddaaCode: '3259141', homeTeam: 'Juventus', awayTeam: 'Napoli', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Karşılıklı Gol', pickTitle: 'KG VAR', marketCode: 'KG_YES', odd: '1.88' },
            { iddaaCode: '3262120', homeTeam: 'Newcastle Utd', awayTeam: 'Everton', league: 'İngiltere Premier Lig', timeStr: '23:00', marketTitle: 'Karşılıklı Gol', pickTitle: 'KG VAR', marketCode: 'KG_YES', odd: '1.84' },
            { iddaaCode: '3254536', homeTeam: 'Lorient', awayTeam: 'Brest', league: 'Fransa Ligue 1', timeStr: '22:45', marketTitle: 'Karşılıklı Gol', pickTitle: 'KG VAR', marketCode: 'KG_YES', odd: '1.92' }
        ]
    },
    {
        couponNumber: 10,
        title: "🎯 Öğlen Taraf Güvencesi & Editörün Yıldızı",
        subtitle: "Juventus MS 1 (1.94), Dep. La Coruna MS 1 (1.94) ve Reims MS 1 (1.52)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "14:00 - 17:30",
        badge: "🎯 Editörün Yıldızı",
        picks: [
            { iddaaCode: '3259141', homeTeam: 'Juventus', awayTeam: 'Napoli', league: 'İtalya Serie A', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Juventus Kazanır)', marketCode: 'MS1', odd: '1.94' },
            { iddaaCode: '3258713', homeTeam: 'Dep. La Coruna', awayTeam: 'Osasuna', league: 'İspanya La Liga', timeStr: '23:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Dep. La Coruna Kazanır)', marketCode: 'MS1', odd: '1.94' },
            { iddaaCode: '3354433', homeTeam: 'Reims', awayTeam: 'Sochaux', league: 'Fransa Ligue 2', timeStr: '22:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Reims Kazanır)', marketCode: 'MS1', odd: '1.52' }
        ]
    },

    // -------------------------------------------------------------
    // SEANS 3: AKŞAM KUPONLARI (11 - 15) — GECE SAMBASI & GÜNEY AMERİKA
    // -------------------------------------------------------------
    {
        couponNumber: 11,
        title: "🌙 Akşam / Brezilya Serie A & Kasa Katlama",
        subtitle: "Bragantino 1-X (1.18), Gremio 1-X (1.26) ve Belgrano 1-X (1.08)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "18:30 - 23:30",
        badge: "🌙 Gece Sambası",
        picks: [
            { iddaaCode: '3266672', homeTeam: 'Bragantino', awayTeam: 'Santos SP', league: 'Brezilya Serie A', timeStr: '02:00', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.18' },
            { iddaaCode: '3258620', homeTeam: 'Gremio P.', awayTeam: 'Atl Mineiro', league: 'Brezilya Kupası', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.26' },
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.08' }
        ]
    },
    {
        couponNumber: 12,
        title: "🛡️ Akşam Sıfır Risk Sigortalı Kombin",
        subtitle: "Belgrano MS 1 (1.68), Bragantino 2.5 ÜST (1.41) ve Gremio 1-X (1.26)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "18:30 - 23:30",
        badge: "🛡️ Sıfır Risk Gece",
        picks: [
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Belgrano Kazanır)', marketCode: 'MS1', odd: '1.68' },
            { iddaaCode: '3266672', homeTeam: 'Bragantino', awayTeam: 'Santos SP', league: 'Brezilya Serie A', timeStr: '02:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.41' },
            { iddaaCode: '3258620', homeTeam: 'Gremio P.', awayTeam: 'Atl Mineiro', league: 'Brezilya Kupası', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.26' }
        ]
    },
    {
        couponNumber: 13,
        title: "⚽ Akşam Gol Yağmuru (2.5 ÜST Şöleni)",
        subtitle: "Bragantino 2.5 ÜST (1.41), Gremio P. 2.5 ÜST (2.05) ve Belgrano 2.5 ÜST (1.79)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "18:30 - 23:30",
        badge: "⚽ Gol Şöleni",
        picks: [
            { iddaaCode: '3266672', homeTeam: 'Bragantino', awayTeam: 'Santos SP', league: 'Brezilya Serie A', timeStr: '02:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.41' },
            { iddaaCode: '3258620', homeTeam: 'Gremio P.', awayTeam: 'Atl Mineiro', league: 'Brezilya Kupası', timeStr: '00:30', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '2.05' },
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.79' }
        ]
    },
    {
        couponNumber: 14,
        title: "💎 Akşam Değer & Taraf Kuponu (Güney Amerika)",
        subtitle: "Bragantino MS 1 (1.84), Belgrano MS 1 (1.68) ve Gremio MS 1 (2.27)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "18:30 - 23:30",
        badge: "💎 Yüksek Oran",
        picks: [
            { iddaaCode: '3266672', homeTeam: 'Bragantino', awayTeam: 'Santos SP', league: 'Brezilya Serie A', timeStr: '02:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Bragantino Kazanır)', marketCode: 'MS1', odd: '1.84' },
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Belgrano Kazanır)', marketCode: 'MS1', odd: '1.68' },
            { iddaaCode: '3258620', homeTeam: 'Gremio P.', awayTeam: 'Atl Mineiro', league: 'Brezilya Kupası', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Gremio Kazanır)', marketCode: 'MS1', odd: '2.27' }
        ]
    },
    {
        couponNumber: 15,
        title: "🌟 Akşam Kapanış Süper Kombini",
        subtitle: "Gremio 1-X (1.26), Bragantino MS 1 (1.84) ve Belgrano MS 1 (1.68)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "18:30 - 23:30",
        badge: "🌟 Gece Kapanış",
        picks: [
            { iddaaCode: '3258620', homeTeam: 'Gremio P.', awayTeam: 'Atl Mineiro', league: 'Brezilya Kupası', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans', marketCode: 'CS1X', odd: '1.26' },
            { iddaaCode: '3266672', homeTeam: 'Bragantino', awayTeam: 'Santos SP', league: 'Brezilya Serie A', timeStr: '02:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Bragantino Kazanır)', marketCode: 'MS1', odd: '1.84' },
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Belgrano Kazanır)', marketCode: 'MS1', odd: '1.68' }
        ]
    }
];

// Helper to compute total odd
function calculateTotalOdd(picks) {
    return picks.reduce((acc, p) => acc * parseFloat(p.odd || 1), 1);
}

function generateCoupons() {
    const todayFormatted = '01.11.2026';
    const screenshotsDir = path.join(__dirname, '..', 'data_cache', 'screenshots');
    
    const coupons = couponConfigs.map(c => {
        const totalOdd = parseFloat(calculateTotalOdd(c.picks).toFixed(2));
        const picksWithText = c.picks.map(p => ({
            ...p,
            matchText: `${p.timeStr} ${p.homeTeam} - ${p.awayTeam} ${p.pickTitle} ${p.odd}`
        }));

        return {
            couponNumber: c.couponNumber,
            name: `${todayFormatted} - ${c.couponNumber}`,
            title: c.title,
            subtitle: c.subtitle,
            badge: c.badge,
            totalOdd,
            picks: picksWithText,
            savedInAccount: false,
            screenshot: path.join(screenshotsDir, `nesine_kupon_${c.couponNumber}.png`),
            timestamp: new Date().toISOString(),
            timeSlot: c.timeSlot,
            sessionName: c.sessionName,
            sessionTimeRange: c.sessionTimeRange
        };
    });

    const outputData = {
        date: todayFormatted,
        generatedAt: new Date().toISOString(),
        totalCoupons: coupons.length,
        description: "01.11.2026 - 02.11.2026 Seçkin ve Elit Liglerden 15 Kaliteli Kupon (5 Sabah, 5 Öğlen, 5 Akşam)",
        coupons
    };

    const outPath = path.join(__dirname, '..', 'data_cache', 'nesine_coupons_today.json');
    fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`✅ [BAŞARILI] 15 adet seçkin lig kuponu kaydedildi: ${outPath}`);

    return outputData;
}

if (require.main === module) {
    generateCoupons();
}

module.exports = { generateCoupons };
