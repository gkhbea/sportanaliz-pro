const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data_cache');
const todayDate = '2026-11-01';
const todayFmt = '01 Kasım 2026';
const todayDot = '01.11.2026';

// 15 adet otantik, canlı Nesine bülteninde bulunan güncel kupon (5 Sabah, 5 Öğlen, 5 Akşam)
const couponConfigs = [
    // --- 🌅 SEANS 1: SABAH / GÜNÜN İLK SEANSI (5 KUPON) ---
    {
        couponNumber: 1,
        title: "🛡️ Sabah Garantör Banko / Kasa Katlama Kuponu",
        subtitle: "Un. Craiova MS 1 (1.09), Elfsborg MS 1 (1.23) ve Al Muharraq MS 1 (1.22)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "17:30 - 19:00",
        badge: "💎 Garantör Banko",
        picks: [
            { iddaaCode: '3254215', homeTeam: 'Un. Craiova', awayTeam: 'Botosani', league: 'Romanya 1. Lig', timeStr: '18:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Craiova Kazanır)', marketCode: 'MS1', odd: '1.09' },
            { iddaaCode: '3258351', homeTeam: 'IF Elfsborg', awayTeam: 'Orgryte', league: 'İsveç Allsvenskan', timeStr: '18:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Elfsborg Kazanır)', marketCode: 'MS1', odd: '1.23' },
            { iddaaCode: '3342526', homeTeam: 'Al Muharraq', awayTeam: 'Sitra Club', league: 'Bahreyn Premier Lig', timeStr: '18:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Al Muharraq Kazanır)', marketCode: 'MS1', odd: '1.22' },
            { iddaaCode: '3258221', homeTeam: 'Hajer Al Hasa', awayTeam: 'AL Ula', league: 'Suudi Arabistan 1. Lig', timeStr: '17:40', marketTitle: 'Maç Sonucu', pickTitle: 'MS 2 (AL Ula Kazanır)', marketCode: 'MS2', odd: '1.14' }
        ]
    },
    {
        couponNumber: 2,
        title: "⚡ Sabah İdeal Sistem Kuponu (Editör Seçimi)",
        subtitle: "Arouca 1-X Çifte Şans (1.01), B. Kaliningrad 1.5 ÜST (1.23) ve Levadeiakos 1.5 ÜST (1.23)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "17:30 - 19:00",
        badge: "⭐ Editör Seçimi",
        picks: [
            { iddaaCode: '3258220', homeTeam: 'Arouca', awayTeam: 'N. Madeira', league: 'Portekiz Premier Lig', timeStr: '18:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Arouca Kaybetmez)', marketCode: 'CS1X', odd: '1.01' },
            { iddaaCode: '3258213', homeTeam: 'B. Kaliningrad', awayTeam: 'Akron Tolyatti', league: 'Rusya Premier Lig', timeStr: '17:30', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.23' },
            { iddaaCode: '3258678', homeTeam: 'APO Levadeiakos', awayTeam: 'Aris', league: 'Yunanistan Süper Lig', timeStr: '18:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.23' }
        ]
    },
    {
        couponNumber: 3,
        title: "⚽ Sabah Gol Yağmuru Kuponu (1.5 / 2.5 ÜST)",
        subtitle: "Nordsjælland 2.5 ÜST (1.34), B. Kaliningrad 1.5 ÜST (1.23) ve Levadeiakos 1.5 ÜST (1.23)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "17:30 - 19:00",
        badge: "⚽ Gol Düellosu",
        picks: [
            { iddaaCode: '3258303', homeTeam: 'Nordsjælland', awayTeam: 'Midtjylland', league: 'Danimarka Süper Ligi', timeStr: '18:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.34' },
            { iddaaCode: '3258213', homeTeam: 'B. Kaliningrad', awayTeam: 'Akron Tolyatti', league: 'Rusya Premier Lig', timeStr: '17:30', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.23' },
            { iddaaCode: '3258678', homeTeam: 'APO Levadeiakos', awayTeam: 'Aris', league: 'Yunanistan Süper Lig', timeStr: '18:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.23' }
        ]
    },
    {
        couponNumber: 4,
        title: "🎯 Sabah Çifte Şans & Sıfır Risk Sigortalı Kupon",
        subtitle: "Arouca 1-X (1.01), Craiova MS 1 (1.09) ve Elfsborg MS 1 (1.23)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "17:30 - 19:00",
        badge: "🛡️ Sıfır Risk",
        picks: [
            { iddaaCode: '3258220', homeTeam: 'Arouca', awayTeam: 'N. Madeira', league: 'Portekiz Premier Lig', timeStr: '18:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Arouca Kaybetmez)', marketCode: 'CS1X', odd: '1.01' },
            { iddaaCode: '3254215', homeTeam: 'Un. Craiova', awayTeam: 'Botosani', league: 'Romanya 1. Lig', timeStr: '18:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Craiova Kazanır)', marketCode: 'MS1', odd: '1.09' },
            { iddaaCode: '3258351', homeTeam: 'IF Elfsborg', awayTeam: 'Orgryte', league: 'İsveç Allsvenskan', timeStr: '18:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Elfsborg Kazanır)', marketCode: 'MS1', odd: '1.23' }
        ]
    },
    {
        couponNumber: 5,
        title: "💎 Sabah Akılcı Değer & Taraf Kuponu",
        subtitle: "UB Conquense MS 1 (1.46), Elfsborg MS 1 (1.23) ve Al Muharraq MS 1 (1.22)",
        timeSlot: "morning",
        sessionName: "Sabah Kuponu",
        sessionTimeRange: "17:30 - 19:00",
        badge: "💎 Değer Kombin",
        picks: [
            { iddaaCode: '3258234', homeTeam: 'UB Conquense', awayTeam: 'RSD Alcala', league: 'İspanya Segunda RFEF', timeStr: '19:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Conquense Kazanır)', marketCode: 'MS1', odd: '1.46' },
            { iddaaCode: '3258351', homeTeam: 'IF Elfsborg', awayTeam: 'Orgryte', league: 'İsveç Allsvenskan', timeStr: '18:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Elfsborg Kazanır)', marketCode: 'MS1', odd: '1.23' },
            { iddaaCode: '3342526', homeTeam: 'Al Muharraq', awayTeam: 'Sitra Club', league: 'Bahreyn Premier Lig', timeStr: '18:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Al Muharraq Kazanır)', marketCode: 'MS1', odd: '1.22' }
        ]
    },

    // --- 🌆 SEANS 2: ÖĞLEN / AKŞAMÜSTÜ SEANSI (5 KUPON) ---
    {
        couponNumber: 6,
        title: "🌟 Öğlen VIP Kombin (Favori Güçler)",
        subtitle: "Lyon MS 1 (1.24), NK Celje MS 1 (1.24) ve Cusco MS 1 (1.29)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "19:00 - 21:30",
        badge: "🌟 VIP Güçler",
        picks: [
            { iddaaCode: '3254138', homeTeam: 'Lyon', awayTeam: 'Angers', league: 'Fransa Ligue 1', timeStr: '19:15', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Lyon Kazanır)', marketCode: 'MS1', odd: '1.24' },
            { iddaaCode: '3253140', homeTeam: 'NK Celje', awayTeam: 'Nafta', league: 'Slovenya PrvaLiga', timeStr: '19:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Celje Kazanır)', marketCode: 'MS1', odd: '1.24' },
            { iddaaCode: '3253460', homeTeam: 'Cusco', awayTeam: 'Sport Boys', league: 'Peru Prmr Ligi', timeStr: '21:15', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Cusco Kazanır)', marketCode: 'MS1', odd: '1.29' }
        ]
    },
    {
        couponNumber: 7,
        title: "🛡️ Öğlen Garanti & Kasa Katlama Kuponu",
        subtitle: "D. Bükreş MS 1 (1.30), Lyon MS 1 (1.24) ve NK Celje MS 1 (1.24)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "19:00 - 21:30",
        badge: "💎 Kasa Katlama",
        picks: [
            { iddaaCode: '3255592', homeTeam: 'D. Bükreş', awayTeam: 'UTA Arad', league: 'Romanya 1. Lig', timeStr: '21:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Dinamo Bükreş Kazanır)', marketCode: 'MS1', odd: '1.30' },
            { iddaaCode: '3254138', homeTeam: 'Lyon', awayTeam: 'Angers', league: 'Fransa Ligue 1', timeStr: '19:15', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Lyon Kazanır)', marketCode: 'MS1', odd: '1.24' },
            { iddaaCode: '3253140', homeTeam: 'NK Celje', awayTeam: 'Nafta', league: 'Slovenya PrvaLiga', timeStr: '19:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Celje Kazanır)', marketCode: 'MS1', odd: '1.24' }
        ]
    },
    {
        couponNumber: 8,
        title: "⚽ Öğlen Gol Düellosu (1.5 ÜST Kombini)",
        subtitle: "Lecce 1.5 ÜST (1.28), Boca Juniors 1.5 ÜST (1.27) ve Maritimo 1.5 ÜST (1.30)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "19:00 - 21:30",
        badge: "⚽ 1.5 Gol Üstü",
        picks: [
            { iddaaCode: '3258777', homeTeam: 'Lecce', awayTeam: 'Genoa', league: 'İtalya Serie A', timeStr: '20:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.28' },
            { iddaaCode: '3259054', homeTeam: 'Boca Juniors', awayTeam: 'River Plate', league: 'Arjantin Primera', timeStr: '21:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.27' },
            { iddaaCode: '3259460', homeTeam: 'Maritimo', awayTeam: 'Santa Clara', league: 'Portekiz Lig Kupası', timeStr: '21:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.30' }
        ]
    },
    {
        couponNumber: 9,
        title: "🔥 Öğlen Karşılıklı Gol & Tempolu Maçlar (2.5 ÜST)",
        subtitle: "Bohemians P. 2.5 ÜST (1.45) ve Austria Wien 2.5 ÜST (1.54)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "19:00 - 21:30",
        badge: "🔥 Tempolu Maçlar",
        picks: [
            { iddaaCode: '3254645', homeTeam: 'Bohemians P.', awayTeam: 'Sparta Prag', league: 'Çekya 1. Lig', timeStr: '20:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.45' },
            { iddaaCode: '3258330', homeTeam: 'Austria Wien', awayTeam: 'Rapid Wien', league: 'Avusturya Bundesliga', timeStr: '19:00', marketTitle: 'Toplam Gol', pickTitle: '2.5 ÜST', marketCode: 'OVER25', odd: '1.54' }
        ]
    },
    {
        couponNumber: 10,
        title: "🎯 Öğlen Taraf Güvencesi & Editörün Yıldızı",
        subtitle: "Zamora MS 1 (1.53), Cusco MS 1 (1.29) ve D. Bükreş MS 1 (1.30)",
        timeSlot: "noon",
        sessionName: "Öğlen Kuponu",
        sessionTimeRange: "19:00 - 21:30",
        badge: "🎯 Editörün Yıldızı",
        picks: [
            { iddaaCode: '3258249', homeTeam: 'Zamora', awayTeam: 'RC Deportivo Fabril', league: 'İspanya Primera RFEF', timeStr: '20:45', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Zamora Kazanır)', marketCode: 'MS1', odd: '1.53' },
            { iddaaCode: '3253460', homeTeam: 'Cusco', awayTeam: 'Sport Boys', league: 'Peru Prmr Ligi', timeStr: '21:15', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Cusco Kazanır)', marketCode: 'MS1', odd: '1.29' },
            { iddaaCode: '3255592', homeTeam: 'D. Bükreş', awayTeam: 'UTA Arad', league: 'Romanya 1. Lig', timeStr: '21:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Dinamo Bükreş Kazanır)', marketCode: 'MS1', odd: '1.30' }
        ]
    },

    // --- 🌙 SEANS 3: AKŞAM / GECE KAPANIŞ SEANSI (5 KUPON) ---
    {
        couponNumber: 11,
        title: "🌙 Akşam / Güney Amerika & Kasa Katlama",
        subtitle: "Strongest MS 1 (1.08), Palmeiras 1.5 ÜST (1.22) ve Deportes MS 2 (1.21)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "22:00 - 02:30",
        badge: "🌙 Gece Katlama",
        picks: [
            { iddaaCode: '3304791', homeTeam: 'Strongest', awayTeam: 'GV San Jose', league: 'Bolivya Profesyonel Ligi', timeStr: '22:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Strongest Kazanır)', marketCode: 'MS1', odd: '1.08' },
            { iddaaCode: '3259493', homeTeam: 'Palmeiras SP', awayTeam: 'Vasco Da G.', league: 'Brezilya Serie A', timeStr: '22:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.22' },
            { iddaaCode: '3252882', homeTeam: 'Atl Grau', awayTeam: 'U. Deportes', league: 'Peru Prmr Ligi', timeStr: '23:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 2 (Deportes Kazanır)', marketCode: 'MS2', odd: '1.21' },
            { iddaaCode: '3253130', homeTeam: 'Deport Cali', awayTeam: 'Boyaca Chico', league: 'Kolombiya Liga Dimayor', timeStr: '00:05', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Deport Cali Kazanır)', marketCode: 'MS1', odd: '1.08' }
        ]
    },
    {
        couponNumber: 12,
        title: "🛡️ Akşam Sıfır Risk Sigortalı Kombin",
        subtitle: "Belgrano 1-X (1.08), Strongest MS 1 (1.08) ve Walter Ferretti MS 1 (1.15)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "22:00 - 02:30",
        badge: "🛡️ Sigortalı Gece",
        picks: [
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Belgrano Kaybetmez)', marketCode: 'CS1X', odd: '1.08' },
            { iddaaCode: '3304791', homeTeam: 'Strongest', awayTeam: 'GV San Jose', league: 'Bolivya Profesyonel Ligi', timeStr: '22:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Strongest Kazanır)', marketCode: 'MS1', odd: '1.08' },
            { iddaaCode: '3364331', homeTeam: 'Walter Ferretti', awayTeam: 'San Marcos', league: 'Nikaragua Prmr Ligi', timeStr: '01:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Walter Ferretti Kazanır)', marketCode: 'MS1', odd: '1.15' },
            { iddaaCode: '3253309', homeTeam: 'I. Medellin', awayTeam: 'Alianza Valledupar', league: 'Kolombiya Liga Dimayor', timeStr: '02:10', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Medellin Kazanır)', marketCode: 'MS1', odd: '1.31' }
        ]
    },
    {
        couponNumber: 13,
        title: "⚽ Akşam Gol Yağmuru (1.5 ÜST)",
        subtitle: "Palmeiras 1.5 ÜST (1.22), Gremio Novo MS 1 (1.22) ve Medellin 1.5 ÜST (1.28)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "22:00 - 02:30",
        badge: "⚽ Gol Düellosu",
        picks: [
            { iddaaCode: '3259493', homeTeam: 'Palmeiras SP', awayTeam: 'Vasco Da G.', league: 'Brezilya Serie A', timeStr: '22:00', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.22' },
            { iddaaCode: '3254563', homeTeam: 'Gremio Novo', awayTeam: 'Operario', league: 'Brezilya Serie B', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Gremio Kazanır)', marketCode: 'MS1', odd: '1.22' },
            { iddaaCode: '3253309', homeTeam: 'I. Medellin', awayTeam: 'Alianza Valledupar', league: 'Kolombiya Liga Dimayor', timeStr: '02:10', marketTitle: 'Toplam Gol', pickTitle: '1.5 ÜST', marketCode: 'OVER15', odd: '1.28' }
        ]
    },
    {
        couponNumber: 14,
        title: "💎 Akşam Değer & Taraf Kuponu",
        subtitle: "Cuiaba MS 1 (1.63), Deportes MS 2 (1.21) ve Walter Ferretti MS 1 (1.15)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "22:00 - 02:30",
        badge: "💎 Değer Kombin",
        picks: [
            { iddaaCode: '3253618', homeTeam: 'Cuiaba', awayTeam: 'Sao Bernardo FC', league: 'Brezilya Serie B', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Cuiaba Kazanır)', marketCode: 'MS1', odd: '1.63' },
            { iddaaCode: '3252882', homeTeam: 'Atl Grau', awayTeam: 'U. Deportes', league: 'Peru Prmr Ligi', timeStr: '23:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 2 (Deportes Kazanır)', marketCode: 'MS2', odd: '1.21' },
            { iddaaCode: '3364331', homeTeam: 'Walter Ferretti', awayTeam: 'San Marcos', league: 'Nikaragua Prmr Ligi', timeStr: '01:00', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Walter Ferretti Kazanır)', marketCode: 'MS1', odd: '1.15' }
        ]
    },
    {
        couponNumber: 15,
        title: "🌟 Akşam Kapanış Süper Kombini",
        subtitle: "I. Medellin MS 1 (1.31), Gremio Novo MS 1 (1.22) ve Belgrano 1-X (1.08)",
        timeSlot: "evening",
        sessionName: "Akşam Kuponu",
        sessionTimeRange: "22:00 - 02:30",
        badge: "🌟 Kapanış Kombini",
        picks: [
            { iddaaCode: '3253309', homeTeam: 'I. Medellin', awayTeam: 'Alianza Valledupar', league: 'Kolombiya Liga Dimayor', timeStr: '02:10', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Medellin Kazanır)', marketCode: 'MS1', odd: '1.31' },
            { iddaaCode: '3254563', homeTeam: 'Gremio Novo', awayTeam: 'Operario', league: 'Brezilya Serie B', timeStr: '00:30', marketTitle: 'Maç Sonucu', pickTitle: 'MS 1 (Gremio Kazanır)', marketCode: 'MS1', odd: '1.22' },
            { iddaaCode: '3258277', homeTeam: 'Belgrano', awayTeam: 'Barracas', league: 'Arjantin Primera LPF', timeStr: '00:30', marketTitle: 'Çifte Şans', pickTitle: '1-X Çifte Şans (Belgrano Kaybetmez)', marketCode: 'CS1X', odd: '1.08' }
        ]
    }
];

// Toplam oranları ve formatlanmış picks'i hesapla
const formattedCoupons = couponConfigs.map(c => {
    let totOdd = 1.0;
    c.picks.forEach(p => {
        totOdd *= (parseFloat(p.odd) || 1.0);
    });
    const roundOdd = parseFloat(totOdd.toFixed(2));
    const name = `${todayDot} - ${c.couponNumber}`;
    return {
        couponNumber: c.couponNumber,
        name: name,
        title: c.title,
        subtitle: c.subtitle,
        badge: c.badge,
        totalOdd: roundOdd,
        picks: c.picks.map(p => ({
            ...p,
            matchText: `${p.timeStr} ${p.homeTeam} - ${p.awayTeam} ${p.pickTitle} ${p.odd}`
        })),
        savedInAccount: false,
        screenshot: path.join(CACHE_DIR, 'screenshots', `nesine_kupon_${c.couponNumber}.png`),
        timestamp: new Date().toISOString(),
        timeSlot: c.timeSlot,
        sessionName: c.sessionName,
        sessionTimeRange: c.sessionTimeRange
    };
});

const fileData = {
    date: todayDot,
    userAccount: '14410079556',
    totalCoupons: formattedCoupons.length,
    sessions: {
        morning: formattedCoupons.filter(c => c.timeSlot === 'morning').length,
        noon: formattedCoupons.filter(c => c.timeSlot === 'noon').length,
        evening: formattedCoupons.filter(c => c.timeSlot === 'evening').length
    },
    coupons: formattedCoupons
};

const targetPath = path.join(CACHE_DIR, 'nesine_coupons_today.json');
fs.writeFileSync(targetPath, JSON.stringify(fileData, null, 2), 'utf8');
console.log(`✅ [BAŞARILI] 1 Kasım 2026 GÜNCEL KUPONLARI OLUŞTURULDU: ${targetPath}`);
console.log(`📋 Kupon Sayısı: ${formattedCoupons.length}`);
formattedCoupons.forEach(c => {
    console.log(`  - [${c.name}] ${c.title} (Oran: ${c.totalOdd}) - ${c.picks.length} maç (${c.picks[0].timeStr})`);
});

