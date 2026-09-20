/**
 * bilyonerService.js — Bilyoner.com Veri & Tribün Yorumcu Servisi
 * Bilyoner oranları, Tribün yazarları ve popüler kupon verilerini yönetir.
 */
const BilyonerService = {
    get BASE_URL() {
        if (typeof window !== 'undefined') {
            const custom = window.ENV_API_URL || (typeof Helpers !== 'undefined' && Helpers.storage ? Helpers.storage.get('sa_api_base_url') : null);
            if (custom) return `${custom.replace(/\/$/, '')}/api/proxy/bilyoner`;
            if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001')) {
                return 'http://localhost:3001/api/proxy/bilyoner';
            }
        }
        return '/api/proxy/bilyoner';
    },

    // Bilyoner Tribün yazarları
    BILYONER_AUTHORS: [
        { id: 'b1', name: 'Bülent Timurlenk', role: 'Bilyoner Yazarı', title: 'Avrupa Futbolu & Taktik', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=faces' },
        { id: 'b2', name: 'Altan Tanrıkulu', role: 'Bilyoner Uzmanı', title: 'Süper Lig Başdanışmanı', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=faces' },
        { id: 'b3', name: 'Murat Fevzi Tanırlı', role: 'Bilyoner Yorumcusu', title: 'Hakem & Maç Dinamiği', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=faces' },
        { id: 'b4', name: 'Eray Sözen', role: 'Bilyoner İstatistikçisi', title: 'Alt/Üst & Özel Etkinlikler', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&h=80&fit=crop&crop=faces' }
    ],

    /**
     * Bilyoner oranlarını üret
     * @param {Object} baseOdds - Temel oranlar
     * @returns {Object} Bilyoner oranları
     */
    calculateBilyonerOdds(baseOdds) {
        if (!baseOdds || !baseOdds.home) return null;

        const round = (val) => Math.round(val * 100) / 100;
        return {
            home: baseOdds.home ? round(baseOdds.home * 1.008) : null,
            draw: baseOdds.draw ? round(baseOdds.draw * 1.015) : null,
            away: baseOdds.away ? round(baseOdds.away * 1.008) : null,
            over25: baseOdds.over25 ? round(baseOdds.over25 * 1.012) : null,
            under25: baseOdds.under25 ? round(baseOdds.under25 * 1.008) : null,
            bttsYes: baseOdds.bttsYes ? round(baseOdds.bttsYes * 1.01) : null,
            bttsNo: baseOdds.bttsNo ? round(baseOdds.bttsNo * 1.008) : null
        };
    },

    /**
     * Bilyoner Tribün Yazar Görüşü
     */
    getTribunInsight(match, analysis) {
        const home = match.homeTeam || 'Ev Sahibi';
        const away = match.awayTeam || 'Deplasman';
        const mr = analysis?.poisson?.matchResult || {};
        const ou = analysis?.poisson?.overUnder?.[2.5] || {};

        const codeNum = parseInt(String(match.id || '98765').replace(/\D/g, '')) || 2;
        const author = this.BILYONER_AUTHORS[codeNum % this.BILYONER_AUTHORS.length];

        let market = 'Maç Sonucu';
        let pick = `MS 1 (${home})`;
        let odd = match.odds?.home || 1.62;
        let reasoning = '';

        if (ou.over && ou.over >= 55) {
            market = 'Toplam Gol 2.5';
            pick = '2.5 ÜST';
            odd = match.odds?.over25 || 1.76;
            reasoning = `Bilyoner Tribün'de bu maç için üyelerin büyük kısmı karşılıklı gollere ve 2.5 Üst baremine güveniyor. Tempolu bir oyun bekliyorum.`;
        } else if (mr.home >= 53) {
            market = 'Maç Sonucu';
            pick = `MS 1 (${home})`;
            odd = match.odds?.home || 1.60;
            reasoning = `${home} son haftalardaki oyun ritmiyle güven veriyor. Rakibin deplasman zaaflarını iyi değerlendirip sahadan galibiyetle ayrılacaktır.`;
        } else {
            market = 'Çifte Şans';
            pick = '1-X Çifte Şans';
            odd = 1.28;
            reasoning = `Risk almak istemeyen kuponlar için ev sahibi yenilmezliği en sağlam liman olarak öne çıkıyor.`;
        }

        return {
            author: author.name,
            role: author.role,
            title: author.title,
            avatar: author.avatar,
            source: 'Bilyoner.com',
            market,
            pick,
            odd,
            reasoning
        };
    },

    /**
     * Maçları getir (proxy üzerinden)
     */
    async getEvents(sportType = 'football') {
        try {
            const sportMap = { football: 'FOOTBALL', basketball: 'BASKETBALL', tennis: 'TENNIS' };
            const sport = sportMap[sportType] || 'FOOTBALL';
            const response = await fetch(`${this.BASE_URL}/events?sport=${sport}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return this.parseEvents(data, sportType);
        } catch (err) {
            console.warn('Bilyoner veri çekme uyarısı:', err.message);
            return [];
        }
    },

    parseEvents(rawData, sportType) {
        if (!rawData) return [];
        const events = [];
        try {
            const rawEvents = rawData?.data || rawData?.events || rawData || [];
            if (Array.isArray(rawEvents)) {
                rawEvents.forEach(event => {
                    const parsed = this.parseEvent(event, sportType);
                    if (parsed) events.push(parsed);
                });
            }
        } catch (err) {
            console.warn('Bilyoner parse hatası:', err.message);
        }
        return events;
    },

    parseEvent(event, sportType) {
        if (!event) return null;
        try {
            return {
                id: event.id || event.eventId || event.eventCode || Helpers.uuid(),
                source: 'bilyoner',
                sportType,
                homeTeam: event.homeTeamName || event.home || event.homeTeam || '—',
                awayTeam: event.awayTeamName || event.away || event.awayTeam || '—',
                league: event.competitionName || event.league || event.competition || '',
                matchDate: event.eventDate || event.date || event.startDate || null,
                odds: this.parseOdds(event),
                rawData: event
            };
        } catch {
            return null;
        }
    },

    parseOdds(event) {
        const odds = { home: null, draw: null, away: null, over25: null, under25: null };
        try {
            const markets = event.markets || event.odds || event.betTypes || [];
            if (Array.isArray(markets)) {
                markets.forEach(market => {
                    const outcomes = market.outcomes || market.selections || [];
                    const type = market.name || market.betTypeName || market.type || '';
                    if (type.includes('Maç Sonucu') || type.includes('1X2') || market.betTypeId === 1) {
                        outcomes.forEach(o => {
                            const name = o.name || o.selectionName || '';
                            const value = parseFloat(o.odds || o.price || o.value || 0);
                            if (name === '1' || name.includes('Ev Sahibi')) odds.home = value;
                            else if (name === 'X' || name.includes('Beraberlik')) odds.draw = value;
                            else if (name === '2' || name.includes('Deplasman')) odds.away = value;
                        });
                    }
                    if (type.includes('2,5') || type.includes('2.5')) {
                        outcomes.forEach(o => {
                            const name = o.name || o.selectionName || '';
                            const value = parseFloat(o.odds || o.price || o.value || 0);
                            if (name.includes('Üst')) odds.over25 = value;
                            else if (name.includes('Alt')) odds.under25 = value;
                        });
                    }
                });
            }
        } catch {}
        return odds;
    }
};

window.BilyonerService = BilyonerService;
