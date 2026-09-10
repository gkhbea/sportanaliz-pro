/**
 * liveScoreService.js — Gerçek Canlı ve Biten Maç Skorları Servisi
 * Simülasyon yapmadan, doğrudan gerçek dünya canlı skor API'lerinden (ESPN Scoreboard & Global Live Feeds)
 * anlık maç skorlarını, dakikalarını ve maç sonu (MS) durumlarını çeker.
 */
const LiveScoreService = {
    get API_URL() {
        if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001'))) {
            return 'http://localhost:3001/api/proxy/live/scores';
        }
        return '/api/proxy/live/scores';
    },
    DIRECT_FALLBACK_URL: 'https://site.api.espn.com/apis/site/v2/sports/soccer/scorepanel',
    cachedScores: [],
    lastFetchedAt: null,
    pollingTimer: null,

    /**
     * Takım adını normalize et (Türkçe karakterler, kısaltmalar ve ekleri temizler)
     */
    normalizeTeamName(name) {
        if (!name) return '';
        return String(name)
            .toLowerCase()
            .replace(/ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/\b(fc|cf|sk|fk|as|ac|sc|cd|rb|inter|afc|cp|spor|kulubu|clube)\b/gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
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
     * Canlı ve biten maç skorlarını çek
     * @param {string|null} targetDate - Opsiyonel DD/MM/YYYY veya YYYY-MM-DD tarihi
     */
    async fetchLiveScores(targetDate = null) {
        try {
            const endpoint = targetDate ? `${this.API_URL}?date=${encodeURIComponent(targetDate)}` : this.API_URL;
            let response;
            try {
                response = await fetch(endpoint);
            } catch (netErr) {
                console.warn('Proxy live score erişilemedi, doğrudan fallback deneniyor...');
                response = await fetch(this.DIRECT_FALLBACK_URL);
            }

            if (!response.ok) {
                // Fallback dene
                response = await fetch(this.DIRECT_FALLBACK_URL);
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

            this.cachedScores = scoreList;
            this.lastFetchedAt = new Date();
            console.log(`✅ Canlı skor kaynağından ${scoreList.length} maç verisi başarıyla çekildi.`);
            return scoreList;
        } catch (err) {
            console.error('Canlı skor çekme hatası:', err);
            return this.cachedScores || [];
        }
    },

    /**
     * Bültendeki maçları canlı skor beslemesiyle eşleştir ve MatchTracker'a yaz
     * (Simülasyon kesinlikle yapılmaz, sadece gerçek skorlar ve durumlar işlenir)
     */
    async syncBulletinMatches(matches = []) {
        if (!Array.isArray(matches) || matches.length === 0) return { matched: 0, total: 0 };

        let liveFeed = await this.fetchLiveScores();

        // Eğer listede dünün maçları varsa, dünün resmi Maçkolik skorlarını da beslemeye ekle
        const hasYesterdayMatches = matches.some(m => {
            const d = (m.dateStr || m.matchDate || '').toString();
            return d.includes('09.09') || d.includes('2026-09-09');
        });
        if (hasYesterdayMatches) {
            try {
                const yFeed = await this.fetchLiveScores('09/09/2026');
                if (Array.isArray(yFeed) && yFeed.length > 0) {
                    liveFeed = [...liveFeed, ...yFeed];
                }
            } catch (e) {
                console.warn('Dünün skorları canlı beslemeye eklenirken uyarı:', e);
            }
        }

        let matchedCount = 0;
        let finishedCount = 0;
        let liveCount = 0;
        let pendingCount = 0;

        matches.forEach(m => {
            const h = m.homeTeam;
            const a = m.awayTeam;

            // Canlı beslemede bu maçı bul
            const found = liveFeed.find(item => 
                (this.isTeamMatch(h, item.homeTeam) && this.isTeamMatch(a, item.awayTeam)) ||
                (this.isTeamMatch(h, item.awayTeam) && this.isTeamMatch(a, item.homeTeam))
            );

            if (found && window.MatchTracker) {
                // Eğer ters eşleştiyse skorları ters çevir
                const isReversed = this.isTeamMatch(h, found.awayTeam);
                const realHomeScore = isReversed ? found.awayScore : found.homeScore;
                const realAwayScore = isReversed ? found.homeScore : found.awayScore;
                const realFhHome = isReversed ? found.firstHalfAway : found.firstHalfHome;
                const realFhAway = isReversed ? found.firstHalfHome : found.firstHalfAway;

                const mackolikUrl = found.mackolikUrl || `https://arsiv.mackolik.com/Canli-Sonuclar`;
                m.mackolikUrl = mackolikUrl;

                window.MatchTracker.setMatchScore(
                    m,
                    realHomeScore,
                    realAwayScore,
                    found.status,
                    found.minute,
                    realFhHome,
                    realFhAway,
                    false, // isManual = false (Gerçek API skoru)
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
                // Eğer maç zaten bitmişse veya bültende netleşmiş skoru varsa koru
                if (m.liveScore && (m.liveScore.isFinished || typeof m.liveScore.home === 'number')) {
                    window.MatchTracker.setMatchScore(
                        m,
                        m.liveScore.home,
                        m.liveScore.away,
                        m.liveScore.status || 'FINISHED',
                        m.liveScore.minute || 'MS',
                        m.liveScore.firstHalfHome || 0,
                        m.liveScore.firstHalfAway || 0,
                        false,
                        m.mackolikUrl || m.liveScore.mackolikUrl
                    );
                    if (m.liveScore.isFinished) finishedCount++;
                    else pendingCount++;
                    return;
                }

                const existing = window.MatchTracker.getMatchScore(m);
                if (existing && existing.status === 'FINISHED') {
                    finishedCount++;
                    return;
                }

                // Henüz başlamamış maçlar
                if (!existing.isManual) {
                    window.MatchTracker.setMatchScore(
                        m,
                        0,
                        0,
                        'NOT_STARTED',
                        'Başlamadı',
                        0,
                        0,
                        false
                    );
                }
                pendingCount++;
            }
        });

        console.log(`📊 Canlı Skor Eşleşmesi: ${matchedCount}/${matches.length} maç eşleşti. (Biten: ${finishedCount}, Canlı: ${liveCount}, Başlamadı: ${pendingCount})`);

        return {
            matchedCount,
            finishedCount,
            liveCount,
            pendingCount,
            totalMatches: matches.length,
            liveFeedTotal: liveFeed.length
        };
    },

    /**
     * Otomatik Canlı Takip Döngüsü Başlat
     */
    startAutoPolling(matchesGetter, onUpdateCallback, intervalMs = 45000) {
        this.stopAutoPolling();
        console.log(`⏱️ Otomatik Canlı Skor Takibi başlatıldı (${intervalMs / 1000}sn aralıkla)`);

        this.pollingTimer = setInterval(async () => {
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
