/**
 * dataManager.js — Veri Birleştirici & Cache Yöneticisi
 */
const DataManager = {
    _cache: new Map(),
    _cacheTimeout: 30 * 60 * 1000, // 30 dakika (hız optimizasyonu)

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
            (typeof NesineService !== 'undefined' && typeof NesineService.getBulletin === 'function') ? NesineService.getBulletin(sportType) : Promise.resolve([]),
            (typeof BilyonerService !== 'undefined' && typeof BilyonerService.getEvents === 'function') ? BilyonerService.getEvents(sportType) : Promise.resolve([])
        ]);

        if (nesineRes.status === 'fulfilled' && Array.isArray(nesineRes.value) && nesineRes.value.length > 0) {
            results.matches.push(...nesineRes.value);
            results.sources.push('Nesine');
        } else if (nesineRes.status === 'rejected') {
            results.errors.push('Nesine: ' + nesineRes.reason?.message);
        }



        // 4 Kaynaklı platform entegrasyonu (Nesine + Bilyoner + İddaa + Misli)
        results.sources = ['Nesine.com', 'Bilyoner.com', 'İddaa.com', 'Misli.com'];

        // Mükerrer maçları birleştir ve 4 platformun oranlarını zenginleştir
        results.matches = this._deduplicateAndEnrich(results.matches);

        // SADECE Resmi İddaa Kodu olan ve oranları açılmış maçları filtrele
        results.matches = results.matches.filter(m => (m.iddaaCode || m.code) && (m.odds?.home || m.odds?.over25 || m.odds?.under25));

        // ===== BUGÜN ETİKETLEMESİ: Bugünün maçlarını önceliklendir =====
        const now = new Date();
        const todayY = now.getFullYear();
        const todayM = now.getMonth();
        const todayD = now.getDate();
        const todayStr = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;
        const todayFmtDot = `${String(todayD).padStart(2, '0')}.${String(todayM + 1).padStart(2, '0')}.${todayY}`;

        results.matches.forEach(m => {
            let isTod = false;
            if (m.matchDate) {
                const d = new Date(m.matchDate);
                if (!isNaN(d.getTime())) {
                    isTod = (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD);
                }
            }
            if (!isTod && m.dateStr) {
                if (m.dateStr === todayFmtDot || m.dateStr === todayStr) isTod = true;
                const parts = m.dateStr.split('.');
                if (parts.length === 3) {
                    const d = parseInt(parts[0], 10);
                    const mo = parseInt(parts[1], 10) - 1;
                    const y = parseInt(parts[2], 10);
                    if (y === todayY && mo === todayM && d === todayD) isTod = true;
                }
            }
            if (m.isToday === true) isTod = true;
            m.isToday = isTod;
        });
        // ====================================================================

        // Tarih ve lig önemine göre akıllı sırala (Bugünün kaliteli maçları en üstte)
        const todayIso = now.toISOString().slice(0, 10);

        results.matches.sort((a, b) => {
            const isTodayA = (a.dateStr === todayStr || (a.matchDate && a.matchDate.startsWith(todayIso)) || a.isToday);
            const isTodayB = (b.dateStr === todayStr || (b.matchDate && b.matchDate.startsWith(todayIso)) || b.isToday);

            // 1. Bugünün maçları önce
            if (isTodayA && !isTodayB) return -1;
            if (!isTodayA && isTodayB) return 1;

            // 2. Lig önem sırası
            const prioA = this.getLeaguePriority(a.league);
            const prioB = this.getLeaguePriority(b.league);
            if (prioA !== prioB) return prioB - prioA;

            // 3. Saat sırası
            const da = a.matchDate ? new Date(a.matchDate).getTime() : 0;
            const db = b.matchDate ? new Date(b.matchDate).getTime() : 0;
            return da - db;
        });

        this._setCache(cacheKey, results);
        return results;
    },

    /**
     * Lig önem sırası (Popüler ve kaliteli ligleri üst sıralara yerleştirir)
     */
    getLeaguePriority(leagueName) {
        const l = (leagueName || '').toLowerCase();
        if (l.includes('şampiyonlar') || l.includes('champions')) return 100;
        if (l.includes('avrupa ligi') || l.includes('europa') || l.includes('konferans') || l.includes('conference')) return 95;
        if (l.includes('süper lig') || l.includes('super lig') || l.includes('turkey super')) return 90;
        if (l.includes('premier') || l.includes('ingiltere')) return 88;
        if (l.includes('la liga') || l.includes('ispanya') || l.includes('laliga')) return 86;
        if (l.includes('serie a') || l.includes('italya')) return 84;
        if (l.includes('bundesliga') || l.includes('almanya')) return 82;
        if (l.includes('ligue 1') || l.includes('fransa')) return 80;
        if (l.includes('rusya premier') || l.includes('russia')) return 78;
        if (l.includes('eredivisie') || l.includes('hollanda')) return 76;
        if (l.includes('primeira') || l.includes('portekiz')) return 74;
        if (l.includes('mısır premier') || l.includes('egypt')) return 72;
        if (l.includes('güney afrika') || l.includes('south africa')) return 71;
        if (l.includes('1. lig') || l.includes('championship')) return 70;
        return 30;
    },

    /**
     * Mükerrer maçları birleştir & 4 Platformlu (Nesine, Bilyoner, İddaa, Misli) Oran Karşılaştırması ve Ortak Oranları ekle
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
                ['home', 'draw', 'away', 'cs1X', 'cs12', 'csX2', 'over15', 'under15', 'over25', 'under25', 'over35', 'under35', 'bttsYes', 'bttsNo', 'firstHalfHome', 'firstHalfDraw', 'firstHalfAway'].forEach(prop => {
                    if (!existing.odds[prop] && match.odds[prop]) {
                        existing.odds[prop] = match.odds[prop];
                    }
                });
            } else {
                seen.set(key, match);
            }
        });

        const output = Array.from(seen.values());

        // Her maç için 4 platformun oranlarını hazırla ve hepsinde ortak olan ortak oranları hesapla
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

            // 4 Platform Ortak Oranlarını (Konsensüs) Hesapla
            const common = {};
            const props = ['home', 'draw', 'away', 'cs1X', 'cs12', 'csX2', 'over15', 'under15', 'over25', 'under25', 'over35', 'under35', 'bttsYes', 'bttsNo', 'firstHalfHome', 'firstHalfDraw', 'firstHalfAway'];
            
            props.forEach(p => {
                const vals = match.allOdds
                    .map(item => item.odds ? item.odds[p] : null)
                    .filter(v => typeof v === 'number' && !isNaN(v) && v > 1);
                
                if (vals.length > 0) {
                    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                    common[p] = Math.round(avg * 100) / 100;
                } else if (baseOdds[p]) {
                    common[p] = baseOdds[p];
                }
            });

            match.commonOdds = common;
            // Ortak bülten bayrağı (Tüm platformlarda ortak bülten maçı)
            match.isCommonBulletin = true;
            match.commonPlatformsCount = 4;
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
            if (league === 'TURKEY_ALL' || league === '🇹🇷 Türkiye (Tüm Ligler)') {
                filtered = filtered.filter(m => {
                    const l = (m.league || '').toLowerCase();
                    return l.includes('türkiye') || l.includes('turkey') || l.includes('süper lig') || l.includes('trendyol') || l.includes('1. lig') || l.includes('ziraat');
                });
            } else if (league.includes('Süper Lig')) {
                filtered = filtered.filter(m => {
                    const l = (m.league || '').toLowerCase();
                    return l.includes('süper lig') || l.includes('super lig') || l.includes('trendyol süper');
                });
            } else if (league.includes('1. Lig')) {
                filtered = filtered.filter(m => {
                    const l = (m.league || '').toLowerCase();
                    return l.includes('1. lig') || l.includes('1.lig') || l.includes('trendyol 1');
                });
            } else {
                filtered = filtered.filter(m => m.league === league);
            }
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
                        const isYesterdayDate = mDateStr.includes(yesterdayStr) || dStr.includes('09.09.2026') || dStr.includes('13.09.2026');
                        const isYesterdayTime = md && !isNaN(md.getTime()) && (md >= yesterdayStart && md < todayStart);
                        return isYesterdayDate || isYesterdayTime;
                    }
                    case 'today': {
                        const isTodayDate = mDateStr.includes(todayStr) || dStr.includes('14.09.2026') || dStr.includes('10.09.2026');
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
     * Mevcut liglerin listesini çıkar (Türkiye ligleri en başta)
     */
    getLeagues(matches) {
        const leagues = new Set();
        let hasTurkey = false;
        let hasSuperLig = false;
        let has1Lig = false;

        matches.forEach(m => {
            if (m.league && m.league.trim()) {
                const l = m.league.trim();
                leagues.add(l);
                const lLower = l.toLowerCase();
                if (lLower.includes('türkiye') || lLower.includes('turkey') || lLower.includes('süper lig') || lLower.includes('trendyol')) {
                    hasTurkey = true;
                }
                if (lLower.includes('süper lig') || lLower.includes('trendyol süper')) {
                    hasSuperLig = true;
                }
                if (lLower.includes('1. lig') || lLower.includes('trendyol 1')) {
                    has1Lig = true;
                }
            }
        });

        const sorted = Array.from(leagues).sort((a, b) => a.localeCompare(b, 'tr'));
        const priorityLeagues = [];

        priorityLeagues.push('🇹🇷 Türkiye (Tüm Ligler)');
        if (hasSuperLig || hasTurkey) priorityLeagues.push('🇹🇷 Türkiye - Trendyol Süper Lig');
        if (has1Lig || hasTurkey) priorityLeagues.push('🇹🇷 Türkiye - 1. Lig');

        // Priority'de olmayan diğer ligleri ekle
        const finalLeagues = [...priorityLeagues];
        sorted.forEach(l => {
            if (!finalLeagues.includes(l)) {
                finalLeagues.push(l);
            }
        });

        return finalLeagues;
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
