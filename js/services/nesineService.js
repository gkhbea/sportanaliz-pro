/**
 * nesineService.js — Nesine.com Gerçek Veri Servisi
 * Nesine CDN bülten API'sini parse eder.
 */
const NesineService = {
    get BASE_URL() {
        if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001'))) {
            return 'http://localhost:3001/api/proxy/nesine';
        }
        return '/api/proxy/nesine';
    },

    /**
     * Spor tipine göre Nesine kod eşleşmesi
     */
    SPORT_TYPE_MAP: {
        football: 1,
        basketball: 2,
        tennis: 5
    },

    /**
     * Bülten verisi çek
     */
    async getBulletin(sportType = 'football') {
        try {
            // Nesine'de tek endpoint tüm bülteni döndürür
            const response = await fetch(`${this.BASE_URL}/bulten`);
            if (!response.ok) {
                // Alternatif endpoint dene
                const altResponse = await fetch(`${this.BASE_URL}/events/1`);
                if (!altResponse.ok) throw new Error(`HTTP ${response.status}`);
                const altData = await altResponse.json();
                return this.parseEvents(altData, sportType);
            }
            const data = await response.json();
            return this.parseEvents(data, sportType);
        } catch (err) {
            console.warn('Nesine veri çekme hatası:', err.message);
            return [];
        }
    },

    /**
     * Ham veriyi normalize et
     */
    parseEvents(rawData, sportType) {
        if (!rawData) return [];
        const events = [];

        try {
            // Nesine bülten yapısı: rawData.sg.EA ve rawData.sg.LA
            const rawEvents = rawData?.sg?.EA || rawData?.EA || rawData?.d?.Events || rawData?.Events || [];
            
            // Lig lookup tablosu oluştur (LID -> Lig Adı)
            const leagueMap = new Map();
            const rawLeagues = rawData?.sg?.LA || rawData?.LA || [];
            if (Array.isArray(rawLeagues)) {
                rawLeagues.forEach(l => {
                    const id = l.LID || l.ID || l.C;
                    const name = l.N || l.Name || l.LN;
                    if (id && name) leagueMap.set(id, name);
                });
            }

            // Nesine Yorumcu / Editör eşleşmesi
            const editorDetailsMap = new Map();
            const rawEditorDetails = rawData?.nsn?.editorDetails || [];
            if (Array.isArray(rawEditorDetails)) {
                rawEditorDetails.forEach(ed => {
                    if (ed.id) editorDetailsMap.set(String(ed.id), ed);
                });
            }

            // Editör tercihlerini maç koduna göre grupla
            const editorChoicesByMatch = new Map();
            const rawEditorChoices = rawData?.nsn?.editorChoices || [];
            if (Array.isArray(rawEditorChoices)) {
                rawEditorChoices.forEach(choice => {
                    const code = String(choice.code || choice.nevId);
                    if (!editorChoicesByMatch.has(code)) editorChoicesByMatch.set(code, []);
                    const editorInfo = editorDetailsMap.get(String(choice.id));
                    editorChoicesByMatch.get(code).push({
                        id: choice.id,
                        name: choice.name || editorInfo?.name || 'Nesine Yorumcusu',
                        marketName: choice.marketName || 'Maç Bahsi',
                        outcomeName: choice.outcomeName || 'Tercih',
                        odd: parseFloat(choice.odd) || null,
                        avatar: editorInfo?.image || null
                    });
                });
            }

            const targetTypeCode = this.SPORT_TYPE_MAP[sportType] || 1;

            if (Array.isArray(rawEvents)) {
                rawEvents.forEach(event => {
                    // Sadece gerçek maçları al (ev ve deplasman takımları olan, şampiyonluk bahisleri vb. hariç)
                    if (!event.HN || !event.AN) return;

                    // Spor tipine göre filtrele
                    if (sportType && sportType !== 'all') {
                        if (event.TYPE !== targetTypeCode) return;
                    }

                    const matchCode = String(event.C || event.EV);
                    const matchChoices = editorChoicesByMatch.get(matchCode) || [];

                    const parsed = this.parseEvent(event, sportType, leagueMap, matchChoices);
                    if (parsed) events.push(parsed);
                });
            }
        } catch (err) {
            console.warn('Nesine parse hatası:', err.message);
        }

        return events;
    },

    /**
     * Tek event'i normalize et
     */
    parseEvent(event, sportType, leagueMap = new Map(), editorChoices = []) {
        if (!event) return null;

        try {
            // Lig adı: leagueMap'ten veya event alanlarından
            let leagueName = leagueMap.get(event.LC) || event.LN || event.LeagueName || event.League || '';
            if (!leagueName && event.LC) {
                leagueName = `Lig ${event.LC}`;
            }

            // Tarih ve saat
            let matchDate = null;
            if (event.ESD) {
                matchDate = new Date(event.ESD).toISOString();
            } else if (event.ED) {
                matchDate = new Date(event.ED).toISOString();
            } else if (event.D) {
                // "09.09.2026" formatı
                const parts = event.D.split('.');
                if (parts.length === 3) {
                    const timePart = event.T ? event.T : '00:00';
                    matchDate = `${parts[2]}-${parts[1]}-${parts[0]}T${timePart}:00`;
                }
            }

            const odds = this.parseOdds(event, sportType);

            return {
                id: 'nesine_' + (event.C || event.EV || event.Id || Helpers.uuid()),
                source: 'nesine',
                sportType,
                homeTeam: event.HN || event.HomeTeam || '—',
                awayTeam: event.AN || event.AwayTeam || '—',
                league: leagueName,
                matchDate: matchDate,
                dateStr: event.D || '',
                timeStr: event.T || '',
                dayStr: event.DAY || '',
                odds: odds,
                editorChoices: editorChoices,
                rawData: {
                    eventCode: event.C,
                    eventVersion: event.EV,
                    type: event.TYPE
                }
            };
        } catch (e) {
            console.warn('Maç parse hatası:', e);
            return null;
        }
    },

    /**
     * Oranları parse et (Nesine market yapısı)
     */
    parseOdds(event, sportType) {
        const odds = {
            home: null,
            draw: null,
            away: null,
            over25: null,
            under25: null,
            bttsYes: null,
            bttsNo: null
        };

        try {
            const markets = event.MA || event.Markets || [];

            if (Array.isArray(markets)) {
                markets.forEach(market => {
                    const mtid = market.MTID || market.MI;
                    const oca = market.OCA || market.Outcomes || [];
                    const sov = market.SOV;

                    // MTID 1: Futbol Maç Sonucu (1X2)
                    if (mtid === 1 && Array.isArray(oca)) {
                        oca.forEach(o => {
                            const val = parseFloat(o.O || o.Odds || 0);
                            if (val > 1) {
                                if (o.N === 1) odds.home = val;
                                else if (o.N === 2) odds.draw = val;
                                else if (o.N === 3) odds.away = val;
                            }
                        });
                    }

                    // MTID 142 (Basketbol Maç Kazananı - Beraberliksiz)
                    // MTID 182 (Tenis Maç Kazananı)
                    if ((mtid === 142 || mtid === 182) && Array.isArray(oca)) {
                        oca.forEach(o => {
                            const val = parseFloat(o.O || o.Odds || 0);
                            if (val > 1) {
                                if (o.N === 1) odds.home = val;
                                else if (o.N === 2) odds.away = val;
                            }
                        });
                    }

                    // MTID 147 (Basketbol 1X2 normal süre)
                    if (mtid === 147 && !odds.home && Array.isArray(oca)) {
                        oca.forEach(o => {
                            const val = parseFloat(o.O || o.Odds || 0);
                            if (val > 1) {
                                if (o.N === 1) odds.home = val;
                                else if (o.N === 2) odds.draw = val;
                                else if (o.N === 3) odds.away = val;
                            }
                        });
                    }

                    // MTID 12: 2.5 Alt / Üst (SOV === 2.5)
                    if (mtid === 12 && (sov === 2.5 || sov === '2.5') && Array.isArray(oca)) {
                        oca.forEach(o => {
                            const val = parseFloat(o.O || o.Odds || 0);
                            if (val > 1) {
                                if (o.N === 1) odds.under25 = val; // Nesine'de N:1 Alt
                                else if (o.N === 2) odds.over25 = val;  // N:2 Üst
                            }
                        });
                    }

                    // MTID 38: Karşılıklı Gol Var / Yok
                    if (mtid === 38 && Array.isArray(oca)) {
                        oca.forEach(o => {
                            const val = parseFloat(o.O || o.Odds || 0);
                            if (val > 1) {
                                if (o.N === 1) odds.bttsYes = val;
                                else if (o.N === 2) odds.bttsNo = val;
                            }
                        });
                    }
                });
            }

            // Düz yapı fallback
            if (!odds.home && event.O1) odds.home = parseFloat(event.O1);
            if (!odds.draw && event.OX) odds.draw = parseFloat(event.OX);
            if (!odds.away && event.O2) odds.away = parseFloat(event.O2);
        } catch (e) {
            console.warn('Oran parse hatası:', e);
        }

        return odds;
    }
};

window.NesineService = NesineService;
