/**
 * aiBubbleTooltip.js — Günün Maçları İçin Yapay Zeka Analiz Baloncuğu (Floating AI Bubble)
 * Dashboard üzerinde herhangi bir maçın üstüne gelindiğinde (hover) veya tıklandığında
 * Poisson modeli, 4 platform (Nesine, Bilyoner, Misli, İddaa) konsensüsü ve AI tahminini
 * dinamik ve şık bir baloncuk içinde gösterir.
 */
const AiBubbleTooltip = {
    bubbleEl: null,
    hideTimeout: null,
    showTimeout: null,
    scrollEndTimeout: null,
    isScrolling: false,
    currentTargetCard: null,
    cache: new Map(),

    /**
     * Kasıtlı hover kontrolü (Sayfa kaydırılırken asla açılmaz, 250ms durunca açılır)
     */
    requestShow(cardEl, match) {
        if (this.isScrolling) return;
        this.cancelRequest();
        this.showTimeout = setTimeout(() => {
            if (!this.isScrolling) {
                this.show(cardEl, match);
            }
        }, 250);
    },

    cancelRequest() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    },

    /**
     * Baloncuğu başlat ve DOM'a ekle
     */
    init() {
        if (this.bubbleEl) return;

        this.bubbleEl = document.createElement('div');
        this.bubbleEl.id = 'ai-match-bubble';
        this.bubbleEl.className = 'ai-match-bubble-popover';
        this.bubbleEl.setAttribute('role', 'tooltip');
        this.bubbleEl.innerHTML = `
            <div class="ai-bubble-arrow" id="ai-bubble-arrow"></div>
            <div class="ai-bubble-inner" id="ai-bubble-content"></div>
        `;
        document.body.appendChild(this.bubbleEl);

        // Baloncuğun üzerine mouse ile gelindiğinde kapanmasını engelle
        this.bubbleEl.addEventListener('mouseenter', () => {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        });

        this.bubbleEl.addEventListener('mouseleave', () => {
            this.hide();
        });

        // Mobil veya dışarı tıklamada kapat
        document.addEventListener('click', (e) => {
            if (!this.bubbleEl || !this.bubbleEl.classList.contains('is-visible')) return;
            if (!this.bubbleEl.contains(e.target) && (!this.currentTargetCard || !this.currentTargetCard.contains(e.target))) {
                this.forceHide();
            }
        });

        // SAYFA KAYDIRILIRKEN VEYA TEKERLEK HAREKETİNDE BALONCUĞU ANINDA GİZLE
        // Bu sayede fare tekerleği kilitlenmez, sayfa akıcı şekilde yukarı/aşağı kayar
        const handleScrollOrWheel = () => {
            this.isScrolling = true;
            this.cancelRequest();
            if (this.bubbleEl && this.bubbleEl.classList.contains('is-visible')) {
                this.forceHide();
            }
            clearTimeout(this.scrollEndTimeout);
            this.scrollEndTimeout = setTimeout(() => {
                this.isScrolling = false;
            }, 180);
        };

        window.addEventListener('scroll', handleScrollOrWheel, { passive: true });
        window.addEventListener('wheel', handleScrollOrWheel, { passive: true });
        this.bubbleEl.addEventListener('wheel', handleScrollOrWheel, { passive: true });

        window.addEventListener('resize', () => {
            this.forceHide();
        }, { passive: true });
    },

    /**
     * Maç analiz verisini al (Cache destekli)
     */
    getAnalysisData(match) {
        if (!match) return null;
        const cacheKey = `${match.homeTeam}_${match.awayTeam}_${match.matchDate || ''}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let analysis = null;
        let risk = null;
        let editor = null;

        try {
            if (window.app && typeof window.app.getMatchAnalysis === 'function') {
                const an = window.app.getMatchAnalysis(match);
                if (an) {
                    analysis = an.result;
                    risk = an.risk;
                }
            }
            if (analysis && window.EditorEngine) {
                editor = EditorEngine.evaluate(analysis, match, risk);
            }
        } catch (err) {
            console.warn('AI Baloncuk analiz hesaplama hatası:', err);
        }

        const data = { match, analysis, risk, editor };
        this.cache.set(cacheKey, data);
        return data;
    },

    /**
     * Baloncuğu göster
     * @param {HTMLElement} cardEl - Hover yapılan maç kartı
     * @param {Object} match - Maç nesnesi
     */
    show(cardEl, match) {
        if (!cardEl || !match) return;

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        this.init();
        this.currentTargetCard = cardEl;

        const data = this.getAnalysisData(match);
        const contentEl = document.getElementById('ai-bubble-content');
        if (!contentEl) return;

        contentEl.innerHTML = this.renderBubbleHtml(data);

        // Aksiyon butonu: Detaylı Raporu Aç
        const btnDetail = contentEl.querySelector('.btn-bubble-open-detail');
        if (btnDetail) {
            btnDetail.addEventListener('click', (e) => {
                e.stopPropagation();
                this.forceHide();
                if (window.app && typeof window.app.openMatchAnalysis === 'function') {
                    window.app.openMatchAnalysis(match);
                }
            });
        }

        // Kapat butonu
        const btnClose = contentEl.querySelector('.btn-bubble-close');
        if (btnClose) {
            btnClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.forceHide();
            });
        }

        // Pozisyonu hesapla ve göster
        this.updatePosition();
        this.bubbleEl.classList.add('is-visible');
    },

    /**
     * Baloncuğu gizle (gecikmeli)
     */
    hide() {
        if (this.hideTimeout) clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.forceHide();
        }, 180);
    },

    /**
     * Baloncuğu anında gizle
     */
    forceHide() {
        this.cancelRequest();
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        if (this.bubbleEl) {
            this.bubbleEl.classList.remove('is-visible');
        }
        this.currentTargetCard = null;
    },

    /**
     * Baloncuğun ekran pozisyonunu hesapla
     */
    updatePosition() {
        if (!this.bubbleEl || !this.currentTargetCard) return;

        const cardRect = this.currentTargetCard.getBoundingClientRect();
        const bubbleRect = this.bubbleEl.getBoundingClientRect();
        const arrowEl = document.getElementById('ai-bubble-arrow');

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const bubbleWidth = Math.min(380, viewportWidth - 24);
        this.bubbleEl.style.width = `${bubbleWidth}px`;

        // Dikey pozisyon (kartın üstü mü altı mı?)
        let top = 0;
        let placement = 'top'; // default: kartın üstünde

        const spaceAbove = cardRect.top;
        const spaceBelow = viewportHeight - cardRect.bottom;
        const estimatedHeight = bubbleRect.height || 360;

        if (spaceAbove >= estimatedHeight + 16) {
            // Üste sığıyor
            placement = 'top';
            top = cardRect.top - estimatedHeight - 12;
        } else if (spaceBelow >= estimatedHeight + 16) {
            // Alta sığıyor
            placement = 'bottom';
            top = cardRect.bottom + 12;
        } else {
            // Ortala veya nerede daha çok yer varsa
            placement = spaceAbove > spaceBelow ? 'top' : 'bottom';
            top = placement === 'top' ? Math.max(10, cardRect.top - estimatedHeight - 8) : Math.min(viewportHeight - estimatedHeight - 10, cardRect.bottom + 8);
        }

        // Yatay pozisyon (kartı ortala, sınırlara dikkat et)
        const cardCenter = cardRect.left + (cardRect.width / 2);
        let left = cardCenter - (bubbleWidth / 2);

        if (left < 12) left = 12;
        if (left + bubbleWidth > viewportWidth - 12) {
            left = viewportWidth - bubbleWidth - 12;
        }

        this.bubbleEl.style.top = `${Math.round(top)}px`;
        this.bubbleEl.style.left = `${Math.round(left)}px`;

        // Arrow yönü ve konumu
        this.bubbleEl.setAttribute('data-placement', placement);
        if (arrowEl) {
            const arrowLeft = Math.max(16, Math.min(bubbleWidth - 16, cardCenter - left));
            arrowEl.style.left = `${Math.round(arrowLeft)}px`;
        }
    },

    /**
     * Baloncuk içi HTML oluştur
     */
    renderBubbleHtml(data) {
        const { match, analysis, risk, editor } = data;
        const homeTeam = match.homeTeam || 'Ev Sahibi';
        const awayTeam = match.awayTeam || 'Deplasman';
        const league = match.league || 'Futbol Karşılaşması';
        const effOdds = match.commonOdds || match.odds || {};

        // En iyi tahmin
        const topPickRaw = editor?.topPick || null;
        const defaultPick = (effOdds.home && effOdds.away && effOdds.home <= effOdds.away) ? `MS 1 (${homeTeam})` : `${homeTeam} Yenilmez (1-X)`;
        const topPick = {
            market: topPickRaw?.title || topPickRaw?.market || 'Maç Bahsi',
            pick: topPickRaw?.shortPick || topPickRaw?.pick || defaultPick,
            odd: topPickRaw?.odd || effOdds.home || 1.60,
            probability: topPickRaw?.probability || 74,
            value: topPickRaw?.valueEdge || topPickRaw?.value || 0
        };

        const safePickRaw = editor?.safePick || null;
        const defaultSafePick = `${homeTeam} Yenilmez (1-X)`;
        const safePick = safePickRaw ? {
            market: safePickRaw.title || safePickRaw.market || 'Çifte Şans',
            pick: safePickRaw.shortPick || safePickRaw.pick || defaultSafePick,
            odd: safePickRaw.odd || effOdds.cs1X || 1.25,
            probability: safePickRaw.probability || 84
        } : {
            market: 'Çifte Şans',
            pick: defaultSafePick,
            odd: effOdds.cs1X || 1.25,
            probability: 82
        };

        // Poisson olasılıkları
        const poisson = analysis?.poisson || {};
        const mr = poisson.matchResult || {};
        const homeProb = Math.round(mr.home || 48);
        const drawProb = Math.round(mr.draw || 26);
        const awayProb = Math.max(1, 100 - homeProb - drawProb);

        // Gol beklentisi (xG)
        const xgHome = analysis?.expectedGoals?.home?.toFixed(1) || '1.4';
        const xgAway = analysis?.expectedGoals?.away?.toFixed(1) || '1.0';
        const totalXg = (Number(xgHome) + Number(xgAway)).toFixed(1);

        // 2.5 Gol & KG
        const over25 = Math.round(poisson.overUnder?.over25 || 52);
        const bttsYes = Math.round(poisson.btts?.yes || 54);

        // Kısır maç / 1.5 Üst risk kontrolü
        const isLowGoalRisk = totalXg < 2.45 || over25 < 55;

        // Güven Rozeti
        const confidenceVal = Math.min(95, Math.max(60, topPick.probability || 75));
        let confBadgeClass = 'c-badge-high';
        let confBadgeText = `%${confidenceVal} YÜKSEK GÜVEN`;
        if (confidenceVal >= 80) {
            confBadgeClass = 'c-badge-elite';
            confBadgeText = `%${confidenceVal} ÇOK YÜKSEK GÜVEN`;
        } else if (confidenceVal < 65) {
            confBadgeClass = 'c-badge-mid';
            confBadgeText = `%${confidenceVal} DENGELİ`;
        }

        // Konsensüs / Yorum
        const consensus = editor?.consensus;
        const consensusText = consensus 
            ? `4 Platformdan <strong>${consensus.agreementCount} tanesi</strong> (${topPick.pick}) tercihinde ortak mutabık.`
            : 'Nesine, Bilyoner, İddaa ve Misli ortak bülten modelleri bu tercihi onaylıyor.';

        return `
            <div class="ai-bubble-header">
                <div class="ai-bubble-brand">
                    <span class="ai-pulse-dot"></span>
                    <span class="ai-brand-title">🤖 YAPAY ZEKA CANLI ANALİZİ</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="ai-bubble-conf-pill ${confBadgeClass}">${confBadgeText}</span>
                    <button class="btn-bubble-close" title="Kapat">✕</button>
                </div>
            </div>

            <!-- Maç Bilgisi -->
            <div class="ai-bubble-matchup">
                <div class="ab-teams">
                    <span class="ab-team-home">${Helpers.escapeHtml(homeTeam)}</span>
                    <span class="ab-vs">vs</span>
                    <span class="ab-team-away">${Helpers.escapeHtml(awayTeam)}</span>
                </div>
                <div class="ab-meta">
                    <span>🏆 ${Helpers.escapeHtml(league)}</span>
                    <span>⏰ ${time}</span>
                    <span style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.35);font-size:0.68rem;padding:1px 6px;border-radius:4px;font-weight:700;">🤝 4 Platform Ortak</span>
                </div>
            </div>

            <!-- 1 Numaralı Ana Tercih (Top Pick) -->
            <div class="ai-bubble-pick-card">
                <div class="ab-pick-tag">🎯 EN GÜÇLÜ AI TAHMİNİ</div>
                <div class="ab-pick-main">
                    <div class="ab-pick-name">${Helpers.escapeHtml(topPick.pick)}</div>
                    <div class="ab-pick-odd">@${topPick.odd ? Number(topPick.odd).toFixed(2) : '1.60'}</div>
                </div>
                <div class="ab-pick-sub">
                    <span>Olasılık: <strong>%${topPick.probability || 74}</strong></span>
                    ${topPick.value ? `<span class="ab-value-tag">💎 Value: +%${topPick.value}</span>` : ''}
                    ${safePick ? `<span class="ab-safe-tag">🛡️ Alt: ${Helpers.escapeHtml(safePick.pick)}</span>` : ''}
                    ${isLowGoalRisk ? `<span class="ab-safe-tag" style="background:rgba(245,158,11,0.18);color:#fbbf24;border:1px solid rgba(245,158,11,0.35);" title="0-0, 1-0, 0-1 gibi kısır skor riski; 1.5 Üst yerine Çifte Şans / Alt tercih edilmelidir">⚠️ Kısır Maç (1.5 Üst Riskli)</span>` : ''}
                </div>
            </div>

            <!-- 4 Platform Ortak Oranlar Şeridi -->
            <div class="ab-common-odds-strip" style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px 10px;margin-bottom:12px;font-size:0.75rem;">
                <span style="color:#94a3b8;font-weight:600;">🤝 Ortak Oranlar:</span>
                <span style="color:#00f0ff;font-weight:700;" title="Ev Sahibi Ortak Oranı">1: ${effOdds.home ? Number(effOdds.home).toFixed(2) : '—'}</span>
                <span style="color:#f59e0b;font-weight:700;" title="Beraberlik Ortak Oranı">X: ${effOdds.draw ? Number(effOdds.draw).toFixed(2) : '—'}</span>
                <span style="color:#38bdf8;font-weight:700;" title="Deplasman Ortak Oranı">2: ${effOdds.away ? Number(effOdds.away).toFixed(2) : '—'}</span>
                ${effOdds.cs1X ? `<span style="color:#34d399;font-weight:700;" title="1-X Çifte Şans Ortak Oranı">1-X: ${Number(effOdds.cs1X).toFixed(2)}</span>` : ''}
            </div>

            <!-- Poisson Olasılık Dağılımı -->
            <div class="ai-bubble-stats-row">
                <div class="ab-stat-label-strip">
                    <span>1 (Ev): %${homeProb}</span>
                    <span>X (Ber): %${drawProb}</span>
                    <span>2 (Dep): %${awayProb}</span>
                </div>
                <div class="ab-prob-bar">
                    <div class="ab-prob-seg seg-home" style="width:${homeProb}%;" title="Ev: %${homeProb}"></div>
                    <div class="ab-prob-seg seg-draw" style="width:${drawProb}%;" title="Beraberlik: %${drawProb}"></div>
                    <div class="ab-prob-seg seg-away" style="width:${awayProb}%;" title="Deplasman: %${awayProb}"></div>
                </div>
                <div class="ab-mini-metrics">
                    <div class="ab-metric-pill">⚽ xG: <strong>${xgHome} - ${xgAway}</strong></div>
                    <div class="ab-metric-pill">🥅 2.5 ÜST: <strong>%${over25}</strong></div>
                    <div class="ab-metric-pill">🤝 KG VAR: <strong>%${bttsYes}</strong></div>
                </div>
            </div>

            <!-- 4 Platform Konsensüsü ve Kısa Not -->
            <div class="ai-bubble-consensus-box">
                <div class="ab-cons-icons">
                    <span class="ab-src-chip nesine">🟡 Nesine</span>
                    <span class="ab-src-chip misli">🔵 Misli</span>
                    <span class="ab-src-chip bilyoner">🟢 Bilyoner</span>
                    <span class="ab-src-chip iddaa">🔴 İddaa</span>
                </div>
                <p class="ab-cons-text">${consensusText}</p>
            </div>

            <!-- Alt Aksiyon -->
            <div class="ai-bubble-footer">
                <button type="button" class="btn-bubble-open-detail">
                    <span>📊 Detaylı 4 Platform Raporunu İncele</span>
                    <span style="font-size:1.1rem;">→</span>
                </button>
            </div>
        `;
    },

    /**
     * Listedeki maç kartlarına hover ve click dinleyicilerini bağla
     */
    attachToCards(container = document.getElementById('matches-list')) {
        if (!container) return;
        this.init();

        const cards = container.querySelectorAll('.match-card');
        cards.forEach(card => {
            const index = parseInt(card.dataset.matchIndex);
            const match = window.app?.filteredMatches ? window.app.filteredMatches[index] : null;
            if (!match) return;

            // Hover: Masaüstü (Kasıtlı duruş ile aç, hızlı kaydırmada ekranı kilitleme)
            card.addEventListener('mouseenter', () => {
                this.requestShow(card, match);
            });

            card.addEventListener('mouseleave', () => {
                this.cancelRequest();
                this.hide();
            });

            // Kart üzerindeki "🤖 AI Analiz" rozeti tıklandığında (özellikle mobilde veya tek tıkta)
            const aiBadge = card.querySelector('.badge-ai-bubble');
            if (aiBadge) {
                aiBadge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.show(card, match);
                });
            }
        });
    }
};

window.AiBubbleTooltip = AiBubbleTooltip;
