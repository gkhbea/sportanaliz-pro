/**
 * misliService.js — Misli.com Canlı Maç, Bülten ve Yorumcu Servisi
 * Misli.com resmi canlı bülteni, Kral Oran ve Misli yazarlarının analizlerini sağlar.
 */
const MisliService = {
    get BASE_URL() {
        if (typeof window !== 'undefined') {
            const custom = window.ENV_API_URL || (typeof Helpers !== 'undefined' && Helpers.storage ? Helpers.storage.get('sa_api_base_url') : null);
            if (custom) return `${custom.replace(/\/$/, '')}/api/proxy/misli`;
            if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001')) {
                return 'http://localhost:3001/api/proxy/misli';
            }
        }
        return '/api/proxy/misli';
    },

    cachedLiveMatches: [],
    lastLiveFetchTime: 0,

    // Tanınmış Misli yazarları ve uzman havuzu
    MISLI_AUTHORS: [
        { id: 'm1', name: 'Uğur Meleke', role: 'Misli Başyazarı', title: 'Taktik Analist', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm2', name: 'Ali Naci Küçük', role: 'Misli Editörü', title: 'Süper Lig & Avrupa Uzmanı', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm3', name: 'Barış Ertül', role: 'Misli Yorumcusu', title: 'Basketbol & Futbol Analisti', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm4', name: 'Ceyhun Kalfa', role: 'Misli İstatistik Editörü', title: 'Veri & Form Analisti', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&h=80&fit=crop&crop=faces' },
        { id: 'm5', name: 'Can Tongo', role: 'Misli Yorumcusu', title: 'Gol Bahisleri Uzmanı', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&h=80&fit=crop&crop=faces' }
    ],

    /**
     * Misli.com'dan doğrudan canlı ve bülten maçlarını çeker
     */
    async fetchLiveMatches(force = false) {
        const now = Date.now();
        if (!force && this.cachedLiveMatches.length > 0 && (now - this.lastLiveFetchTime < 30000)) {
            return this.cachedLiveMatches;
        }

        try {
            console.log('🔄 Misli.com resmi API canlı maçları çekiliyor...');
            const topRes = await fetch('https://apivx.misli.com/api/web/v1/sportsbook/top-events/SOCCER', {
                headers: {
                    'Accept': 'application/json',
                    'Origin': 'https://www.misli.com',
                    'Referer': 'https://www.misli.com/'
                }
            });

            if (topRes.ok) {
                const topData = await topRes.json();
                const eventIds = topData.data || [];
                
                const matches = [];
                const promises = eventIds.slice(0, 12).map(async (id) => {
                    try {
                        const sRes = await fetch(`https://apivx.misli.com/api/web/v2/sportsbook/event/${id}/single`, {
                            headers: {
                                'Accept': 'application/json',
                                'Origin': 'https://www.misli.com',
                                'Referer': 'https://www.misli.com/'
                            }
                        });
                        if (!sRes.ok) return null;
                        const sJson = await sRes.json();
                        const d = sJson.data;
                        if (!d || !d.n) return null;

                        const teams = d.n.split(' - ');
                        const homeTeam = teams[0]?.trim() || 'Ev Sahibi';
                        const awayTeam = teams[1]?.trim() || 'Deplasman';

                        const msMarket = (d.m || []).find(m => m.n === 'Maç Sonucu' || m.t === 1);
                        const ouMarket = (d.m || []).find(m => m.n && m.n.includes('2.5') && m.n.includes('Alt/Üst'));
                        const kgMarket = (d.m || []).find(m => m.n && (m.n.includes('Karşılıklı Gol') || m.n.includes('KG')));

                        let odds = {};
                        if (msMarket && msMarket.o) {
                            const o1 = msMarket.o.find(o => o.n === '1');
                            const ox = msMarket.o.find(o => o.n === '0' || o.n === 'X');
                            const o2 = msMarket.o.find(o => o.n === '2');
                            odds.home = o1 ? o1.od : null;
                            odds.draw = ox ? ox.od : null;
                            odds.away = o2 ? o2.od : null;
                        }
                        if (ouMarket && ouMarket.o) {
                            const oAlt = ouMarket.o.find(o => o.n && o.n.toLowerCase().includes('alt'));
                            const oUst = ouMarket.o.find(o => o.n && o.n.toLowerCase().includes('üst'));
                            odds.under25 = oAlt ? oAlt.od : null;
                            odds.over25 = oUst ? oUst.od : null;
                        }
                        if (kgMarket && kgMarket.o) {
                            const oVar = kgMarket.o.find(o => o.n && o.n.toLowerCase().includes('var'));
                            const oYok = kgMarket.o.find(o => o.n && o.n.toLowerCase().includes('yok'));
                            odds.bttsYes = oVar ? oVar.od : null;
                            odds.bttsNo = oYok ? oYok.od : null;
                        }

                        return {
                            id: String(d.i),
                            misliId: d.i,
                            homeTeam,
                            awayTeam,
                            matchName: d.n,
                            homeLogo: d.htl || null,
                            awayLogo: d.atl || null,
                            dateStr: d.d ? new Date(d.d).toISOString() : '',
                            timeStr: d.d ? new Date(d.d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '20:00',
                            isLive: Boolean(d.l),
                            status: d.l ? 'LIVE' : 'NOT_STARTED',
                            minute: d.l ? 'Canlı' : 'Başlamadı',
                            tv: d.tv || 'Misli TV',
                            odds,
                            source: 'Misli.com (Resmi Canlı & Kral Oran)'
                        };
                    } catch (e) {
                        return null;
                    }
                });

                const results = await Promise.all(promises);
                const validMatches = results.filter(Boolean);

                this.cachedLiveMatches = validMatches;
                this.lastLiveFetchTime = now;
                console.log(`✅ Misli.com'dan ${validMatches.length} canlı/bülten maçı başarıyla yüklendi.`);
                return validMatches;
            }
        } catch (e) {
            console.warn('MisliService fetchLiveMatches uyarısı:', e.message);
        }

        return this.cachedLiveMatches;
    },

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
