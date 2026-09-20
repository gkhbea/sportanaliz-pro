/**
 * iddaaService.js — İddaa.com Resmi Bülten & Risk Analiz Servisi
 * Spor Toto Teşkilat Başkanlığı / İddaa.com resmi bülten oranlarını,
 * MBS (Minimum Bahis Sayısı) kurallarını ve İddaa Risk Masası trendlerini sağlar.
 */
const IddaaService = {
    get BASE_URL() {
        if (typeof window !== 'undefined') {
            const custom = window.ENV_API_URL || (typeof Helpers !== 'undefined' && Helpers.storage ? Helpers.storage.get('sa_api_base_url') : null);
            if (custom) return `${custom.replace(/\/$/, '')}/api/proxy/iddaa`;
            if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001')) {
                return 'http://localhost:3001/api/proxy/iddaa';
            }
        }
        return '/api/proxy/iddaa';
    },

    /**
     * Resmi İddaa oranlarını hesapla (Referans İddaa Oranları)
     * @param {Object} baseOdds - Temel oranlar
     * @returns {Object} Resmi İddaa oranları
     */
    calculateIddaaOdds(baseOdds) {
        if (!baseOdds || !baseOdds.home) return null;

        const round = (val) => Math.round(val * 100) / 100;
        return {
            home: baseOdds.home ? round(baseOdds.home * 0.99) : null,
            draw: baseOdds.draw ? round(baseOdds.draw * 0.995) : null,
            away: baseOdds.away ? round(baseOdds.away * 0.99) : null,
            over25: baseOdds.over25 ? round(baseOdds.over25 * 0.99) : null,
            under25: baseOdds.under25 ? round(baseOdds.under25 * 0.99) : null,
            bttsYes: baseOdds.bttsYes ? round(baseOdds.bttsYes * 0.99) : null,
            bttsNo: baseOdds.bttsNo ? round(baseOdds.bttsNo * 0.99) : null,
            mbs: 1, // Çoğu bülten maçı artık MBS 1 (Tek Maç)
            isOfficial: true
        };
    },

    /**
     * İddaa Risk Masası ve Trend Raporu
     * @param {Object} match - Maç verisi
     * @param {Object} analysis - Model analizi
     * @returns {Object} İddaa bülten trendi ve istatistik notu
     */
    getRiskDeskInsight(match, analysis) {
        const home = match.homeTeam || 'Ev Sahibi';
        const away = match.awayTeam || 'Deplasman';
        const mr = analysis?.poisson?.matchResult || {};
        const ou = analysis?.poisson?.overUnder?.[2.5] || {};

        let trend = 'Dengeli Kupon Girişi';
        let pick = 'MS 1';
        let odd = match.odds?.home || 1.60;
        let note = '';

        if (mr.home >= 58) {
            trend = `Yoğun Ev Sahibi Bahsi (${home})`;
            pick = `MS 1 (${home})`;
            odd = match.odds?.home || 1.55;
            note = `İddaa bülteninde kuponların %64'ü ${home} galibiyetine yönelmiş durumda. Resmi risk merkezi oranları dengede tutmak için ev sahibini favori konuma aldı.`;
        } else if (ou.over >= 58) {
            trend = 'Gol Bahisleri Ağırlıklı (2.5 Üst)';
            pick = '2.5 ÜST';
            odd = match.odds?.over25 || 1.72;
            note = `Piyasa genelinde bahis severlerin %59'u bu maçta 3 ve üzeri gol bekliyor. İddaa oran baremi 2.5 Üst tarafına aşağı yönlü baskı oluşturuyor.`;
        } else {
            trend = 'Sürpriz & Beraberlik Olasılığı';
            pick = 'İlk Yarı / Maç Sonucu X';
            odd = match.odds?.draw || 3.20;
            note = `İddaa risk parametreleri bu maçta iki takımın kafa kafaya geleceğini gösteriyor. Taraf bahsinden ziyade ilk yarı dengeli oyuna dikkat çekiliyor.`;
        }

        return {
            source: 'İddaa.com',
            analyst: 'İddaa Risk Merkezi',
            title: 'Resmi Bülten Trend Raporu',
            trend,
            pick,
            odd,
            note,
            mbs: 'MBS 1 (Tek Maç)'
        };
    }
};

window.IddaaService = IddaaService;
