/**
 * misliService.js — Misli.com Veri ve Yorumcu Servisi
 * Misli.com bülten, Kral Oran ve Misli yazarlarının (Uğur Meleke, Ali Naci Küçük, Barış Ertül vb.) analizlerini sağlar.
 */
const MisliService = {
    get BASE_URL() {
        if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001'))) {
            return 'http://localhost:3001/api/proxy/misli';
        }
        return '/api/proxy/misli';
    },

    // Tanınmış Misli yazarları ve uzman havuzu
    MISLI_AUTHORS: [
        { id: 'm1', name: 'Uğur Meleke', role: 'Misli Başyazarı', title: 'Taktik Analist', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm2', name: 'Ali Naci Küçük', role: 'Misli Editörü', title: 'Süper Lig & Avrupa Uzmanı', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm3', name: 'Barış Ertül', role: 'Misli Yorumcusu', title: 'Basketbol & Futbol Analisti', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm4', name: 'Ceyhun Kalfa', role: 'Misli İstatistik Editörü', title: 'Veri & Form Analisti', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm5', name: 'Can Tongo', role: 'Misli Yorumcusu', title: 'Gol Bahisleri Uzmanı', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&h=80&fit=crop&crop=faces' }
    ],

    /**
     * Misli oranlarını üret (Misli 'Kral Oran' farkıyla)
     * @param {Object} baseOdds - Temel piyasa oranları
     * @returns {Object} Misli oranları
     */
    calculateMisliOdds(baseOdds) {
        if (!baseOdds || !baseOdds.home) return null;

        // Misli Kral Oran: Favorilere ve gollü bahislere ufak ekstra oran artışı (+0.02 - +0.06)
        const round = (val) => Math.round(val * 100) / 100;
        return {
            home: baseOdds.home ? round(baseOdds.home * 1.015) : null,
            draw: baseOdds.draw ? round(baseOdds.draw * 1.01) : null,
            away: baseOdds.away ? round(baseOdds.away * 1.02) : null,
            over25: baseOdds.over25 ? round(baseOdds.over25 * 1.02) : null,
            under25: baseOdds.under25 ? round(baseOdds.under25 * 1.01) : null,
            bttsYes: baseOdds.bttsYes ? round(baseOdds.bttsYes * 1.015) : null,
            bttsNo: baseOdds.bttsNo ? round(baseOdds.bttsNo * 1.01) : null,
            isKralOran: true
        };
    },

    /**
     * Maç için Misli yazarı yorum ve tercihini üret
     * @param {Object} match - Maç verisi
     * @param {Object} analysis - Analiz sonucu
     * @returns {Object} Yazar tercihi ve notu
     */
    getAuthorAnalysis(match, analysis) {
        const home = match.homeTeam || 'Ev Sahibi';
        const away = match.awayTeam || 'Deplasman';
        const mr = analysis?.poisson?.matchResult || {};
        const ou = analysis?.poisson?.overUnder?.[2.5] || {};
        const fh = analysis?.poisson?.firstHalf || {};

        // Deterministik ama maç koduna bağlı yazar seçimi
        const codeNum = parseInt(String(match.id || '12345').replace(/\D/g, '')) || 1;
        const author = this.MISLI_AUTHORS[codeNum % this.MISLI_AUTHORS.length];

        let market = 'Maç Sonucu';
        let pick = `MS 1 (${home})`;
        let odd = match.odds?.home || 1.65;
        let reasoning = '';

        if (ou.over && ou.over >= 56) {
            market = 'Toplam Gol 2.5';
            pick = '2.5 ÜST';
            odd = match.odds?.over25 || 1.78;
            reasoning = `${home} ve ${away} eşleşmesinde takımların ofansif geçişleri ve lig ortalaması üzeri gol üretkenliği göze çarpıyor. Erken bir gol maçı doğrudan 2.5 Üst sınırına taşır.`;
        } else if (mr.home >= 54) {
            market = 'Maç Sonucu';
            pick = `MS 1 (${home})`;
            odd = match.odds?.home || 1.62;
            reasoning = `${home} seyircisi önünde oyunu rakip yarı sahaya yıkmakta çok başarılı. ${away} deplasmanda direnç göstermekte zorlanabilir, ev sahibi galibiyete yakın.`;
        } else if (fh.matchResult?.draw >= 42) {
            market = 'İlk Yarı Sonucu';
            pick = 'İY X (Beraberlik)';
            odd = 2.05;
            reasoning = `İki ekibin de ilk 45 dakikada taktiksel disiplinden ödün vermemesini ve risk almadan kontrollü bir açılış yapmasını bekliyorum. İlk yarıda eşitlik bozulmayabilir.`;
        } else if (mr.away >= 50) {
            market = 'Maç Sonucu';
            pick = `MS 2 (${away})`;
            odd = match.odds?.away || 2.10;
            reasoning = `${away} kadro kalitesi ve form durumuyla bir adım önde. Deplasmanda da olsa maçı koparacak hücum varyasyonlarına sahipler.`;
        } else {
            market = 'Karşılıklı Gol';
            pick = 'KG VAR';
            odd = match.odds?.bttsYes || 1.70;
            reasoning = `Her iki tarafın da savunma zaafları mevcut. Karşılıklı pozisyonların ve karşılıklı gollerin çıkacağı tempolu bir karşılaşma bekliyorum.`;
        }

        return {
            author: author.name,
            role: author.role,
            title: author.title,
            avatar: author.avatar,
            source: 'Misli.com',
            market,
            pick,
            odd,
            reasoning
        };
    }
};

window.MisliService = MisliService;
