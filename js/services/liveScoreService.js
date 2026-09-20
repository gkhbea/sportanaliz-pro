/**
 * liveScoreService.js — Gerçek Canlı ve Biten Maç Skorları Servisi
 * Simülasyon yapmadan, doğrudan gerçek dünya canlı skor API'lerinden (ESPN Scoreboard & Global Live Feeds)
 * anlık maç skorlarını, dakikalarını ve maç sonu (MS) durumlarını çeker.
 */
const LiveScoreService = {
    get API_URL() {
        if (typeof window !== 'undefined') {
            const custom = window.ENV_API_URL || (typeof Helpers !== 'undefined' && Helpers.storage ? Helpers.storage.get('sa_api_base_url') : null);
            if (custom) return `${custom.replace(/\/$/, '')}/api/proxy/live/scores`;
            if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001')) {
                return 'http://localhost:3001/api/proxy/live/scores';
            }
        }
        return '/api/proxy/live/scores';
    },
    DIRECT_FALLBACK_URL: 'https://site.api.espn.com/apis/site/v2/sports/soccer/scorepanel',
    cachedScores: [],
    lastFetchedAt: null,
    pollingTimer: null,
    _dateFeedCache: new Map(),

    /**
     * Takım adını normalize et (Türkçe karakterler, kısaltmalar ve ekleri temizler)
     */
    /**
     * Takım adını normalize et (Türkçe karakterler, kısaltmalar ve ekleri temizler)
     */
    normalizeTeamName(name) {
        if (!name) return '';
        let str = String(name).toLowerCase().trim();
        str = str.replace(/ç/g, 'c')
                 .replace(/ğ/g, 'g')
                 .replace(/ı/g, 'i')
                 .replace(/ö/g, 'o')
                 .replace(/ş/g, 's')
                 .replace(/ü/g, 'u')
                 .replace(/İ/g, 'i');
        str = str.replace(/\b(fc|cf|sk|fk|as|ac|sc|cd|rb|inter|afc|cp|spor|kulubu|clube|u21|u19|u20|reserves|res|k|bayan|women)\b/gi, ' ');
        str = str.replace(/[^a-z0-9]/g, '');
        return str.trim();
    },

    /**
     * İki takım adının aynı veya eşleşen takım olup olmadığını akıllıca kontrol eder
     */
    isTeamMatch(name1, name2) {
        if (!name1 || !name2) return false;
        const n1 = this.normalizeTeamName(name1);
        const n2 = this.normalizeTeamName(name2);
        if (!n1 || !n2) return false;
        if (n1 === n2) return true;
        if (n1.length >= 4 && n2.length >= 4) {
            if (n1.includes(n2) || n2.includes(n1)) return true;
        }
        return false;
    },

    /**
     * Futbol Harici Sporları Kesinlikle Filtrele (Basketbol, Tenis, Voleybol vb. engeller)
     */
    isStrictFootballMatch(m) {
        if (!m) return false;
        
        // 1. Spor Türü Kontrolü
        const sport = (m.sport || m.sportName || m.type || '').toString().toLowerCase();
        if (sport && !['football', 'soccer', 'futbol', '1'].includes(sport)) {
            return false;
        }

        // 2. Lig / Turnuva Adı Kontrolü
        const league = (m.league || m.leagueName || m.competition || m.tournament || '').toString().toLowerCase();
        const nonFootballKeywords = [
            'basket', 'nba', 'euroleague', 'tbl', 'bsl', 'cba', 'kbl', 'wnba', 'fiba',
            'tenis', 'tennis', 'atp', 'wta', 'itf', 'challenger',
            'voley', 'volleyball', 'efeler', 'sultanlar',
            'hentbol', 'handball',
            'hokey', 'hockey', 'nhl', 'khl',
            'masa tenisi', 'table tennis', 'setka', 'tt cup', 'win cup',
            'badminton',
            'esport', 'e-spor', 'esports', 'dota', 'counter-strike', 'cs:go', 'cs2', 'valorant',
            'snooker', 'dart', 'rugby', 'ragbi', 'kriket', 'cricket',
            'futsal', 'beyzbol', 'baseball', 'su topu', 'water polo'
        ];
        if (nonFootballKeywords.some(kw => league.includes(kw))) {
            return false;
        }

        // 3. Takım İsimleri Kontrolü (Espor veya basketbol kulübü kontrolü)
        const home = (m.homeTeam || m.home || '').toString().toLowerCase();
        const away = (m.awayTeam || m.away || '').toString().toLowerCase();
        if (home.includes('esports') || away.includes('esports') || home.includes('gaming') || away.includes('gaming')) {
            return false;
        }

        // 4. Skor Anormallik Kontrolü (Basketbol skorları 50+ olur)
        const hScore = Number(m.homeScore !== undefined ? m.homeScore : (m.liveScore?.homeScore || m.liveScore?.home || 0));
        const aScore = Number(m.awayScore !== undefined ? m.awayScore : (m.liveScore?.awayScore || m.liveScore?.away || 0));
        if (hScore > 20 || aScore > 20 || (hScore + aScore) > 30) {
            return false;
        }

        return true;
    },

    /**
     * İki takım adının aynı takım olup olmadığını kontrol et
     */
    isTeamMatch(teamA, teamB) {
        const na = this.normalizeTeamName(teamA);
        const nb = this.normalizeTeamName(teamB);
        if (!na || !nb) return false;
        if (na === nb) return true;
        if (na.length >= 4 && nb.length >= 4) {
            if (na.includes(nb) || nb.includes(na)) return true;
        }
        return false;
    },

    /**
     * Zaman aşımlı fetch yardımcısı (Asla kilitlenmez)
     */
    async _fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);
            return res;
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    },

    /**
     * Canlı ve biten maç skorlarını çek
     * @param {string|null} targetDate - Opsiyonel DD/MM/YYYY veya YYYY-MM-DD tarihi
     */
    async fetchLiveScores(targetDate = null, force = false) {
        const cacheKey = targetDate || 'today';
        if (!force && this._dateFeedCache && this._dateFeedCache.has(cacheKey)) {
            return this._dateFeedCache.get(cacheKey);
        }
        try {
            const endpoint = targetDate ? `${this.API_URL}?date=${encodeURIComponent(targetDate)}` : this.API_URL;
            let response = null;
            try {
                response = await this._fetchWithTimeout(endpoint, {}, 2500);
            } catch (netErr) {
                console.warn('Proxy canlı skor uç noktasına ulaşılamadı, doğrudan fallback deneniyor...');
            }

            if (!response || !response.ok) {
                try {
                    response = await this._fetchWithTimeout(this.DIRECT_FALLBACK_URL, {}, 3000);
                } catch (fallbackErr) {
                    console.warn('Doğrudan fallback servisine ulaşılamadı:', fallbackErr.message);
                }
            }

            if (!response || !response.ok) {
                return this.cachedScores || [];
            }

            const data = await response.json();
            let scoreList = [];

            if (Array.isArray(data)) {
                scoreList = data;
            } else if (data.scores || data.events) {
                // ESPN fallback formatını ayrıştır
                const rawEvents = [];
                if (Array.isArray(data.events)) rawEvents.push(...data.events);
                if (Array.isArray(data.scores)) {
                    data.scores.forEach(s => {
                        if (Array.isArray(s.events)) rawEvents.push(...s.events);
                    });
                }

                rawEvents.forEach(e => {
                    const comp = e.competitions?.[0];
                    const home = comp?.competitors?.find(c => c.homeAway === 'home');
                    const away = comp?.competitors?.find(c => c.homeAway === 'away');
                    if (!home || !away) return;

                    const state = e.status?.type?.state;
                    let status = 'NOT_STARTED';
                    let minute = 'Başlamadı';

                    if (state === 'post') {
                        status = 'FINISHED';
                        minute = 'MS';
                    } else if (state === 'in') {
                        status = 'LIVE';
                        minute = e.status?.displayClock ? `${e.status.displayClock}'` : 'Canlı';
                    }

                    scoreList.push({
                        id: String(e.id),
                        homeTeam: home.team?.displayName || home.team?.name || '',
                        awayTeam: away.team?.displayName || away.team?.name || '',
                        homeScore: parseInt(home.score) || 0,
                        awayScore: parseInt(away.score) || 0,
                        firstHalfHome: (home.linescores && home.linescores[0]) ? parseInt(home.linescores[0].value) || 0 : 0,
                        firstHalfAway: (away.linescores && away.linescores[0]) ? parseInt(away.linescores[0].value) || 0 : 0,
                        status,
                        minute,
                        league: comp?.league?.name || 'Futbol'
                    });
                });
            }

            // Misli.com Canlı Maç Verilerini de Ekle (Hafif ve Zaman Aşımlı)
            if (window.MisliService && typeof MisliService.fetchLiveMatches === 'function' && !targetDate) {
                try {
                    const misliPromise = MisliService.fetchLiveMatches();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Misli timeout')), 1000));
                    const misliLive = await Promise.race([misliPromise, timeoutPromise]);
                    if (Array.isArray(misliLive) && misliLive.length > 0) {
                        misliLive.forEach(mm => {
                            if (!scoreList.some(s => this.isTeamMatch(s.homeTeam, mm.homeTeam) && this.isTeamMatch(s.awayTeam, mm.awayTeam))) {
                                scoreList.push({
                                    id: 'misli_' + mm.id,
                                    homeTeam: mm.homeTeam,
                                    awayTeam: mm.awayTeam,
                                    homeScore: mm.homeScore || 0,
                                    awayScore: mm.awayScore || 0,
                                    firstHalfHome: 0,
                                    firstHalfAway: 0,
                                    status: mm.status || 'LIVE',
                                    minute: mm.minute || 'Canlı',
                                    league: mm.league || 'Misli Canlı Bülten',
                                    odds: mm.odds || {},
                                    source: 'Misli.com (Canlı & Kral Oran)'
                                });
                            }
                        });
                    }
                } catch (mErr) {
                    console.warn('Misli canlı veri entegrasyon uyarısı:', mErr.message);
                }
            }

            // Futbol Harici Sporları Kesinlikle Filtrele (Basketbol, Tenis, Voleybol vb. engelle)
            scoreList = scoreList.filter(m => this.isStrictFootballMatch(m));

            this.cachedScores = scoreList;
            this.lastFetchedAt = new Date();
            if (!this._dateFeedCache) this._dateFeedCache = new Map();
            this._dateFeedCache.set(cacheKey, scoreList);
            console.log(`✅ Canlı futbol skor kaynağından (Misli.com + Global) ${scoreList.length} maç verisi başarıyla çekildi.`);
            return scoreList;
        } catch (err) {
            console.error('Canlı skor çekme hatası:', err);
            return (this.cachedScores || []).filter(m => this.isStrictFootballMatch(m));
        }
    },

    /**
     * Bültendeki maçları canlı skor beslemesiyle eşleştir ve MatchTracker'a yaz
     * (Simülasyon kesinlikle yapılmaz, sadece gerçek skorlar ve durumlar işlenir)
     */
    /**
     * Bültendeki maçları canlı skor beslemesiyle eşleştir ve MatchTracker'a yaz
     * (Hızlı Hash Map O(1) indeksleme ile saniyenin yüzde birinde çalışır, tarayıcıyı ASLA dondurmaz)
     */
    async syncBulletinMatches(matches = []) {
        if (!Array.isArray(matches) || matches.length === 0) {
            return { matchedCount: 0, finishedCount: 0, liveCount: 0, pendingCount: 0, totalMatches: 0, liveFeedTotal: 0 };
        }
        if (this._isSyncing) {
            return { matchedCount: 0, finishedCount: 0, liveCount: 0, pendingCount: matches.length, totalMatches: matches.length, liveFeedTotal: 0 };
        }
        this._isSyncing = true;

        try {
            let liveFeed = await this.fetchLiveScores();

            // Yalnızca Bugün ve Dün canlı/bitmiş skor kaynağı taranır (Gelecek haftanın günleri taranmaz!)
            const now = new Date();
            const formatMackolikDate = (d) => {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const targetDates = [formatMackolikDate(yest)];

            for (const dQuery of targetDates) {
                try {
                    const pastFeed = await this.fetchLiveScores(dQuery);
                    if (Array.isArray(pastFeed) && pastFeed.length > 0) {
                        liveFeed = [...liveFeed, ...pastFeed];
                    }
                } catch (e) {}
            }

            // Beslemeyi futbola filtrele
            liveFeed = liveFeed.filter(m => this.isStrictFootballMatch(m));

            // HIZLI VE OPTİMİZE HASH & PREFİX İNDEKSİ OLUŞTUR (0.01 sn altında biter)
            const exactMap = new Map();
            const prefixMap = new Map();

            liveFeed.forEach(item => {
                const nh = this.normalizeTeamName(item.homeTeam);
                const na = this.normalizeTeamName(item.awayTeam);
                if (nh && na) {
                    exactMap.set(`${nh}_${na}`, item);
                    exactMap.set(`${na}_${nh}`, { ...item, isReversed: true });

                    const pHome = nh.slice(0, 4);
                    if (!prefixMap.has(pHome)) prefixMap.set(pHome, []);
                    prefixMap.get(pHome).push({ item, nh, na, isReversed: false });

                    const pAway = na.slice(0, 4);
                    if (!prefixMap.has(pAway)) prefixMap.set(pAway, []);
                    prefixMap.get(pAway).push({ item, nh, na, isReversed: true });
                }
            });

            let matchedCount = 0;
            let finishedCount = 0;
            let liveCount = 0;
            let pendingCount = 0;

            matches.forEach(m => {
                const h = m.homeTeam || m.teams?.home || '';
                const a = m.awayTeam || m.teams?.away || '';
                const nh = this.normalizeTeamName(h);
                const na = this.normalizeTeamName(a);
                if (!nh || !na) {
                    pendingCount++;
                    return;
                }

                // 1. O(1) Tam Eşleşme
                let found = exactMap.get(`${nh}_${na}`);
                
                // 2. Prefiks tabanlı hızlı kısmi arama (O(N) döngüsü yapmaz, donmayı %100 engeller)
                if (!found && (nh.length >= 4 || na.length >= 4)) {
                    const candidates = prefixMap.get(nh.slice(0, 4)) || [];
                    for (let i = 0; i < candidates.length; i++) {
                        const c = candidates[i];
                        if (!c.isReversed) {
                            if ((c.nh.includes(nh) || nh.includes(c.nh)) && (c.na.includes(na) || na.includes(c.na))) {
                                found = c.item;
                                break;
                            }
                        } else {
                            if ((c.na.includes(nh) || nh.includes(c.na)) && (c.nh.includes(na) || na.includes(c.nh))) {
                                found = { ...c.item, isReversed: true };
                                break;
                            }
                        }
                    }
                }

                if (found && window.MatchTracker) {
                    const isReversed = !!found.isReversed;
                    const realHomeScore = isReversed ? found.awayScore : found.homeScore;
                    const realAwayScore = isReversed ? found.homeScore : found.awayScore;
                    const realFhHome = isReversed ? found.firstHalfAway : found.firstHalfHome;
                    const realFhAway = isReversed ? found.firstHalfHome : found.firstHalfAway;

                    const mackolikUrl = found.mackolikUrl || 'https://arsiv.mackolik.com/Canli-Sonuclar';
                    m.mackolikUrl = mackolikUrl;

                    window.MatchTracker.setMatchScore(
                        m,
                        realHomeScore,
                        realAwayScore,
                        found.status,
                        found.minute,
                        realFhHome,
                        realFhAway,
                        false,
                        mackolikUrl
                    );

                    m.liveScore = {
                        home: realHomeScore,
                        away: realAwayScore,
                        firstHalfHome: realFhHome,
                        firstHalfAway: realFhAway,
                        status: found.status,
                        minute: found.minute,
                        isFinished: found.status === 'FINISHED',
                        isLive: found.status === 'LIVE',
                        mackolikUrl: mackolikUrl,
                        source: found.source || 'Mackolik'
                    };

                    matchedCount++;
                    if (found.status === 'FINISHED') finishedCount++;
                    else if (found.status === 'LIVE') liveCount++;
                    else pendingCount++;
                } else if (window.MatchTracker) {
                    const existing = window.MatchTracker.getMatchScore(m);
                    if (existing && (existing.status === 'FINISHED' || existing.isManual)) {
                        if (existing.status === 'FINISHED') finishedCount++;
                        else if (existing.status === 'LIVE') liveCount++;
                        else pendingCount++;
                        m.liveScore = {
                            home: existing.homeScore,
                            away: existing.awayScore,
                            firstHalfHome: existing.firstHalfHome,
                            firstHalfAway: existing.firstHalfAway,
                            status: existing.status,
                            minute: existing.minute,
                            isFinished: existing.status === 'FINISHED',
                            isLive: existing.status === 'LIVE',
                            mackolikUrl: existing.mackolikUrl || 'https://arsiv.mackolik.com/Canli-Sonuclar',
                            source: 'Arşiv / Teyitli Sonuç'
                        };
                    } else {
                        pendingCount++;
                    }
                } else {
                    pendingCount++;
                }
            });

            console.log(`📊 [Hızlı Canlı Skor Eşleşmesi] ${matchedCount}/${matches.length} maç eşleşti. (Biten: ${finishedCount}, Canlı: ${liveCount}, Bekleyen: ${pendingCount})`);

            return {
                matchedCount,
                finishedCount,
                liveCount,
                pendingCount,
                totalMatches: matches.length,
                liveFeedTotal: liveFeed.length
            };
        } finally {
            this._isSyncing = false;
        }
    },

    /**
     * Tüm canlı oynanan maçları liste olarak döner (Sadece Futbol)
     */
    getLiveMatches() {
        if (!Array.isArray(this.cachedScores) || this.cachedScores.length === 0) return [];
        return this.cachedScores
            .filter(m => this.isStrictFootballMatch(m))
            .filter(m => m.status === 'LIVE' || (m.minute && m.minute !== 'MS' && m.minute !== 'Başlamadı' && m.minute !== ''));
    },

    /**
     * Tüm canlı ve bülten maçlarını tek birleştirilmiş liste olarak döner (Sadece Futbol)
     */
    getAllMatchesCombined(bulletinMatches = []) {
        const combined = [];
        const seenKeys = new Set();

        // 1. Önce anlık canlı ve güncel maç beslemesini ekle (Maçkolik, Misli, ESPN)
        (this.cachedScores || [])
            .filter(m => this.isStrictFootballMatch(m))
            .forEach(m => {
                const k = `${(m.homeTeam || '').toLowerCase()}_${(m.awayTeam || '').toLowerCase()}`;
                if (!seenKeys.has(k)) {
                    seenKeys.add(k);
                    combined.push(m);
                }
            });

        // 2. Bültende olup beslemede olmayanları ekle (Yalnızca Futbol)
        (bulletinMatches || [])
            .filter(m => this.isStrictFootballMatch(m))
            .forEach(m => {
                const k = `${(m.homeTeam || '').toLowerCase()}_${(m.awayTeam || '').toLowerCase()}`;
                if (!seenKeys.has(k)) {
                    seenKeys.add(k);
                    combined.push(m);
                }
            });

        return combined;
    },

    /**
     * Otomatik Canlı Takip Döngüsü Başlat
     */
    startAutoPolling(matchesGetter, onUpdateCallback, intervalMs = 90000) {
        this.stopAutoPolling();
        this.pollingTimer = setInterval(async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            const matches = typeof matchesGetter === 'function' ? matchesGetter() : matchesGetter;
            if (matches && matches.length > 0) {
                const syncResult = await this.syncBulletinMatches(matches);
                if (typeof onUpdateCallback === 'function') {
                    onUpdateCallback(syncResult);
                }
            }
        }, intervalMs);
    },

    /**
     * Otomatik takibi durdur
     */
    stopAutoPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }
};

// Global dışa aktarım
if (typeof window !== 'undefined') {
    window.LiveScoreService = LiveScoreService;
}
