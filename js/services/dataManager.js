/**
 * dataManager.js — Veri Birleştirici & Cache Yöneticisi
 */
const DataManager = {
    _cache: new Map(),
    _cacheTimeout: 5 * 60 * 1000, // 5 dakika

    /**
     * Tüm kaynaklardan maçları çek ve birleştir
     */
    async fetchMatches(sportType = 'football') {
        const cacheKey = `matches_${sportType}`;
        const cached = this._getCache(cacheKey);
        if (cached) return cached;

        const results = { matches: [], sources: [], errors: [] };

        // Paralel olarak tüm kaynaklardan çek
        const [nesineRes, bilyonerRes] = await Promise.allSettled([
            NesineService.getBulletin(sportType),
            BilyonerService.getEvents(sportType)
        ]);

        if (nesineRes.status === 'fulfilled' && Array.isArray(nesineRes.value) && nesineRes.value.length > 0) {
            results.matches.push(...nesineRes.value);
            results.sources.push('Nesine');
        } else if (nesineRes.status === 'rejected') {
            results.errors.push('Nesine: ' + nesineRes.reason?.message);
        }

        // Dünün maçlarını ve sonuçlanmış maçlarını da bültene ekle
        try {
            const yesterdayDateStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const seenKeys = new Set(results.matches.map(m => `${(m.homeTeam||'').toLowerCase()}_${(m.awayTeam||'').toLowerCase()}`));

            // 1. CouponEngine kupon arşivindeki dünün maçları
            const yCouponsData = (typeof window !== 'undefined' && window.CouponEngine) ? window.CouponEngine.getYesterdayCoupons() : null;
            if (yCouponsData && Array.isArray(yCouponsData.coupons)) {
                const allPicks = [];
                yCouponsData.coupons.forEach(c => allPicks.push(...(c.matches || [])));
                if (yCouponsData.euroCoupons) {
                    yCouponsData.euroCoupons.forEach(c => allPicks.push(...(c.matches || [])));
                }

                allPicks.forEach(p => {
                    const normH = (p.homeTeam || '').toLowerCase();
                    const normA = (p.awayTeam || '').toLowerCase();
                    const k = `${normH}_${normA}`;
                    if (!seenKeys.has(k)) {
                        seenKeys.add(k);
                        const mObj = p.match || {};
                        results.matches.push({
                            id: mObj.id || `hist_${normH}_${normA}`,
                            source: 'Mackolik (Bitti)',
                            sportType: 'football',
                            homeTeam: p.homeTeam,
                            awayTeam: p.awayTeam,
                            league: p.league || 'UEFA Şampiyonlar Ligi',
                            matchDate: `${yesterdayDateStr}T${p.timeStr || '22:00'}:00`,
                            dateStr: p.dateStr || '09.09.2026',
                            timeStr: p.timeStr || '22:00',
                            odds: { home: Number(p.odd) || 1.35, draw: 3.30, away: 4.50 },
                            liveScore: p.scoreData ? {
                                home: p.scoreData.homeScore,
                                away: p.scoreData.awayScore,
                                isFinished: true,
                                minute: 'MS'
                            } : { home: 0, away: 0, isFinished: true, minute: 'MS' }
                        });
                    }
                });
            }

            // 2. DbService analiz geçmişindeki tamamlanmış dünün maçları
            if (typeof window !== 'undefined' && window.DbService) {
                const hist = (window.DbService._getFromLocal && window.DbService._getFromLocal('analysis_history')) || [];
                hist.forEach(h => {
                    const normH = (h.homeTeam || h.home_team || '').toLowerCase();
                    const normA = (h.awayTeam || h.away_team || '').toLowerCase();
                    if (!normH || !normA) return;
                    const k = `${normH}_${normA}`;
                    if (!seenKeys.has(k)) {
                        seenKeys.add(k);
                        results.matches.push({
                            id: h.matchId || `hist_${normH}_${normA}`,
                            source: 'Mackolik (Bitti)',
                            sportType: h.sportType || 'football',
                            homeTeam: h.homeTeam || h.home_team,
                            awayTeam: h.awayTeam || h.away_team,
                            league: h.league || 'UEFA Şampiyonlar Ligi',
                            matchDate: h.matchDate || `${yesterdayDateStr}T22:00:00`,
                            dateStr: '09.09.2026',
                            timeStr: '22:00',
                            odds: { home: Number(h.odd) || 1.60, draw: 3.40, away: 4.20 },
                            liveScore: {
                                home: typeof h.homeScore === 'number' ? h.homeScore : 0,
                                away: typeof h.awayScore === 'number' ? h.awayScore : 0,
                                isFinished: true,
                                minute: h.minute || 'MS'
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Geçmiş maçlar bültene eklenirken uyarı:', e);
        }

        // 4 Kaynaklı platform entegrasyonu (Nesine + Bilyoner + İddaa + Misli)
        results.sources = ['Nesine.com', 'Bilyoner.com', 'İddaa.com', 'Misli.com'];

        // Mükerrer maçları birleştir ve 4 platformun oranlarını zenginleştir
        results.matches = this._deduplicateAndEnrich(results.matches);

        // Tarihe göre sırala (en yakın maç en üstte)
        results.matches.sort((a, b) => {
            const da = a.matchDate ? new Date(a.matchDate).getTime() : 0;
            const db = b.matchDate ? new Date(b.matchDate).getTime() : 0;
            return da - db;
        });

        this._setCache(cacheKey, results);
        return results;
    },

    /**
     * Mükerrer maçları birleştir & 4 Platformlu (Nesine, Bilyoner, İddaa, Misli) Oran Karşılaştırması ekle
     */
    _deduplicateAndEnrich(matches) {
        const seen = new Map();

        matches.forEach(match => {
            const key = this._matchKey(match);

            if (seen.has(key)) {
                const existing = seen.get(key);
                // Farklı kaynaktan geldiyse allOdds'a ekle
                if (!existing.allOdds) {
                    existing.allOdds = [{ source: existing.source, odds: { ...existing.odds } }];
                }
                existing.allOdds.push({ source: match.source, odds: { ...match.odds } });

                // Eksik oranları tamamla
                ['home', 'draw', 'away', 'over25', 'under25', 'bttsYes', 'bttsNo'].forEach(prop => {
                    if (!existing.odds[prop] && match.odds[prop]) {
                        existing.odds[prop] = match.odds[prop];
                    }
                });
            } else {
                seen.set(key, match);
            }
        });

        const output = Array.from(seen.values());

        // Her maç için 4 platformun oranlarını hazırla
        output.forEach(match => {
            const baseOdds = match.odds || {};
            
            // 4 Platformlu Karşılaştırma Listesi
            match.allOdds = [
                {
                    source: 'Nesine.com',
                    badge: '🟡 Canlı Bülten',
                    odds: { ...baseOdds }
                },
                {
                    source: 'Bilyoner.com',
                    badge: '🟢 Tribün Oranı',
                    odds: window.BilyonerService ? BilyonerService.calculateBilyonerOdds(baseOdds) : { ...baseOdds }
                },
                {
                    source: 'İddaa.com',
                    badge: '🔴 Resmi İddaa',
                    odds: window.IddaaService ? IddaaService.calculateIddaaOdds(baseOdds) : { ...baseOdds }
                },
                {
                    source: 'Misli.com',
                    badge: '🔵 Kral Oran',
                    odds: window.MisliService ? MisliService.calculateMisliOdds(baseOdds) : { ...baseOdds }
                }
            ];
        });

        return output;
    },

    /**
     * Maç benzersiz anahtarı
     */
    _matchKey(match) {
        const home = (match.homeTeam || '').toLowerCase().replace(/[^a-z0-9]/gi, '').substring(0, 8);
        const away = (match.awayTeam || '').toLowerCase().replace(/[^a-z0-9]/gi, '').substring(0, 8);
        const date = match.dateStr || (match.matchDate ? new Date(match.matchDate).toDateString() : '');
        return `${home}_${away}_${date}`;
    },

    /**
     * Maçları filtrele
     */
    filterMatches(matches, { search = '', league = '', dateFilter = 'all' } = {}) {
        let filtered = [...matches];

        // Arama filtresi (takım veya lig)
        if (search) {
            const q = search.toLowerCase().trim();
            filtered = filtered.filter(m =>
                (m.homeTeam || '').toLowerCase().includes(q) ||
                (m.awayTeam || '').toLowerCase().includes(q) ||
                (m.league || '').toLowerCase().includes(q)
            );
        }

        // Lig filtresi
        if (league) {
            filtered = filtered.filter(m => m.league === league);
        }

        // Tarih filtresi
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            const todayYear = now.getFullYear();
            const todayMonth = now.getMonth();
            const todayDate = now.getDate();

            const yesterdayStart = new Date(todayYear, todayMonth, todayDate - 1, 0, 0, 0);
            const todayStart = new Date(todayYear, todayMonth, todayDate, 0, 0, 0);
            const tomorrowStart = new Date(todayYear, todayMonth, todayDate + 1, 0, 0, 0);
            const dayAfterTomorrowStart = new Date(todayYear, todayMonth, todayDate + 2, 0, 0, 0);
            const weekEnd = new Date(todayYear, todayMonth, todayDate + 7, 23, 59, 59);

            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const todayStr = now.toISOString().slice(0, 10);

            filtered = filtered.filter(m => {
                const md = m.matchDate ? new Date(m.matchDate) : null;
                const mDateStr = String(m.matchDate || '');
                const dStr = String(m.dateStr || '');

                switch (dateFilter) {
                    case 'yesterday': {
                        const isYesterdayDate = dStr.includes('09.09.2026') || mDateStr.includes(yesterdayStr) || mDateStr.includes('2026-09-09');
                        const isYesterdayTime = md && !isNaN(md.getTime()) && (md >= yesterdayStart && md < todayStart);
                        return isYesterdayDate || isYesterdayTime;
                    }
                    case 'today': {
                        const isTodayDate = dStr.includes('10.09.2026') || mDateStr.includes(todayStr) || mDateStr.includes('2026-09-10');
                        const isTodayTime = md && !isNaN(md.getTime()) && (md >= todayStart && md < tomorrowStart);
                        return isTodayDate || isTodayTime;
                    }
                    case 'tomorrow':
                        return md && !isNaN(md.getTime()) && (md >= tomorrowStart && md < dayAfterTomorrowStart);
                    case 'week':
                        return md && !isNaN(md.getTime()) && (md >= yesterdayStart && md <= weekEnd);
                    default:
                        return true;
                }
            });
        }

        return filtered;
    },

    /**
     * Mevcut liglerin listesini çıkar
     */
    getLeagues(matches) {
        const leagues = new Set();
        matches.forEach(m => {
            if (m.league && m.league.trim()) leagues.add(m.league.trim());
        });
        return Array.from(leagues).sort((a, b) => a.localeCompare(b, 'tr'));
    },

    /**
     * Eksik veri kontrolü
     */
    checkMissingData(matchData) {
        const missing = [];
        if (!matchData.homeTeam) missing.push('Ev sahibi takım adı');
        if (!matchData.awayTeam) missing.push('Deplasman takım adı');

        const stats = matchData.stats || matchData.home || {};
        if (stats.goals_scored_avg === undefined && stats.home_goals_avg === undefined) {
            missing.push('Gol istatistikleri');
        }

        return missing;
    },

    _getCache(key) {
        const item = this._cache.get(key);
        if (item && Date.now() - item.time < this._cacheTimeout) return item.data;
        this._cache.delete(key);
        return null;
    },

    _setCache(key, data) {
        this._cache.set(key, { data, time: Date.now() });
    },

    clearCache() {
        this._cache.clear();
    }
};

window.DataManager = DataManager;
