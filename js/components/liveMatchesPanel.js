/**
 * liveMatchesPanel.js — Canlı Maçlar & Anlık Skor Takip Masası UI Bileşeni
 * Canlı oynanan karşılaşmaları, anlık skorları, dakika bilgilerini, yapay zeka analizlerini
 * ve kuponlardaki canlı durumlarını (önde/riskli) ayrı bir ekranda sunar.
 */
const LiveMatchesPanel = {
    currentFilter: 'all',
    searchQuery: '',

    /**
     * Canlı Maçlar Paneli HTML'ini render et
     * @param {Object} app - Ana uygulama örneği
     * @param {string} filter - 'all', 'live', 'coupon_live', 'major', 'finished'
     * @param {string} search - Arama sorgusu
     * @returns {string} HTML string
     */
    render(app, filter = 'all', search = '') {
        this.currentFilter = filter;
        this.searchQuery = search;

        const allMatches = app.matches || [];
        const isPollingActive = Boolean(window.LiveScoreService?.isPolling);

        // Kuponlardaki maçları haritalandır
        const couponMatchMap = this._buildCouponMatchMap(app);

        // Maçları zenginleştir
        const enrichedMatches = allMatches.map(match => {
            const scoreData = window.MatchTracker ? window.MatchTracker.getMatchScore(match) : {
                homeScore: match.liveScore?.home ?? 0,
                awayScore: match.liveScore?.away ?? 0,
                status: match.liveScore?.status || (match.liveScore?.isFinished ? 'FINISHED' : 'NOT_STARTED'),
                minute: match.liveScore?.minute || (match.liveScore?.isFinished ? 'MS' : 'Başlamadı')
            };

            const key = window.MatchTracker ? window.MatchTracker.getMatchKey(match) : `${match.homeTeam}_vs_${match.awayTeam}`;
            const couponInfo = couponMatchMap[key] || null;

            // Yapay zeka analizi ve en iyi tercih
            let topPick = null;
            let analysis = null;
            try {
                analysis = app.getMatchAnalysis ? app.getMatchAnalysis(match) : null;
                if (analysis && analysis.result && window.EditorEngine) {
                    const ed = EditorEngine.evaluate(analysis.result, match, analysis.risk);
                    topPick = ed?.topPick || null;
                }
            } catch (e) {
                // Sessiz geç
            }

            const isLive = scoreData.status === 'LIVE' || (scoreData.minute && scoreData.minute !== 'MS' && scoreData.minute !== 'Başlamadı');
            const isFinished = scoreData.status === 'FINISHED' || scoreData.minute === 'MS';

            return {
                match,
                key,
                scoreData,
                couponInfo,
                topPick,
                analysis,
                isLive,
                isFinished
            };
        });

        // Canlı skor servisinden doğrudan gelen ve bültenle eşleşmeyen ek maçları da dahil et (varsa)
        const liveScoreServiceMatches = (window.LiveScoreService?.cachedScores || []).filter(cs => {
            if (cs.status !== 'LIVE') return false;
            // Zaten bülten maçlarımızla eşleşmiş mi?
            return !enrichedMatches.some(em => 
                window.LiveScoreService?.isTeamMatch(em.match.homeTeam, cs.homeTeam) &&
                window.LiveScoreService?.isTeamMatch(em.match.awayTeam, cs.awayTeam)
            );
        }).map(cs => ({
            match: {
                id: cs.id,
                homeTeam: cs.homeTeam,
                awayTeam: cs.awayTeam,
                league: cs.league || 'Canlı Karşılaşma',
                timeStr: cs.minute || 'Canlı',
                isLiveFeedOnly: true
            },
            key: `feed_${cs.id}`,
            scoreData: {
                homeScore: cs.homeScore,
                awayScore: cs.awayScore,
                status: 'LIVE',
                minute: cs.minute || 'Canlı'
            },
            couponInfo: null,
            topPick: null,
            analysis: null,
            isLive: true,
            isFinished: false
        }));

        const combinedList = [...enrichedMatches, ...liveScoreServiceMatches];

        // Sayaçlar
        const liveCount = combinedList.filter(m => m.isLive).length;
        const finishedCount = combinedList.filter(m => m.isFinished).length;
        const couponLiveCount = combinedList.filter(m => m.couponInfo && (m.isLive || m.isFinished)).length;
        const pendingCount = combinedList.filter(m => !m.isLive && !m.isFinished).length;

        // Filtreleme
        const filteredList = combinedList.filter(item => {
            const h = (item.match.homeTeam || '').toLowerCase();
            const a = (item.match.awayTeam || '').toLowerCase();
            const l = (item.match.league || '').toLowerCase();
            const q = search.toLowerCase().trim();

            if (q && !h.includes(q) && !a.includes(q) && !l.includes(q)) {
                return false;
            }

            if (filter === 'live') {
                return item.isLive;
            } else if (filter === 'coupon_live') {
                return item.couponInfo !== null;
            } else if (filter === 'finished') {
                return item.isFinished;
            } else if (filter === 'major') {
                const majorKeywords = ['şampiyonlar', 'champions', 'premier', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'süper lig', 'avrupa', 'konferans'];
                return majorKeywords.some(kw => l.includes(kw));
            }

            // 'all': Canlılar en başta, ardından kupondakiler ve bitenler
            return true;
        });

        // Canlı maçları her zaman en üste sırala
        filteredList.sort((a, b) => {
            if (a.isLive && !b.isLive) return -1;
            if (!a.isLive && b.isLive) return 1;
            if (a.couponInfo && !b.couponInfo) return -1;
            if (!a.couponInfo && b.couponInfo) return 1;
            return 0;
        });

        return `
            <div class="live-matches-view-container animate-fade-in">
                <!-- Üst Hızlı Kupon Navigasyon Şeridi -->
                <div class="live-header-shortcuts">
                    <div class="lhs-left">
                        <span class="lhs-badge">🔴 CANLI SKOR MASASI</span>
                        <span class="lhs-text">Tüm liglerin anlık maç skorları, canlı dakika ve kupondaki maç durumları</span>
                    </div>
                    <div class="lhs-actions">
                        <button class="btn btn-outline btn-xs" id="btn-jump-to-all-coupons" title="Günün tüm hazır kuponlarını görüntüle">
                            🌐 Tüm Kuponlar
                        </button>
                        <button class="btn btn-primary btn-xs" id="btn-jump-to-won-coupons" title="Kazanan ve tutan kuponlara git" style="background:#10B981;border-color:#10B981;color:#fff;">
                            ✅ Tutan Kuponlar
                        </button>
                        <button class="btn btn-outline btn-xs" id="btn-jump-to-lost-coupons" title="Yatan kuponlara git" style="border-color:rgba(239,68,68,0.5);color:#EF4444;">
                            ❌ Yatan Kuponlar
                        </button>
                        <button class="btn btn-ghost btn-xs" id="btn-jump-to-dashboard" title="Dashboard bültenine dön">
                            🏠 Bültene Git ➔
                        </button>
                    </div>
                </div>

                <!-- Live Hero Banner -->
                <div class="live-hero-banner">
                    <div class="live-hero-top">
                        <div class="live-hero-title-group">
                            <div class="live-status-pill-group">
                                <span class="live-pulsing-badge">
                                    <span class="pulse-ring"></span>
                                    🔴 CANLI MAÇLAR VE ANLIK SKORLAR
                                </span>
                                ${isPollingActive ? '<span class="live-auto-pill">⏱️ Otomatik Takip: 30 sn 🟢</span>' : '<span class="live-auto-pill inactive">⚪ Manuel Takip</span>'}
                            </div>
                            <h2 class="live-hero-title">Canlı Karşılaşmalar, Skor Değişimleri & Kupon İsabetleri</h2>
                            <p class="live-hero-desc">
                                Dünyadaki canlı maç skorlarını, kuponlarınızdaki maçların anlık durumlarını ve yapay zekanın canlı tahminlerini bu ekrandan takip edin.
                            </p>
                        </div>

                        <div class="live-hero-actions">
                            <button class="btn btn-primary" id="btn-sync-live-scores" title="Canlı skor API'sini tara ve verileri tazele">
                                🔄 Canlı Skorları Güncelle
                            </button>
                            <button class="btn btn-ghost" id="btn-open-score-editor-live" title="Maç skorunu kendiniz elle düzenleyin">
                                ✏️ Skor Düzenle
                            </button>
                        </div>
                    </div>

                    <!-- Canlı Metrik Sayaç Kartları -->
                    <div class="live-metrics-grid">
                        <div class="live-metric-card ${liveCount > 0 ? 'highlight-live' : ''}">
                            <div class="lmc-top">
                                <span class="lmc-icon">🔴</span>
                                <span class="lmc-label">CANLI OYNANAN</span>
                            </div>
                            <div class="lmc-value">${liveCount}</div>
                            <span class="lmc-sub">Şu an devam eden maç</span>
                        </div>

                        <div class="live-metric-card">
                            <div class="lmc-top">
                                <span class="lmc-icon">⚡</span>
                                <span class="lmc-label">KUPONDAKİ MAÇLAR</span>
                            </div>
                            <div class="lmc-value" style="color:var(--accent-cyan);">${couponLiveCount}</div>
                            <span class="lmc-sub">Hazır kuponlardaki tercihler</span>
                        </div>

                        <div class="live-metric-card">
                            <div class="lmc-top">
                                <span class="lmc-icon">🏁</span>
                                <span class="lmc-label">BİTEN MAÇLAR</span>
                            </div>
                            <div class="lmc-value" style="color:var(--accent-green);">${finishedCount}</div>
                            <span class="lmc-sub">Resmi sonuçlanan (MS)</span>
                        </div>

                        <div class="live-metric-card">
                            <div class="lmc-top">
                                <span class="lmc-icon">📅</span>
                                <span class="lmc-label">BEKLEYEN MAÇLAR</span>
                            </div>
                            <div class="lmc-value" style="color:var(--text-muted);">${pendingCount}</div>
                            <span class="lmc-sub">Günün başlayacak maçları</span>
                        </div>
                    </div>

                    <!-- Canlı Menü Filtre Sekmeleri & Arama -->
                    <div class="live-filter-strip">
                        <div class="live-tabs">
                            <button class="live-tab-btn ${filter === 'all' ? 'active' : ''}" data-live-filter="all">
                                🌐 Tüm Maçlar (${combinedList.length})
                            </button>
                            <button class="live-tab-btn ${filter === 'live' ? 'active' : ''}" data-live-filter="live" style="color:#EF4444;font-weight:700;">
                                🔴 Canlı Oynananlar (${liveCount})
                            </button>
                            <button class="live-tab-btn ${filter === 'coupon_live' ? 'active' : ''}" data-live-filter="coupon_live" style="color:var(--accent-cyan);font-weight:700;">
                                ⚡ Kupondaki Maçlar (${couponLiveCount})
                            </button>
                            <button class="live-tab-btn ${filter === 'major' ? 'active' : ''}" data-live-filter="major">
                                🏆 Büyük Ligler & Avrupa
                            </button>
                            <button class="live-tab-btn ${filter === 'finished' ? 'active' : ''}" data-live-filter="finished">
                                🏁 Sonuçlananlar (${finishedCount})
                            </button>
                        </div>

                        <div class="live-search-wrap">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="live-search-input" placeholder="Canlı maç veya lig ara..." value="${Helpers.escapeHtml(search)}" autocomplete="off">
                        </div>
                    </div>
                </div>

                <!-- Canlı Maç Listesi Izgarası -->
                <div class="live-matches-grid-container">
                    ${filteredList.length === 0 ? `
                        <div class="empty-live-state">
                            <span class="empty-icon">🔴</span>
                            <h3>${filter === 'live' ? 'Şu Anda Canlı Oynanan Maç Bulunmuyor' : 'Filtreye Uygun Karşılaşma Bulunamadı'}</h3>
                            <p>
                                ${filter === 'live' 
                                    ? 'Bültendeki maçlar henüz başlamamış olabilir veya maç sonu olarak tescillenmiştir. Günün tüm maçlarını ve hazır kuponları aşağıdaki butonlardan inceleyebilirsiniz.' 
                                    : 'Arama teriminizi değiştirerek veya tüm maçları seçerek karşılaşmaları listeleyebilirsiniz.'}
                            </p>
                            <div class="empty-live-actions">
                                <button class="btn btn-primary btn-sm" id="btn-empty-live-all" data-live-filter="all">
                                    🌐 Tüm Maçları Listele
                                </button>
                                <button class="btn btn-outline btn-sm" id="btn-empty-live-coupons">
                                    🤖 Günün Kuponlarına Git
                                </button>
                                <button class="btn btn-outline btn-sm" id="btn-empty-live-sync">
                                    🔄 Canlı Skorları Tekrar Çek
                                </button>
                            </div>
                        </div>
                    ` : `
                        <div class="live-matches-grid">
                            ${filteredList.map(item => this.renderLiveMatchCard(item)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Tekil Canlı Maç Kartı
     */
    renderLiveMatchCard(item) {
        const m = item.match;
        const s = item.scoreData;
        const isLive = item.isLive;
        const isFinished = item.isFinished;
        const cInfo = item.couponInfo;
        const top = item.topPick;

        // Durum rozeti
        let statusBadgeHtml = '';
        if (isLive) {
            statusBadgeHtml = `
                <span class="live-badge-card in-play">
                    <span class="live-dot-blink"></span>
                    ${s.minute || 'CANLI'}
                </span>
            `;
        } else if (isFinished) {
            statusBadgeHtml = `<span class="live-badge-card finished">🏁 BİTTİ (MS)</span>`;
        } else {
            statusBadgeHtml = `<span class="live-badge-card pending">⏰ ${m.timeStr || 'Başlamadı'}</span>`;
        }

        // Kupon bağlılığı etiketi
        let couponTagHtml = '';
        if (cInfo) {
            const isCouponWinning = cInfo.isWinning;
            couponTagHtml = `
                <div class="lmc-coupon-tag ${isCouponWinning ? 'tag-winning' : 'tag-risky'}">
                    <span class="c-tag-icon">${isCouponWinning ? '✅' : '⚠️'}</span>
                    <div class="c-tag-body">
                        <strong>${Helpers.escapeHtml(cInfo.couponTitle)}</strong>: 
                        <span>Tercih: <strong>${Helpers.escapeHtml(cInfo.pickTitle)}</strong> (${cInfo.odd})</span> · 
                        <span class="c-tag-status">${isCouponWinning ? 'Şu An İsabetli / Önde' : 'Riskte / Geride'}</span>
                    </div>
                </div>
            `;
        }

        // Ortak oranlar şeridi
        const odds = m.commonOdds || m.odds || {};
        const oddsHtml = `
            <div class="lmc-odds-strip">
                <span class="lmc-odd-chip" title="Maç Sonucu 1 (Ev Sahibi)">1: <strong>${odds.ms1 ? Number(odds.ms1).toFixed(2) : '—'}</strong></span>
                <span class="lmc-odd-chip" title="Beraberlik">X: <strong>${odds.msX ? Number(odds.msX).toFixed(2) : '—'}</strong></span>
                <span class="lmc-odd-chip" title="Maç Sonucu 2 (Deplasman)">2: <strong>${odds.ms2 ? Number(odds.ms2).toFixed(2) : '—'}</strong></span>
                <span class="lmc-odd-chip" title="2.5 Gol Üstü">2.5 Ü: <strong>${odds.over25 ? Number(odds.over25).toFixed(2) : '—'}</strong></span>
                <span class="lmc-odd-chip" title="Karşılıklı Gol Var">KG: <strong>${odds.bttsYes ? Number(odds.bttsYes).toFixed(2) : '—'}</strong></span>
            </div>
        `;

        return `
            <div class="live-match-card ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''} ${cInfo ? 'has-coupon' : ''}" 
                 data-match-id="${m.id}" 
                 data-match-key="${item.key}">
                
                <!-- Üst Lig ve Durum Satırı -->
                <div class="lmc-top-bar">
                    <div class="lmc-league-group">
                        <span class="lmc-league-name">⚽ ${Helpers.escapeHtml(m.league || 'Futbol')}</span>
                        <span class="lmc-time">${m.timeStr || ''}</span>
                    </div>
                    <div class="lmc-status-wrap">
                        ${statusBadgeHtml}
                    </div>
                </div>

                <!-- Takımlar ve Skor Alanı -->
                <div class="lmc-teams-box">
                    <div class="lmc-team home">
                        <span class="team-name" title="${Helpers.escapeHtml(m.homeTeam)}">${Helpers.escapeHtml(m.homeTeam)}</span>
                    </div>

                    <div class="lmc-score-display ${isLive ? 'score-live' : ''}">
                        <span class="score-digit home">${s.homeScore}</span>
                        <span class="score-divider">-</span>
                        <span class="score-digit away">${s.awayScore}</span>
                    </div>

                    <div class="lmc-team away">
                        <span class="team-name" title="${Helpers.escapeHtml(m.awayTeam)}">${Helpers.escapeHtml(m.awayTeam)}</span>
                    </div>
                </div>

                <!-- Kupon Durum Şeridi (Eğer Maç Bir Kupondaysa) -->
                ${couponTagHtml}

                <!-- Yapay Zeka En Güvenilir Tercih -->
                ${top ? `
                    <div class="lmc-ai-pick-row">
                        <span class="ai-pick-label">🤖 AI Önerisi:</span>
                        <span class="ai-pick-val"><strong>${Helpers.escapeHtml(top.title)}</strong> (${top.odd || '1.50'})</span>
                        <span class="ai-conf-pill">%${top.confidenceScore || top.probability}% Güven</span>
                    </div>
                ` : ''}

                <!-- Oranlar Şeridi -->
                ${oddsHtml}

                <!-- Aksiyon ve İncele Butonları -->
                <div class="lmc-card-footer">
                    <button class="btn btn-ghost btn-xs btn-open-analysis-modal" data-match-key="${item.key}" title="Detaylı Poisson ve AI Analizini Aç">
                        🔍 AI Analizini Gör
                    </button>
                    <button class="btn btn-outline btn-xs btn-edit-match-score" data-match-key="${item.key}" title="Bu maçın skorunu elle düzenle">
                        ✏️ Skoru Düzenle
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Kuponlardaki maçları hızlı eşleştirme tablosu haline getir
     */
    _buildCouponMatchMap(app) {
        const map = {};
        if (!window.CouponEngine) return map;

        const allCoupons = [
            ...(window.CouponEngine.cachedCoupons || []),
            ...(window.CouponEngine.cachedEuropeanCoupons || []),
            ...(window.CouponEngine.cachedHourlyCoupon ? [window.CouponEngine.cachedHourlyCoupon] : [])
        ];

        allCoupons.forEach(coupon => {
            (coupon.matches || []).forEach(mItem => {
                if (!mItem.match) return;
                const k = window.MatchTracker ? window.MatchTracker.getMatchKey(mItem.match) : `${mItem.match.homeTeam}_vs_${mItem.match.awayTeam}`;
                
                // Skor ve değerlendirme kontrolü
                let isWinning = true;
                if (window.MatchTracker) {
                    const scoreData = window.MatchTracker.getMatchScore(mItem.match);
                    const ev = window.MatchTracker.evaluatePick(mItem, scoreData);
                    isWinning = (ev.status === 'WON' || ev.status === 'LIVE_WINNING');
                }

                map[k] = {
                    couponId: coupon.id,
                    couponTitle: coupon.title || 'Günün Kuponu',
                    pickTitle: mItem.pickTitle || 'Tercih',
                    odd: mItem.odd || '1.50',
                    isWinning
                };
            });
        });

        return map;
    },

    /**
     * Olay dinleyicilerini bağla
     */
    bindEvents(app) {
        const container = document.getElementById('live-matches-container');
        if (!container) return;

        // 1. Canlı Skorları Güncelle
        container.querySelector('#btn-sync-live-scores')?.addEventListener('click', async () => {
            const btn = container.querySelector('#btn-sync-live-scores');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Canlı Skorlar Çekiliyor...';
            }
            Helpers.showToast('🔄 Canlı skorlar API\'den taranıyor...', 'info');

            try {
                if (window.LiveScoreService) {
                    const res = await window.LiveScoreService.syncBulletinMatches(app.matches || []);
                    Helpers.showToast(`✅ Canlı skorlar güncellendi! (${res.matched} maç eşleşti)`, 'success');
                }
                app.loadLiveMatches(this.currentFilter, this.searchQuery);
            } catch (err) {
                console.error('Canlı skor güncelleme hatası:', err);
                Helpers.showToast('⚠️ Canlı skorlar güncellenirken hata oluştu.', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '🔄 Canlı Skorları Güncelle';
                }
            }
        });

        // 2. Skor Düzenle Modalı
        container.querySelectorAll('#btn-open-score-editor-live, .btn-edit-match-score').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.matchKey;
                if (window.CouponPanel) {
                    const allCoupons = [
                        ...(window.CouponEngine?.cachedCoupons || []),
                        ...(window.CouponEngine?.cachedEuropeanCoupons || [])
                    ];
                    CouponPanel.openScoreEditorModal(app, allCoupons, key);
                }
            });
        });

        // 4. Filtre Sekmeleri
        container.querySelectorAll('.live-tab-btn, #btn-empty-live-all').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.liveFilter || 'all';
                this.currentFilter = f;
                app.loadLiveMatches(f, this.searchQuery);
            });
        });

        // 5. Arama Kutusu
        const searchInput = container.querySelector('#live-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce((e) => {
                this.searchQuery = e.target.value;
                app.loadLiveMatches(this.currentFilter, this.searchQuery);
            }, 250));
        }

        // 6. Üst Kısayol Butonları (Tüm Kuponlar, Tutan Kuponlar, Yatan Kuponlar, Dashboard)
        container.querySelector('#btn-jump-to-all-coupons')?.addEventListener('click', () => {
            app.navigate('coupons');
            app.loadDailyCoupons(false, 'all', 'today');
        });

        container.querySelector('#btn-jump-to-won-coupons')?.addEventListener('click', () => {
            app.navigate('coupons');
            app.loadDailyCoupons(false, 'tutan', 'today');
        });

        container.querySelector('#btn-jump-to-lost-coupons')?.addEventListener('click', () => {
            app.navigate('coupons');
            app.loadDailyCoupons(false, 'yatan', 'today');
        });

        container.querySelector('#btn-jump-to-dashboard')?.addEventListener('click', () => {
            app.navigate('dashboard');
        });

        container.querySelector('#btn-empty-live-coupons')?.addEventListener('click', () => {
            app.navigate('coupons');
            app.loadDailyCoupons(false, 'all', 'today');
        });

        container.querySelector('#btn-empty-live-sync')?.addEventListener('click', () => {
            container.querySelector('#btn-sync-live-scores')?.click();
        });

        // 7. Maç Kartına Tıklama -> Analiz Modalı
        container.querySelectorAll('.live-match-card, .btn-open-analysis-modal').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.btn-edit-match-score')) return;
                const card = el.closest('.live-match-card');
                const mid = card?.dataset.matchId;
                const matchObj = (app.matches || []).find(m => String(m.id) === String(mid));
                if (matchObj && typeof app.openMatchAnalysis === 'function') {
                    app.openMatchAnalysis(matchObj);
                }
            });
        });

        // 8. AI Baloncuk Tooltip Etkileşimi
        if (window.AiBubbleTooltip) {
            AiBubbleTooltip.init();
        }
    }
};

// Global dışa aktarım
if (typeof window !== 'undefined') {
    window.LiveMatchesPanel = LiveMatchesPanel;
}
