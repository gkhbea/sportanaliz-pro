/**
 * liveRadarSidebar.js — Kenar Canlı Maç Radarı & Taktiksel Canlı Asistan
 * SportAnaliz Pro — Ekranın sağ kenarında sabit duran, her sayfada açılabilen,
 * canlı maçlarda anlık olarak "NE YAPMALIYIM?" kararını ve acil eylemleri söyleyen kenar çekmecesi.
 */
const LiveRadarSidebar = {
    isOpen: false,
    activeFilter: 'actions-only', // 'actions-only' | 'all-live' | 'signals-only'
    updateInterval: null,

    /**
     * Kenar asistanını başlat ve DOM'a yerleştir
     */
    init() {
        if (document.getElementById('live-radar-sidebar-container')) return;

        const container = document.createElement('div');
        container.id = 'live-radar-sidebar-container';
        container.innerHTML = `
            <!-- Sabit Kenar Tetikleyici Buton -->
            <button id="btn-toggle-live-sidebar" class="live-sidebar-floating-btn" title="Canlı Maç Asistanı & Radarı Aç">
                <span class="pulse-indicator"></span>
                <span class="btn-icon">📡</span>
                <span class="btn-text">CANLI ASİSTAN</span>
                <span class="live-count-badge" id="sidebar-live-count">0</span>
            </button>

            <!-- Arka Plan Karartma -->
            <div id="live-sidebar-backdrop" class="live-sidebar-backdrop"></div>

            <!-- Sağdan Kayan Çekmece Paneli -->
            <aside id="live-radar-sidebar-panel" class="live-radar-sidebar-panel">
                <div class="sidebar-header">
                    <div class="sidebar-title-area">
                        <div class="sidebar-badge">
                            <span class="pulse-dot"></span>
                            <span>INPLAYFLUX V8 CANLI ASİSTAN</span>
                        </div>
                        <h2 class="sidebar-title">⚡ Canlı Taktik &amp; Eylem Masası</h2>
                        <p class="sidebar-subtitle">Radar baskısına göre "Şimdi Ne Yapmalıyım?" canlı kararları</p>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span id="sidebar-accuracy-pill" style="font-size:0.7rem;background:rgba(16,185,129,0.18);color:#34d399;border:1px solid rgba(16,185,129,0.4);padding:3px 8px;border-radius:12px;font-weight:900;">
                            %92.9 İsabet
                        </span>
                        <button id="btn-close-live-sidebar" class="sidebar-close-btn" title="Kapat">✕</button>
                    </div>
                </div>

                <!-- Filtre Butonları -->
                <div class="sidebar-filters">
                    <button class="s-filter-btn active" data-filter="actions-only" id="sf-actions">
                        🟢 ŞİMDİ OYNA
                    </button>
                    <button class="s-filter-btn" data-filter="all-live" id="sf-all">
                        🔴 Canlılar
                    </button>
                    <button class="s-filter-btn" data-filter="signals-only" id="sf-signals">
                        ⚔️ Sinyaller
                    </button>
                    <button class="s-filter-btn" data-filter="scorecard" id="sf-scorecard" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);">
                        📊 Karne
                    </button>
                </div>

                <!-- Canlı Maç Listesi / Karne -->
                <div class="sidebar-matches-list" id="sidebar-matches-list">
                    <div class="sidebar-loading">
                        <span class="spinner"></span> Canlı radar taranıyor...
                    </div>
                </div>

                <!-- Alt Aksiyon Barı -->
                <div class="sidebar-footer">
                    <button class="btn btn-primary btn-block" id="btn-open-full-radar" style="font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <span>🚀 Geniş Ekran Radara Git</span>
                    </button>
                </div>
            </aside>
        `;

        document.body.appendChild(container);

        this.injectStyles();
        this.bindEvents();
        this.startAutoRefresh();
        this.updateData();
    },

    /**
     * Stilleri sayfaya ekle
     */
    injectStyles() {
        if (document.getElementById('live-radar-sidebar-styles')) return;

        const style = document.createElement('style');
        style.id = 'live-radar-sidebar-styles';
        style.textContent = `
            /* Sabit Kayan Buton */
            .live-sidebar-floating-btn {
                position: fixed;
                right: 0;
                top: 48%;
                transform: translateY(-50%);
                z-index: 999;
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
                border: 1px solid rgba(56, 189, 248, 0.4);
                border-right: none;
                border-radius: 16px 0 0 16px;
                padding: 10px 12px 10px 10px;
                color: #ffffff;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                box-shadow: -4px 0 25px rgba(0, 240, 255, 0.25);
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .live-sidebar-floating-btn:hover {
                transform: translateY(-50%) translateX(-4px);
                box-shadow: -6px 0 30px rgba(0, 240, 255, 0.4);
                border-color: #38bdf8;
            }
            .live-sidebar-floating-btn .btn-icon {
                font-size: 1.3rem;
                animation: pulse 2s infinite;
            }
            .live-sidebar-floating-btn .btn-text {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                font-size: 0.72rem;
                font-weight: 900;
                letter-spacing: 1.5px;
                color: #38bdf8;
            }
            .live-sidebar-floating-btn .live-count-badge {
                background: #ef4444;
                color: #fff;
                font-size: 0.68rem;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 10px;
                margin-top: 4px;
            }

            /* Arka Plan */
            .live-sidebar-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            .live-sidebar-backdrop.active {
                opacity: 1;
                visibility: visible;
            }

            /* Çekmece Paneli */
            .live-radar-sidebar-panel {
                position: fixed;
                top: 0;
                right: -460px;
                width: 440px;
                max-width: 92vw;
                height: 100vh;
                background: linear-gradient(180deg, #090e1a 0%, #030712 100%);
                border-left: 1px solid rgba(56, 189, 248, 0.3);
                box-shadow: -10px 0 40px rgba(0, 0, 0, 0.85);
                z-index: 1001;
                display: flex;
                flex-direction: column;
                transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                color: #f8fafc;
            }
            .live-radar-sidebar-panel.active {
                right: 0;
            }

            /* Header */
            .sidebar-header {
                padding: 16px 18px;
                background: rgba(15, 23, 42, 0.85);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
            }
            .sidebar-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(56, 189, 248, 0.12);
                border: 1px solid rgba(56, 189, 248, 0.3);
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 0.68rem;
                color: #38bdf8;
                font-weight: 800;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .sidebar-title {
                font-size: 1.15rem;
                font-weight: 900;
                margin: 0;
                color: #ffffff;
            }
            .sidebar-subtitle {
                font-size: 0.75rem;
                color: #94a3b8;
                margin: 2px 0 0;
            }
            .sidebar-close-btn {
                background: rgba(255, 255, 255, 0.08);
                border: none;
                color: #fff;
                font-size: 1.1rem;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.2s;
            }
            .sidebar-close-btn:hover {
                background: rgba(239, 68, 68, 0.3);
                color: #f87171;
            }

            /* Filtreler */
            .sidebar-filters {
                display: flex;
                gap: 6px;
                padding: 10px 16px;
                background: rgba(2, 6, 23, 0.5);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .s-filter-btn {
                flex: 1;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #94a3b8;
                font-size: 0.74rem;
                font-weight: 800;
                padding: 6px 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: 0.2s;
            }
            .s-filter-btn.active {
                background: rgba(56, 189, 248, 0.2);
                border-color: #38bdf8;
                color: #38bdf8;
            }

            /* Liste Bölümü */
            .sidebar-matches-list {
                flex: 1;
                overflow-y: auto;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            /* Kart Tasarımı */
            .sidebar-match-card {
                background: rgba(15, 23, 42, 0.7);
                border: 1px solid rgba(56, 189, 248, 0.2);
                border-radius: 12px;
                padding: 12px 14px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s, border-color 0.2s;
            }
            .sidebar-match-card:hover {
                border-color: rgba(56, 189, 248, 0.45);
                transform: translateY(-2px);
            }
            .sidebar-match-card.urgent-bet {
                border-left: 4px solid #10b981;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%);
            }

            /* Directive Box */
            .sidebar-directive-box {
                background: rgba(2, 6, 23, 0.85);
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-radius: 8px;
                padding: 10px 12px;
                margin-top: 8px;
            }
            .sidebar-directive-box.watch-box {
                border-color: rgba(245, 158, 11, 0.3);
            }

            /* Footer */
            .sidebar-footer {
                padding: 12px 16px;
                background: rgba(15, 23, 42, 0.95);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
        `;

        document.head.appendChild(style);
    },

    /**
     * Olay Dinleyicileri Bağla
     */
    bindEvents() {
        const btnToggle = document.getElementById('btn-toggle-live-sidebar');
        const btnClose = document.getElementById('btn-close-live-sidebar');
        const backdrop = document.getElementById('live-sidebar-backdrop');
        const btnFull = document.getElementById('btn-open-full-radar');

        if (btnToggle) btnToggle.onclick = () => this.toggle();
        if (btnClose) btnClose.onclick = () => this.close();
        if (backdrop) backdrop.onclick = () => this.close();

        if (btnFull) {
            btnFull.onclick = () => {
                this.close();
                if (window.app && typeof window.app.navigate === 'function') {
                    window.app.navigate('radar');
                }
            };
        }

        // Filtre Butonları
        const filterBtns = document.querySelectorAll('.s-filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.filter;
                this.updateData();
            };
        });
    },

    /**
     * Çekmeceyi Aç / Kapat
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    open() {
        this.isOpen = true;
        document.getElementById('live-radar-sidebar-panel')?.classList.add('active');
        document.getElementById('live-sidebar-backdrop')?.classList.add('active');
        this.updateData();
    },

    close() {
        this.isOpen = false;
        document.getElementById('live-radar-sidebar-panel')?.classList.remove('active');
        document.getElementById('live-sidebar-backdrop')?.classList.remove('active');
    },

    /**
     * Otomatik Yenileme
     */
    startAutoRefresh() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            this.updateData();
        }, 120000);
    },

    /**
     * Verileri Güncelle ve Render Et
     */
    updateData() {
        const app = window.app;
        let targetList = [];

        if (window.LiveScoreService && typeof LiveScoreService.getAllMatchesCombined === 'function') {
            targetList = LiveScoreService.getAllMatchesCombined(app?.matches || []);
        } else {
            const allMatches = app?.matches || [];
            const liveMatches = app?.liveMatches || (window.LiveScoreService?.cachedScores || []);
            targetList = [...liveMatches];
            allMatches.forEach(m => {
                if (!targetList.some(lm => (lm.homeTeam === m.homeTeam && lm.awayTeam === m.awayTeam))) {
                    targetList.push(m);
                }
            });
            if (targetList.length === 0) targetList = allMatches;
        }

        // Sadece Futbol Maçlarını Dahil Et
        if (window.LiveScoreService && typeof LiveScoreService.isStrictFootballMatch === 'function') {
            targetList = targetList.filter(m => LiveScoreService.isStrictFootballMatch(m));
        }

        // Eğer kenar çubuğu açık değilse, sadece canlı maç sayısını güncelle ve ağır DOM hesaplamalarını atla
        const liveCount = targetList.filter(m => m.isLive || m.status === 'LIVE' || (m.liveScore && m.liveScore.isLive)).length;
        const badgeEl = document.getElementById('sidebar-live-count');
        if (badgeEl) badgeEl.textContent = liveCount;

        if (!this.isOpen) return;

        const processed = window.InplayFluxRadarEngine ? InplayFluxRadarEngine.scanLiveMatches(targetList) : [];
        const liveOnly = processed.filter(m => m.isLive);

        // Skor Senkronizasyonu
        if (window.LiveAssistantTrackerService) {
            LiveAssistantTrackerService.syncWithFinishedMatches(app);
            const perf = LiveAssistantTrackerService.getPerformanceMetrics();
            const pill = document.getElementById('sidebar-accuracy-pill');
            if (pill) pill.textContent = `%${perf.winRate} İsabet`;
        }

        // Doğruluk Karnesi Görünümü
        if (this.activeFilter === 'scorecard') {
            const container = document.getElementById('sidebar-matches-list');
            if (container && window.LiveAssistantTrackerService) {
                container.innerHTML = LiveAssistantTrackerService.renderScorecardHtml();
            }
            return;
        }

        // Filtrele
        let displayList = [];
        if (this.activeFilter === 'actions-only') {
            displayList = processed.filter(m => m.isLive && m.liveDirective?.status === 'BET_NOW');
            if (displayList.length === 0) displayList = liveOnly;
        } else if (this.activeFilter === 'signals-only') {
            displayList = processed.filter(m => m.isLive && m.signals && m.signals.length > 0);
            if (displayList.length === 0) displayList = liveOnly;
        } else {
            displayList = liveOnly.length > 0 ? liveOnly : processed.slice(0, 10);
        }

        this.renderMatches(displayList);
    },

    /**
     * Maç Kartlarını Render Et
     */
    renderMatches(matches) {
        const container = document.getElementById('sidebar-matches-list');
        if (!container) return;

        if (!matches || matches.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 16px;color:#94a3b8;">
                    <div style="font-size:2.2rem;margin-bottom:8px;">📡</div>
                    <div style="font-weight:800;color:#fff;font-size:0.95rem;">Şu Anda Aktif Canlı Alarm Yok</div>
                    <div style="font-size:0.75rem;margin-top:4px;">Canlı maçlar başladığında ve baskı endeksi yükseldiğinde anlık 'ŞİMDİ OYNA' kararları burada listelenecektir.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = matches.map(m => this.renderMatchCard(m)).join('');
    },

    /**
     * Tek Bir Canlı Eylem Kartı
     */
    renderMatchCard(m) {
        const dir = m.liveDirective || {};
        const isBetNow = dir.status === 'BET_NOW';
        const cardClass = isBetNow ? 'sidebar-match-card urgent-bet' : 'sidebar-match-card';
        const appiMax = Math.max(m.appi.home, m.appi.away);

        // Sinyal Rozetleri
        const signalsHtml = (m.signals || []).map(s => `
            <span style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;font-size:0.65rem;padding:1px 6px;border-radius:4px;font-weight:800;">
                ${s.short}
            </span>
        `).join(' ');

        return `
        <div class="${cardClass}">
            <!-- Üst Bar: Dakika & Skor -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#f87171;font-size:0.72rem;font-weight:900;padding:1px 6px;border-radius:4px;">
                        🔴 ${m.minuteStr}
                    </span>
                    <span style="font-size:0.72rem;color:#94a3b8;">${m.league}</span>
                </div>
                <div style="font-size:1.1rem;font-weight:900;color:#ffffff;letter-spacing:1px;">
                    ${m.scoreStr}
                </div>
            </div>

            <!-- Takımlar -->
            <div style="font-size:0.88rem;font-weight:800;color:#f8fafc;margin-bottom:6px;">
                ${m.homeTeam} <span style="color:#64748b;font-weight:400;">vs</span> ${m.awayTeam}
            </div>

            <!-- APPI Baskı Çubuğu -->
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:#94a3b8;margin-bottom:2px;">
                    <span>APPI Baskı Skoru: <strong style="color:#38bdf8;">${m.appi.home}</strong> vs <strong style="color:#a78bfa;">${m.appi.away}</strong></span>
                    <span>${signalsHtml}</span>
                </div>
                <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;display:flex;">
                    <div style="width:${m.appi.home}%;background:#38bdf8;"></div>
                    <div style="width:${m.appi.away}%;background:#a78bfa;"></div>
                </div>
            </div>

            <!-- ⚡ "NE YAPMALIYIM?" KARAR KUTUSU -->
            <div class="sidebar-directive-box ${isBetNow ? '' : 'watch-box'}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="font-size:0.7rem;color:${dir.badgeColor};font-weight:900;text-transform:uppercase;">
                        ${dir.badge}
                    </span>
                    <span style="font-size:0.68rem;background:rgba(255,255,255,0.1);color:#cbd5e1;padding:1px 5px;border-radius:4px;font-weight:700;">
                        ⭐ %${dir.confidence} Güven
                    </span>
                </div>

                <div style="font-size:0.84rem;font-weight:900;color:#ffffff;margin-bottom:4px;">
                    🎯 ${dir.title}
                </div>

                <div style="font-size:0.75rem;color:#cbd5e1;line-height:1.4;">
                    ${dir.actionText}
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:0.7rem;color:#38bdf8;font-weight:700;">
                        Önerilen Market: <strong>${dir.market}</strong>
                    </span>
                    <button class="btn btn-xs btn-outline" onclick="if(window.SquadAnalysisModal) SquadAnalysisModal.open(${JSON.stringify(m.rawMatch || m).replace(/"/g, '&quot;')})" style="font-size:0.68rem;padding:2px 6px;border-color:rgba(56,189,248,0.3);color:#38bdf8;">
                        👥 11'ler
                    </button>
                </div>
            </div>
        </div>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.LiveRadarSidebar = LiveRadarSidebar;
}
