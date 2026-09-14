/**
 * couponPanel.js — "Benim İçin Bahis Yap" / 4 Hazır Kupon & Gün Sonu Maç Takip UI Paneli
 * Kullanıcı için otomatik oluşturulan kuponları (Garantör, Editör, Gol, Value, Şampiyonlar Ligi, Avrupa Kupaları)
 * ve Gün Sonu Maç Takip Masasını (% Win Rate, Tutan/Yatan Kuponlar, ROI, Canlı Skor Simülasyonu) sunar.
 */
const CouponPanel = {
    /**
     * Kuponların ve Gün Sonu Takip Masasının tamamını render et
     * @param {Array} coupons - Günlük kuponlar
     * @param {Array} euroCoupons - Avrupa kupaları kuponları [ucl1, ucl2, uel, uecl]
     * @param {string} activeFilter - 'all', 'daily', 'ucl', 'uel', 'uecl', 'euro'
     * @returns {string} HTML string
     */
    render(coupons = [], euroCoupons = [], activeFilter = 'all', activeDate = 'today', hourlyCoupon = null) {
        const euroList = Array.isArray(euroCoupons) ? euroCoupons : (euroCoupons ? [euroCoupons] : []);
        const isAllTime = (activeDate === 'all_time' || activeDate === 'all-time');
        const isYesterday = (activeDate === 'yesterday' || activeDate === '2026-09-09');

        // Kümülatif istatistikleri MatchTracker üzerinden 09 Eylül'den başlayarak hesapla
        const cumulativeStats = window.MatchTracker ? window.MatchTracker.calculateCumulativeCouponStats('2026-09-09') : null;

        if (isAllTime) {
            // Tüm Zamanlar (09 Eylül'den Bugüne Kümülatif Görünüm)
            return `
                <div class="coupons-view-container animate-fade-in">
                    <!-- ======================================================== -->
                    <!-- TARİH SEÇİCİ & KUPON ARŞİVİ BARI (BUGÜN / DÜN / TÜMÜ) -->
                    <!-- ======================================================== -->
                    <div class="coupon-date-selector-bar">
                        <div class="c-date-tabs">
                            <button class="c-date-tab" data-target-date="today">
                                <span class="c-date-tab-icon">📅</span>
                                <div class="c-date-tab-text">
                                    <span class="c-date-tab-title">Bugünün Kuponları</span>
                                    <span class="c-date-tab-sub">10 Eylül 2026</span>
                                </div>
                                <span class="c-date-pill live">⚡ CANLI & AKTİF</span>
                            </button>
                            <button class="c-date-tab" data-target-date="yesterday">
                                <span class="c-date-tab-icon">⏪</span>
                                <div class="c-date-tab-text">
                                    <span class="c-date-tab-title">Dünün Kuponları</span>
                                    <span class="c-date-tab-sub">09 Eylül 2026</span>
                                </div>
                                <span class="c-date-pill done">🏁 SONUÇLANDI</span>
                            </button>
                            <button class="c-date-tab active" data-target-date="all_time">
                                <span class="c-date-tab-icon">🌟</span>
                                <div class="c-date-tab-text">
                                    <span class="c-date-tab-title">09 Eylül'den İtibaren</span>
                                    <span class="c-date-tab-sub">Tüm Tutan & Yatan Kuponlar</span>
                                </div>
                                <span class="c-date-pill all-time">🏆 TÜM ZAMANLAR</span>
                            </button>
                        </div>
                        <div class="c-archive-wrap">
                            <span class="c-archive-label">📂 İstatistik & Arşiv:</span>
                            <select id="coupon-archive-select" class="c-archive-select">
                                <option value="all_time" selected>🌟 09 Eylül'den Bugüne (Tüm Zamanlar Kümülatif)</option>
                                <option value="today">10.09.2026 (Bugün - Canlı Bülten)</option>
                                <option value="yesterday">09.09.2026 (Dün - Şampiyonlar Ligi)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Üst Hero Banner -->
                    <div class="coupons-hero hero-all-time">
                        <div class="coupons-hero-top">
                            <div class="coupons-hero-title-group">
                                <span class="coupons-hero-badge">🌟 09 EYLÜL'DEN BUGÜNE TÜM ZAMANLAR · 📊 RESMİ KUPON & MAÇ İSTATİSTİK KARNESİ</span>
                                <h2 class="coupons-hero-title">09 Eylül'den Bugüne Bütün Kuponlar — Tutan & Yatan İstatistikleri</h2>
                                <p class="coupons-hero-desc">
                                    9 Eylül 2026 tarihinden itibaren sistemin ürettiği bütün kuponların resmi sonuçları, tutan (✅) ve yatan (❌) kupon sayıları, maç isabet yüzdeleri ve kasa getirisi. 
                                    <strong>UEFA Şampiyonlar Ligi</strong>, <strong>Avrupa Ligi</strong>, <strong>Konferans Ligi</strong> ve günlük 4 AI kuponunun (Kasa Katlama, Editör, Gol, Value) kümülatif başarısı.
                                </p>
                            </div>
                            <div class="coupons-hero-actions">
                                <button class="btn btn-primary" id="btn-switch-today" title="Bugünün canlı bülten kuponlarına geç">
                                    📅 Bugünün Canlı Kuponlarına Git
                                </button>
                                <button class="btn btn-outline" id="btn-switch-yesterday" title="09 Eylül dünün kuponlarına git">
                                    ⏪ 09 Eylül Arşivine Git
                                </button>
                            </div>
                        </div>

                        <!-- ======================================================== -->
                        <!-- KÜMÜLATİF KUPON & MAÇ TAKİP MASASI (09 EYLÜL'DEN BUGÜNE) -->
                        <!-- ======================================================== -->
                        ${this.renderCumulativeDashboard(cumulativeStats)}
                    </div>

                    <!-- Tarih Bazlı Kupon Listeleri (09 Eylül'den İtibaren Gün Gün Gruplanmış) -->
                    <div class="all-time-days-container">
                        ${(cumulativeStats?.dayByDay || []).map(day => `
                            <div class="all-time-day-section" id="day-section-${day.date}">
                                <div class="all-time-day-header">
                                    <div class="day-header-left">
                                        <span class="day-icon">📅</span>
                                        <div>
                                            <h3 class="day-title">${day.dateFormatted} Kuponları</h3>
                                            <span class="day-sub">${day.totalCoupons} Kupon Arşivlendi · ${day.isFinished ? '🏁 Resmi Sonuçlandı' : '⚡ Canlı / Aktif'}</span>
                                        </div>
                                    </div>
                                    <div class="day-header-chips">
                                        <span class="pill-chip won">✅ ${day.wonCoupons} Tutan Kupon</span>
                                        <span class="pill-chip lost">❌ ${day.lostCoupons} Yatan Kupon</span>
                                        <span class="pill-chip rate">🏆 %${day.couponWinRate} Başarı</span>
                                        <span class="pill-chip roi" style="color:${day.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; border-color:${day.netProfit >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'};">
                                            ${day.netProfit >= 0 ? '+' : ''}${day.netProfit.toLocaleString('tr-TR')} TL Kasa Getirisi
                                        </span>
                                    </div>
                                </div>
                                <div class="coupons-grid">
                                    ${day.coupons.map((coupon, idx) => this.renderCouponCard(coupon, idx)).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if ((!coupons || coupons.length === 0) && euroList.length === 0 && !hourlyCoupon) {
            return `
                <div class="empty-state" style="padding:60px 20px;">
                    <span class="empty-icon">🤖</span>
                    <h3>${isYesterday ? 'Dünün kuponları yüklenemedi' : 'Kuponlar oluşturulamadı'}</h3>
                    <p>${isYesterday ? 'Dünün arşiv verisine ulaşılamadı. Lütfen tekrar deneyin.' : 'Bültenden yeterli sayıda oran veya maç verisi alınamadı. Lütfen yenileyin veya bülteni kontrol edin.'}</p>
                    <button class="btn btn-primary btn-sm" id="btn-reload-coupons" style="margin-top:14px;">🔄 Tekrar Dene</button>
                </div>
            `;
        }

        const hourlyList = (!isYesterday && hourlyCoupon) ? [hourlyCoupon] : [];
        const allCoupons = [...hourlyList, ...euroList, ...coupons];

        // Aktif filtreye göre gösterilecek kuponları belirle
        let displayedCoupons = [];
        if (activeFilter === 'hourly') {
            displayedCoupons = hourlyList;
        } else if (activeFilter === 'ucl') {
            displayedCoupons = euroList.filter(c => c.id.startsWith('coupon-ucl'));
        } else if (activeFilter === 'uel') {
            displayedCoupons = euroList.filter(c => c.id === 'coupon-uel');
        } else if (activeFilter === 'uecl') {
            displayedCoupons = euroList.filter(c => c.id === 'coupon-uecl');
        } else if (activeFilter === 'euro') {
            displayedCoupons = euroList;
        } else if (activeFilter === 'daily') {
            displayedCoupons = coupons;
        } else {
            // 'all': Saatlik kupon (en yakın saatler), ardından Avrupa kupaları ve genel günlük kuponlar
            displayedCoupons = allCoupons;
        }

        const totalCount = allCoupons.length;

        // Gün Sonu ve Maç Takip İstatistiklerini Hesapla
        const trackerStats = window.MatchTracker ? window.MatchTracker.calculateEndOfDayStats(allCoupons) : null;

        return `
            <div class="coupons-view-container animate-fade-in">
                <!-- ======================================================== -->
                <!-- TARİH SEÇİCİ & KUPON ARŞİVİ BARI (BUGÜN / DÜN / TÜMÜ) -->
                <!-- ======================================================== -->
                <div class="coupon-date-selector-bar">
                    <div class="c-date-tabs">
                        <button class="c-date-tab ${(!isYesterday && !isAllTime) ? 'active' : ''}" data-target-date="today">
                            <span class="c-date-tab-icon">📅</span>
                            <div class="c-date-tab-text">
                                <span class="c-date-tab-title">Bugünün Kuponları</span>
                                <span class="c-date-tab-sub">10 Eylül 2026</span>
                            </div>
                            <span class="c-date-pill live">⚡ CANLI & AKTİF</span>
                        </button>
                        <button class="c-date-tab ${isYesterday ? 'active' : ''}" data-target-date="yesterday">
                            <span class="c-date-tab-icon">⏪</span>
                            <div class="c-date-tab-text">
                                <span class="c-date-tab-title">Dünün Kuponları</span>
                                <span class="c-date-tab-sub">09 Eylül 2026</span>
                            </div>
                            <span class="c-date-pill done">🏁 SONUÇLANDI</span>
                        </button>
                        <button class="c-date-tab ${isAllTime ? 'active' : ''}" data-target-date="all_time">
                            <span class="c-date-tab-icon">🌟</span>
                            <div class="c-date-tab-text">
                                <span class="c-date-tab-title">09 Eylül'den İtibaren</span>
                                <span class="c-date-tab-sub">Tüm Tutan & Yatan Kuponlar</span>
                            </div>
                            <span class="c-date-pill all-time">🏆 TÜM ZAMANLAR</span>
                        </button>
                    </div>
                    <div class="c-archive-wrap">
                        <span class="c-archive-label">📂 İstatistik & Arşiv:</span>
                        <select id="coupon-archive-select" class="c-archive-select">
                            <option value="today" ${(!isYesterday && !isAllTime) ? 'selected' : ''}>10.09.2026 (Bugün - Canlı Bülten)</option>
                            <option value="yesterday" ${isYesterday ? 'selected' : ''}>09.09.2026 (Dün - Şampiyonlar Ligi)</option>
                            <option value="all_time" ${isAllTime ? 'selected' : ''}>🌟 09 Eylül'den Bugüne (Tüm Zamanlar Kümülatif)</option>
                        </select>
                    </div>
                </div>

                <!-- Üst Hero Banner -->
                <div class="coupons-hero ${isYesterday ? 'hero-yesterday' : ''}">
                    <div class="coupons-hero-top">
                        <div class="coupons-hero-title-group">
                            <span class="coupons-hero-badge">${isYesterday ? '⏪ 09 EYLÜL 2026 ARŞİVİ · 🏁 DÜNÜN MAÇ SONUÇLARI & KAZANMA KARNESİ' : '🏆 UEFA AVRUPA KUPALARI & 📅 GÜNÜN MAÇLARI · 🤖 4 PLATFORM AI'}</span>
                            <h2 class="coupons-hero-title">${isYesterday ? 'Dünün Kuponları — Resmi Maç Sonuçları & Gün Sonu Takip' : 'Benim İçin Bahis Yap — Hazır Kuponlar & Canlı Takip'}</h2>
                            <p class="coupons-hero-desc">
                                ${isYesterday ? '09 Eylül 2026 tarihli <strong>UEFA Şampiyonlar Ligi</strong> ve uluslararası karşılaşmalara ait 4 hazır kupon ve 4 Avrupa kuponunun resmi maç sonuçları. Tutan ve yatan maçları, net kârı ve gün sonu isabet oranını inceleyebilirsiniz.' : 'Sistem; <strong>UEFA Şampiyonlar Ligi (2 Kupon)</strong>, <strong>UEFA Avrupa Ligi</strong> ve <strong>UEFA Konferans Ligi</strong> maçlarını bültenden ayrıştırarak 4 platformun uzman konsensüsüyle kuponlar hazırladı. Günün maçlarını anlık takip edebilir, gün sonu net kazanma yüzdesini (% Win Rate) ve getiri kârını izleyebilirsiniz.'}
                            </p>
                        </div>
                        <div class="coupons-hero-actions">
                            <button class="btn btn-outline" id="btn-hero-email-coupons" title="Günün tüm kuponlarını mail olarak gönder" style="border-color:rgba(56,189,248,0.5);color:#38bdf8;">
                                📧 Kuponları Mail At
                            </button>
                            ${!isYesterday ? `
                            <button class="btn btn-primary" id="btn-regenerate-coupons" title="Yapay zekanın maçları yeniden seçmesini sağla">
                                🔄 Kuponları Yeniden Üret
                            </button>` : `
                            <button class="btn btn-primary" id="btn-switch-today" title="Bugünün canlı bülten kuponlarına geç">
                                📅 Bugünün Kuponlarına Git
                            </button>`}
                            <button class="btn btn-ghost" id="btn-go-to-analysis" title="Tüm %65+ maçları gör">
                                ⭐ Güven %65+ Analiz Masası ➔
                            </button>
                        </div>
                    </div>

                    <!-- 09 Eylül'den Bugüne Kümülatif Hızlı Bilgi Şeridi -->
                    ${this.renderCumulativeSummaryRibbon(cumulativeStats)}

                    <!-- Kupon Özeti Şeridi -->
                    <div class="coupons-summary-ribbon">
                        <div class="ribbon-item ribbon-ucl-special">
                            <span class="ribbon-icon">🏆</span>
                            <div class="ribbon-text">
                                <strong>Şampiyonlar Ligi:</strong>
                                <span>2 Özel Kupon (Banko & Gol)</span>
                            </div>
                        </div>
                        <div class="ribbon-item ribbon-uel-special">
                            <span class="ribbon-icon">🟠</span>
                            <div class="ribbon-text">
                                <strong>UEFA Avrupa Ligi:</strong>
                                <span>Avrupa Ligi Özel Kuponu</span>
                            </div>
                        </div>
                        <div class="ribbon-item ribbon-uecl-special">
                            <span class="ribbon-icon">🟢</span>
                            <div class="ribbon-text">
                                <strong>UEFA Konferans Ligi:</strong>
                                <span>Konferans Ligi Değer Kuponu</span>
                            </div>
                        </div>
                        <div class="ribbon-item">
                            <span class="ribbon-icon">🛡️</span>
                            <div class="ribbon-text">
                                <strong>Günlük Kasa Katlama:</strong>
                                <span>Günün En Banko Kuponu</span>
                            </div>
                        </div>
                    </div>

                    <!-- ======================================================== -->
                    <!-- GÜN SONU KUPON & MAÇ TAKİP MASASI (KAZANMA YÜZDELİĞİ & ROI) -->
                    <!-- ======================================================== -->
                    ${this.renderTrackerDashboard(allCoupons, trackerStats)}

                    <!-- Kupon Kategori / Filtre Sekmeleri -->
                    <div class="coupons-filter-tabs">
                        <button class="c-tab-btn ${activeFilter === 'all' ? 'active' : ''}" data-coupon-filter="all">
                            🌐 Tüm Kuponlar (${totalCount})
                        </button>
                        <button class="c-tab-btn ${activeFilter === 'daily' ? 'active' : ''}" data-coupon-filter="daily">
                            🛡️ Günlük 4 Kupon
                        </button>
                        ${!isYesterday && hourlyCoupon ? `
                        <button class="c-tab-btn c-tab-hourly ${activeFilter === 'hourly' ? 'active' : ''}" data-coupon-filter="hourly" style="color:var(--accent-cyan);border-color:rgba(0,240,255,0.4);font-weight:700;">
                            ⏱️ Önümüzdeki 3 Saat (1 Kupon)
                        </button>` : ''}
                        <button class="c-tab-btn c-tab-ucl ${activeFilter === 'ucl' ? 'active' : ''}" data-coupon-filter="ucl">
                            🏆 Şampiyonlar Ligi (2 Kupon)
                        </button>
                        <button class="c-tab-btn c-tab-uel ${activeFilter === 'uel' ? 'active' : ''}" data-coupon-filter="uel">
                            🟠 UEFA Avrupa Ligi (1 Kupon)
                        </button>
                        <button class="c-tab-btn c-tab-uecl ${activeFilter === 'uecl' ? 'active' : ''}" data-coupon-filter="uecl">
                            🟢 UEFA Konferans Ligi (1 Kupon)
                        </button>
                        <button class="c-tab-btn c-tab-euro ${activeFilter === 'euro' ? 'active' : ''}" data-coupon-filter="euro">
                            🇪🇺 Tüm Avrupa Kupaları (4 Kupon)
                        </button>
                    </div>
                </div>

                <!-- Kuponlar Izgarası -->
                <div class="coupons-grid">
                    ${displayedCoupons.map((coupon, idx) => this.renderCouponCard(coupon, idx)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * 09 Eylül'den Bugüne Kümülatif Hızlı Bilgi Şeridi (Hero altında her zaman görünür)
     */
    renderCumulativeSummaryRibbon(stats = null) {
        const s = stats || (window.MatchTracker ? window.MatchTracker.calculateCumulativeCouponStats('2026-09-09') : null);
        if (!s) return '';

        const isPositive = s.netProfit >= 0;
        const profitSign = isPositive ? '+' : '';
        const profitColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

        return `
            <div class="cumulative-summary-ribbon" id="cumulative-summary-ribbon">
                <div class="csr-content">
                    <span class="csr-icon">🌟</span>
                    <div class="csr-text">
                        <strong>09 Eylül'den Bugüne Kümülatif İstatistik:</strong>
                        <span class="csr-stats-text">
                            <strong style="color:var(--accent-green);">✅ ${s.wonCoupons} TUTAN KUPON</strong> · 
                            <strong style="color:var(--accent-red);">❌ ${s.lostCoupons} YATAN KUPON</strong> 
                            (<strong style="color:var(--accent-cyan);">%${s.couponWinRate} Kupon Başarısı</strong>) · 
                            <strong>${s.wonBets}/${s.totalBets} Tutan Maç</strong> (%${s.winRate}) · 
                            Net Kasa Kârı: <strong style="color:${profitColor};">${profitSign}${s.netProfit.toLocaleString('tr-TR')} TL</strong> (ROI: %${s.roi})
                        </span>
                    </div>
                </div>
                <button class="btn btn-outline btn-xs btn-jump-all-time" id="btn-jump-all-time" title="09 Eylül'den günümüze tüm kupon ve maç istatistiklerini incele">
                    📊 Tüm Zamanlar İstatistik Karnesini Gör ➔
                </button>
            </div>
        `;
    },

    /**
     * 09 Eylül'den Bugüne Kümülatif Kupon & Maç Takip Masası (Win Rate Gauge, Tablo ve İstatistikler)
     */
    renderCumulativeDashboard(stats) {
        if (!stats) return '';

        const isPositiveProfit = stats.netProfit >= 0;
        const profitSign = isPositiveProfit ? '+' : '';
        const profitColor = isPositiveProfit ? 'var(--accent-green)' : 'var(--accent-red)';

        return `
            <div class="tracker-dashboard-card cumulative-dashboard-card" id="tracker-dashboard">
                <div class="tracker-top-header">
                    <div class="tracker-header-left">
                        <span class="tracker-badge-pill" style="background:linear-gradient(135deg,rgba(0,240,255,0.2),rgba(124,58,237,0.25));color:#00F0FF;border-color:rgba(0,240,255,0.4);">
                            🌟 09 EYLÜL'DEN BUGÜNE TÜM ZAMANLAR KÜMÜLATİF KARNE
                        </span>
                        <h3 class="tracker-title">Tutan & Yatan Kuponların Kümülatif İstatistik Panosu</h3>
                    </div>
                    <div class="tracker-header-right">
                        <span class="tracker-mode-status mode-simulated">
                            📅 Başlangıç: 09 Eylül 2026 (${stats.totalDays} Günlük Arşiv)
                        </span>
                    </div>
                </div>

                <!-- 4 Temel Kümülatif Gösterge Kartı -->
                <div class="tracker-metrics-grid">
                    <!-- 1. KÜMÜLATİF KUPON BAŞARI ORANI (ANA GÖSTERGE) -->
                    <div class="tracker-metric-card primary-gauge">
                        <div class="gauge-circle-container">
                            <div class="gauge-number" style="color:${stats.couponWinRate >= 60 ? 'var(--accent-green)' : (stats.couponWinRate >= 45 ? 'var(--accent-amber)' : 'var(--accent-cyan)')};">
                                %${stats.couponWinRate}
                            </div>
                            <span class="gauge-sub">KUPON BAŞARISI</span>
                        </div>
                        <div class="gauge-details">
                            <div class="gauge-title">Toplam Tutan / Yatan Kupon</div>
                            <div class="gauge-pills">
                                <span class="pill-chip won" title="Kazanan Kuponlar">✅ ${stats.wonCoupons} Kupon Tuttu</span>
                                <span class="pill-chip lost" title="Kaybeden Kuponlar">❌ ${stats.lostCoupons} Kupon Yattı</span>
                                ${stats.liveCoupons + stats.pendingCoupons > 0 ? `<span class="pill-chip live">⏳ ${stats.liveCoupons + stats.pendingCoupons} Devam Eden</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- 2. MAÇ VE BAHİS TERCİHİ İSABETİ -->
                    <div class="tracker-metric-card">
                        <div class="metric-top">
                            <span class="metric-icon">⚽</span>
                            <span class="metric-badge">%${stats.winRate} Maç İsabeti</span>
                        </div>
                        <div class="metric-large-val" style="color:var(--accent-cyan);">
                            ${stats.wonBets} / ${stats.decidedBets}
                        </div>
                        <div class="metric-label">Tutan Maç Tercihi</div>
                        <div class="metric-progress-wrap">
                            <div class="metric-progress-bar" style="width: ${Math.min(100, stats.winRate || 0)}%; background: var(--accent-cyan);"></div>
                        </div>
                        <span class="metric-footer-text">
                            ${stats.lostBets} Kaybeden Tercih · Toplam ${stats.totalBets} Bahis Analizi
                        </span>
                    </div>

                    <!-- 3. TOPLAM KASA KÂRI & ROI -->
                    <div class="tracker-metric-card">
                        <div class="metric-top">
                            <span class="metric-icon">💰</span>
                            <span class="metric-badge" style="color:${profitColor}; border-color:${profitColor}44;">
                                ROI: ${profitSign}%${stats.roi}
                            </span>
                        </div>
                        <div class="metric-large-val" style="color:${profitColor};">
                            ${profitSign}${stats.netProfit.toLocaleString('tr-TR')} TL
                        </div>
                        <div class="metric-label">Kümülatif Net Kasa Getirisi</div>
                        <div class="metric-meta-row">
                            <span>Toplam Yatırılan: <strong>${stats.totalStake.toLocaleString('tr-TR')} TL</strong></span>
                            <span>Toplam Dönen: <strong>${stats.totalReturn.toLocaleString('tr-TR')} TL</strong></span>
                        </div>
                    </div>

                    <!-- 4. ARŞİV DÖKÜMÜ & ORTALAMA -->
                    <div class="tracker-metric-card breakdown-card">
                        <div class="metric-top">
                            <span class="metric-icon">📈</span>
                            <span class="metric-badge">Tarihsel Özet</span>
                        </div>
                        <div class="tracker-category-list">
                            <div class="tracker-cat-item">
                                <span class="cat-name">📅 Kayıtlı Gün:</span>
                                <span class="cat-stat"><strong>${stats.totalDays} Gün</strong> (09 Eylül+)</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">📑 Toplam Kupon:</span>
                                <span class="cat-stat"><strong>${stats.totalCoupons} Kupon</strong></span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">🎯 Kupon Kazanma:</span>
                                <span class="cat-stat"><span class="pill-chip won"><strong>%${stats.couponWinRate}</strong></span></span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">⚽ Maç Başarısı:</span>
                                <span class="cat-stat"><span class="pill-chip info"><strong>%${stats.winRate}</strong></span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ======================================================== -->
                <!-- TARİH BAZLI KUPON & MAÇ BAŞARI ÇİZELGESİ (TABLO) -->
                <!-- ======================================================== -->
                <div class="cumulative-table-card">
                    <div class="cum-table-header">
                        <div class="cum-table-header-left">
                            <span class="cum-table-badge">📋 TARİH BAZLI KUPON DETAYLARI</span>
                            <h4 class="cum-table-title">09 Eylül'den Bugüne Günlük Kupon Karnesi</h4>
                        </div>
                        <div class="cum-table-header-right">
                            <span class="cum-table-info">Her günün Tutan / Yatan kupon sayıları ve kasa getirisi</span>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="cumulative-table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Toplam Kupon</th>
                                    <th>Tutan (✅)</th>
                                    <th>Yatan (❌)</th>
                                    <th>Kupon Başarısı</th>
                                    <th>Tutan Maç</th>
                                    <th>Maç Başarısı</th>
                                    <th>Kasa Getirisi</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.dayByDay.map(d => `
                                    <tr>
                                        <td>
                                            <strong class="cum-date-cell">📅 ${d.dateFormatted}</strong>
                                        </td>
                                        <td><span class="cum-pill-count">${d.totalCoupons} Kupon</span></td>
                                        <td><span class="pill-chip won">✅ ${d.wonCoupons}</span></td>
                                        <td><span class="pill-chip lost">❌ ${d.lostCoupons}</span></td>
                                        <td><strong style="color:var(--accent-cyan); font-size:1.05rem;">%${d.couponWinRate}</strong></td>
                                        <td><strong>${d.wonBets}</strong> / ${d.totalBets}</td>
                                        <td>%${d.winRate}</td>
                                        <td style="font-weight:800; color:${d.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
                                            ${d.netProfit >= 0 ? '+' : ''}${d.netProfit.toLocaleString('tr-TR')} TL
                                        </td>
                                        <td>
                                            <span class="c-date-pill ${d.isFinished ? 'done' : 'live'}">
                                                ${d.isFinished ? '🏁 Sonuçlandı' : '⚡ Canlı / Aktif'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="cum-total-row">
                                    <td><strong>🏆 GENEL TOPLAM</strong></td>
                                    <td><strong>${stats.totalCoupons} Kupon</strong></td>
                                    <td><strong style="color:var(--accent-green);">✅ ${stats.wonCoupons} Kupon</strong></td>
                                    <td><strong style="color:var(--accent-red);">❌ ${stats.lostCoupons} Kupon</strong></td>
                                    <td><strong style="color:var(--accent-cyan); font-size:1.15rem;">%${stats.couponWinRate}</strong></td>
                                    <td><strong>${stats.wonBets} / ${stats.totalBets}</strong></td>
                                    <td><strong>%${stats.winRate}</strong></td>
                                    <td style="font-size:1.15rem; color:${stats.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
                                        <strong>${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toLocaleString('tr-TR')} TL</strong>
                                    </td>
                                    <td><span class="c-date-pill all-time">⭐ 09 EYLÜL+</span></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Gün Sonu Kupon & Maç Takip Masası (Win Rate Gauge, İstatistikler ve Aksiyon Barı)
     */
    renderTrackerDashboard(allCoupons = [], stats = null) {
        if (!stats) return '';

        const hasDecided = stats.decidedBets > 0;
        const winRateDisplay = hasDecided ? `%${stats.winRate}` : '—';
        const couponWinRateDisplay = stats.decidedCoupons > 0 ? `%${stats.couponWinRate}` : '—';

        const isPositiveProfit = stats.netProfit >= 0;
        const profitSign = isPositiveProfit ? '+' : '';
        const profitColor = isPositiveProfit ? 'var(--accent-green)' : 'var(--accent-red)';

        // Mod bilgisi etiketi
        let modeLabel = '📅 Maçlar Bekliyor (Henüz Başlamadı)';
        let modePillClass = 'mode-initial';
        if (window.LiveScoreService?.isPolling || window.MatchTracker?.data?.mode === 'live') {
            modeLabel = '🔴 Canlı Skor Takibi Aktif (ESPN Scoreboard)';
            modePillClass = 'mode-live';
        } else if (window.MatchTracker?.data?.mode === 'manual') {
            modeLabel = '✏️ Manuel Skor Girişi Aktif';
            modePillClass = 'mode-manual';
        } else if (stats.decidedBets > 0) {
            modeLabel = `🏁 Gerçek Biten & Oynanan Maçlar (${stats.decidedBets} Sonuçlandı)`;
            modePillClass = 'mode-simulated';
        }

        const isPollingActive = window.LiveScoreService?.isPolling;

        return `
            <div class="tracker-dashboard-card" id="tracker-dashboard">
                <div class="tracker-top-header">
                    <div class="tracker-header-left">
                        <span class="tracker-badge-pill">📊 GÜN SONU MAÇ & KUPON TAKİP RAPORU</span>
                        <h3 class="tracker-title">Gün Sonu Kazanma Yüzdesi & Canlı Takip Paneli</h3>
                    </div>
                    <div class="tracker-header-right">
                        <span class="tracker-mode-status ${modePillClass}">${modeLabel}</span>
                    </div>
                </div>

                <!-- 4 Temel Gösterge Kartı -->
                <div class="tracker-metrics-grid">
                    <!-- 1. GÜN SONU KAZANMA YÜZDESİ (ANA GÖSTERGE) -->
                    <div class="tracker-metric-card primary-gauge">
                        <div class="gauge-circle-container">
                            <div class="gauge-number" style="color:${stats.winRate >= 70 ? 'var(--accent-green)' : (stats.winRate >= 50 ? 'var(--accent-amber)' : 'var(--accent-cyan)')};">
                                ${winRateDisplay}
                            </div>
                            <span class="gauge-sub">KAZANMA YÜZDESİ</span>
                        </div>
                        <div class="gauge-details">
                            <div class="gauge-title">Maç İsabet Başarısı</div>
                            <div class="gauge-pills">
                                <span class="pill-chip won" title="Kazanan Maç Bahsi">✅ ${stats.wonBets} Kazandı</span>
                                <span class="pill-chip lost" title="Kaybeden Maç Bahsi">❌ ${stats.lostBets} Kaybetti</span>
                                <span class="pill-chip live" title="Oynanan veya Bekleyen Maçlar">⏳ ${stats.liveBets + stats.pendingBets} Devam/Bekliyor</span>
                            </div>
                        </div>
                    </div>

                    <!-- 2. KUPON BAŞARI ORANI -->
                    <div class="tracker-metric-card">
                        <div class="metric-top">
                            <span class="metric-icon">🏆</span>
                            <span class="metric-badge">${couponWinRateDisplay} Kupon İsabeti</span>
                        </div>
                        <div class="metric-large-val" style="color:var(--accent-cyan);">
                            ${stats.wonCoupons} / ${stats.totalCoupons}
                        </div>
                        <div class="metric-label">Tutan / Toplam Kupon</div>
                        <div class="metric-progress-wrap">
                            <div class="metric-progress-bar" style="width: ${Math.min(100, stats.couponWinRate || 0)}%; background: var(--accent-cyan);"></div>
                        </div>
                        <span class="metric-footer-text">
                            ${stats.lostCoupons} Yatan Kupon · ${stats.liveCoupons + stats.pendingCoupons} Devam Eden
                        </span>
                    </div>

                    <!-- 3. KASA KÂR / ZARAR & ROI -->
                    <div class="tracker-metric-card">
                        <div class="metric-top">
                            <span class="metric-icon">💰</span>
                            <span class="metric-badge" style="color:${profitColor}; border-color:${profitColor}44;">
                                ROI: ${profitSign}%${stats.roi}
                            </span>
                        </div>
                        <div class="metric-large-val" style="color:${profitColor};">
                            ${profitSign}${stats.netProfit.toLocaleString('tr-TR')} TL
                        </div>
                        <div class="metric-label">Net Kasa Kârı / Getirisi</div>
                        <div class="metric-meta-row">
                            <span>Yatırılan: <strong>${stats.totalStake} TL</strong></span>
                            <span>Dönen: <strong>${stats.totalReturn.toLocaleString('tr-TR')} TL</strong></span>
                        </div>
                    </div>

                    <!-- 4. KATEGORİ BAZLI BAŞARI DAĞILIMI -->
                    <div class="tracker-metric-card breakdown-card">
                        <div class="metric-top">
                            <span class="metric-icon">📈</span>
                            <span class="metric-badge">Kategori Başarıları</span>
                        </div>
                        <div class="tracker-category-list">
                            <div class="tracker-cat-item">
                                <span class="cat-name">🛡️ Kasa Katlama:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-safe')}</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">🎯 Editör İdeal:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-editor')}</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">🏆 Şampiyonlar Ligi 1:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-ucl-1')}</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">🔥 Şampiyonlar Ligi 2:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-ucl-2')}</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">⚽ Gol Yağmuru:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-goals')}</span>
                            </div>
                            <div class="tracker-cat-item">
                                <span class="cat-name">💎 Sürpriz & Value:</span>
                                <span class="cat-stat">${this._getCouponStatusPill(allCoupons, 'coupon-value')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aksiyon Kontrol Çubuğu (Canlı Takip, Manuel Düzenleme) -->
                <div class="tracker-actions-bar">
                    <div class="tracker-actions-left">
                        <button class="btn btn-primary btn-sm" id="btn-coupon-sync-live" title="Gerçek dünya canlı skorlarını çek ve kuponları güncelle">
                            🔄 Canlı Skorları Çek & Güncelle
                        </button>
                        <button class="btn btn-ghost btn-sm" id="btn-coupon-toggle-polling" title="Her 45 saniyede bir otomatik canlı skorları çek">
                            ${isPollingActive ? '⏱️ Canlı Otomatik Takip: Aktif 🟢' : '⏱️ Canlı Otomatik Takip: Pasif ⚪'}
                        </button>
                        <button class="btn btn-ghost btn-sm btn-open-score-editor" id="btn-open-score-editor" title="Maçların gerçek maç sonu skorlarını kendiniz yazın">
                            ✏️ Skorları Manuel Düzenle
                        </button>
                    </div>
                    <div class="tracker-actions-right">
                        <button class="btn btn-ghost btn-sm btn-reset-tracker" id="btn-reset-tracker" title="Skorları sıfırla (0-0 Başlamadı yap)">
                            ⏮️ Sıfırla (Başlamadı Yap)
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Yardımcı: Belirli bir kupon ID'sinin kısa durum rozeti
     */
    _getCouponStatusPill(allCoupons, couponId) {
        if (!window.MatchTracker) return '—';
        const target = allCoupons.find(c => c.id === couponId);
        if (!target) return '—';
        const res = window.MatchTracker.evaluateCoupon(target);
        if (res.status === 'WON') return `<span class="pill-chip won">TUTTU ✅</span>`;
        if (res.status === 'LOST') return `<span class="pill-chip lost">YATTI ❌</span>`;
        if (res.status === 'LIVE') return `<span class="pill-chip live">${res.wonCount}/${res.totalCount} Canlı ⏳</span>`;
        return `<span class="pill-chip pending">Bekliyor 📅</span>`;
    },

    /**
     * Tekil kupon kartını render et (Canlı Skor ve Kazandı/Kaybetti Durumlarıyla Birlikte)
     */
    renderCouponCard(coupon, index) {
        const defaultStake = coupon.recommendedStake || 100;
        const potentialWin = (defaultStake * parseFloat(coupon.totalOdd)).toFixed(2);

        // Kupon değerlendirmesi
        const evalResult = window.MatchTracker ? window.MatchTracker.evaluateCoupon(coupon) : {
            status: 'PENDING',
            badgeHtml: '',
            wonCount: 0,
            lostCount: 0,
            totalCount: coupon.matches?.length || 0,
            evaluatedMatches: coupon.matches || []
        };

        // Kart kenarlık stili
        let cardBorderGlow = '';
        if (evalResult.status === 'WON') {
            cardBorderGlow = 'border: 2px solid #10B981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);';
        } else if (evalResult.status === 'LOST') {
            cardBorderGlow = 'border: 1px solid rgba(239, 68, 68, 0.45);';
        } else if (evalResult.status === 'LIVE') {
            cardBorderGlow = 'border: 1px solid rgba(0, 240, 255, 0.4); box-shadow: 0 0 15px rgba(0, 240, 255, 0.15);';
        }

        const matchesList = evalResult.evaluatedMatches && evalResult.evaluatedMatches.length > 0 
            ? evalResult.evaluatedMatches 
            : (coupon.matches || []);

        return `
            <div class="coupon-card coupon-${coupon.id} coupon-status-${evalResult.status.toLowerCase()}" style="border-top: 3px solid ${coupon.themeColor}; ${cardBorderGlow}" data-coupon-id="${coupon.id}">
                <!-- Kupon Durum Rozeti (TUTTU / YATTI / DEVAM EDİYOR) -->
                ${evalResult.badgeHtml ? `<div class="coupon-track-status-banner">${evalResult.badgeHtml}</div>` : ''}

                <!-- Kupon Üst Başlığı -->
                <div class="coupon-card-header">
                    <div class="coupon-title-row">
                        <div class="coupon-title-left">
                            <span class="coupon-icon">${coupon.icon}</span>
                            <div>
                                <h3 class="coupon-name">${coupon.title}</h3>
                                <span class="coupon-subtitle">${coupon.subtitle}</span>
                            </div>
                        </div>
                        <span class="coupon-badge" style="background:${coupon.accentBg}; border-color:${coupon.themeColor}55; color:${coupon.themeColor};">
                            ${coupon.badge}
                        </span>
                    </div>

                    <p class="coupon-strategy-text">${coupon.strategy}</p>

                    <!-- Toplam Oran & İstatistik Kutucuğu -->
                    <div class="coupon-odds-strip">
                        <div class="coupon-odd-box">
                            <span class="odd-lbl">TOPLAM ORAN</span>
                            <span class="odd-val" style="color:${coupon.themeColor};">${coupon.totalOdd}</span>
                        </div>
                        <div class="coupon-stat-pill">
                            <span class="stat-lbl">Ortalama Güven</span>
                            <span class="stat-val">⭐ %${coupon.avgConfidence}</span>
                        </div>
                        <div class="coupon-stat-pill">
                            <span class="stat-lbl">Tahmini İhtimal</span>
                            <span class="stat-val">📈 %${coupon.avgProbability}</span>
                        </div>
                        <div class="coupon-stat-pill">
                            <span class="stat-lbl">Maç Sayısı</span>
                            <span class="stat-val">🔢 ${coupon.matchCount} Maç</span>
                        </div>
                    </div>
                </div>

                <!-- Maçlar Listesi (Skorlar ve Bahis Durumları Dahil) -->
                <div class="coupon-matches-list">
                    ${matchesList.map((m, mIdx) => {
                        const scoreData = m.scoreData || (window.MatchTracker ? window.MatchTracker.getMatchScore(m.match) : { homeScore: 0, awayScore: 0, status: 'NOT_STARTED', minute: 'Başlamadı' });
                        const evaluation = m.evaluation || (window.MatchTracker ? window.MatchTracker.evaluatePick(m, scoreData) : { status: 'PENDING', badge: '⏳ Bekliyor', css: 'pending', detail: '' });
                        const matchKey = window.MatchTracker ? window.MatchTracker.getMatchKey(m.match) : '';

                        return `
                            <div class="coupon-match-item match-eval-${evaluation.status.toLowerCase()}" data-coupon-id="${coupon.id}" data-match-idx="${mIdx}" data-match-key="${matchKey}">
                                <div class="c-match-top">
                                    <span class="c-match-league">${Helpers.escapeHtml(m.league)}</span>
                                    <div class="c-match-timing-group">
                                        <span class="c-match-time">${m.isToday ? '<span class="badge-today">BUGÜN</span>' : (m.dateStr ? `📅 ${m.dateStr} ` : '')}⏰ ${m.timeStr}</span>
                                    </div>
                                </div>

                                <div class="c-match-teams-row">
                                    <div class="c-match-teams">
                                        <span class="c-team home">${Helpers.escapeHtml(m.homeTeam)}</span>
                                        <span class="c-vs">vs</span>
                                        <span class="c-team away">${Helpers.escapeHtml(m.awayTeam)}</span>
                                    </div>
                                    
                                    <!-- Canlı / Biten Skor Kutucuğu -->
                                    <div class="c-match-score-badge ${scoreData.status.toLowerCase()}" title="Tıkla: Skoru Güncelle">
                                        <span class="score-text">${scoreData.homeScore} - ${scoreData.awayScore}</span>
                                        <span class="score-minute">${scoreData.status === 'FINISHED' ? 'MS' : (scoreData.status === 'LIVE' ? scoreData.minute : '00:00')}</span>
                                    </div>
                                </div>

                                <div class="c-match-pick-row">
                                    <div class="c-pick-tag">
                                        <span class="c-pick-label">${Helpers.escapeHtml(m.marketTitle)}</span>
                                        <strong class="c-pick-name">${Helpers.escapeHtml(m.pickTitle)}</strong>
                                    </div>
                                    <div class="c-pick-right-meta">
                                        <div class="c-pick-odd-box">
                                            <span class="c-odd-badge">${m.odd}</span>
                                        </div>
                                        <!-- Tercih Durumu Rozeti (Kazandı / Kaybetti) -->
                                        <div class="c-bet-result-pill ${evaluation.css}">
                                            ${evaluation.badge}
                                        </div>
                                    </div>
                                </div>

                                <!-- Skor Detayı & Gerekçe -->
                                <div class="c-match-meta">
                                    <span class="c-meta-consensus" title="4 Platform Uzman Konsensüsü">
                                        🟡🔵🟢🔴 %${m.consensusPercentage} Konsensüs
                                    </span>
                                    <span class="c-meta-eval-detail" title="${Helpers.escapeHtml(evaluation.detail || m.reason)}">
                                        ${evaluation.detail ? `📢 ${Helpers.escapeHtml(evaluation.detail)}` : `💡 ${Helpers.escapeHtml(m.reason)}`}
                                    </span>
                                    <button class="btn-quick-edit-match" data-match-key="${matchKey}" data-home="${Helpers.escapeHtml(m.homeTeam)}" data-away="${Helpers.escapeHtml(m.awayTeam)}" title="Bu maçın skorunu elle düzenle">
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Kupon Hesaplayıcı & Alt İşlemler -->
                <div class="coupon-card-footer">
                    <div class="coupon-calc-row">
                        <div class="calc-input-group">
                            <label for="stake-${coupon.id}">Kupon Tutarı (TL):</label>
                            <input type="number" id="stake-${coupon.id}" class="coupon-stake-input" value="${defaultStake}" min="10" step="10" data-total-odd="${coupon.totalOdd}">
                        </div>
                        <div class="calc-return-group">
                            <span class="calc-return-label">Olası Net Kazanç:</span>
                            <strong class="calc-return-value" id="win-${coupon.id}" style="color:${coupon.themeColor};">${potentialWin} TL</strong>
                        </div>
                    </div>

                    <div class="coupon-action-buttons">
                        <button class="btn btn-primary btn-sm btn-copy-coupon" data-coupon-id="${coupon.id}" title="Kuponu panoya kopyala">
                            📋 Kuponu Kopyala
                        </button>
                        <button class="btn btn-ghost btn-sm btn-inspect-coupon" data-coupon-id="${coupon.id}" title="Maçların detaylı analizlerini incele">
                            🔍 Maçları İncele
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Kupon paneli event'lerini bağla
     * @param {Object} app - App örneği
     * @param {Array} coupons - Üretilen günlük kuponlar
     * @param {Array} euroCoupons - Avrupa kupaları kuponları
     */
    bindEvents(app, coupons = [], euroCoupons = [], activeDate = 'today') {
        const container = document.getElementById('coupons-container');
        if (!container) return;

        const euroList = Array.isArray(euroCoupons) ? euroCoupons : (euroCoupons ? [euroCoupons] : []);
        const allCoupons = [...euroList, ...coupons];

        // 0. Tarih Değiştirme Sekmeleri (Bugün / Dün)
        container.querySelectorAll('.c-date-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetDate = btn.dataset.targetDate;
                app.loadDailyCoupons(false, app.activeCouponFilter || 'all', targetDate);
            });
        });

        // 0.1 Arşiv Dropdown Değişimi
        const archiveSelect = container.querySelector('#coupon-archive-select');
        if (archiveSelect) {
            archiveSelect.addEventListener('change', (e) => {
                const targetDate = e.target.value;
                app.loadDailyCoupons(false, app.activeCouponFilter || 'all', targetDate);
            });
        }

        // 0.2 Bugünün Kuponlarına Git Butonu
        container.querySelector('#btn-switch-today')?.addEventListener('click', () => {
            app.loadDailyCoupons(false, app.activeCouponFilter || 'all', 'today');
        });

        // 0.21 Dünün Kuponlarına Git Butonu
        container.querySelector('#btn-switch-yesterday')?.addEventListener('click', () => {
            app.loadDailyCoupons(false, app.activeCouponFilter || 'all', 'yesterday');
        });

        // 0.22 Tüm Zamanlar Kümülatif İstatistik Karnesine Hızlı Geçiş Butonu
        container.querySelector('#btn-jump-all-time')?.addEventListener('click', () => {
            app.loadDailyCoupons(false, 'all', 'all_time');
        });

        // 0.3 Kategori / Filtre Sekmeleri
        container.querySelectorAll('.c-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.couponFilter;
                app.activeCouponFilter = filter;
                app.loadDailyCoupons(false, filter, activeDate);
            });
        });

        // 0.4 Kuponları Mail Gönder Modalını Aç
        container.querySelector('#btn-hero-email-coupons')?.addEventListener('click', () => {
            if (typeof app.openMailModal === 'function') {
                app.openMailModal();
            } else if (typeof Helpers !== 'undefined') {
                Helpers.openModal('modal-email-coupons');
            }
        });

        // 1. Kuponları Yeniden Üret butonu
        container.querySelector('#btn-regenerate-coupons')?.addEventListener('click', () => {
            Helpers.showToast('Yapay zeka bülteni yeniden tarayarak yeni kuponlar oluşturuyor...', 'info');
            app.loadDailyCoupons(true, app.activeCouponFilter || 'all', activeDate);
        });

        // 2. Güven %65+ ekranına git
        container.querySelector('#btn-go-to-analysis')?.addEventListener('click', () => {
            app.navigate('analysis');
            app.loadHighConfidenceShowcase('all');
        });

        // 3. Tekrar dene (boş durumdaysa)
        container.querySelector('#btn-reload-coupons')?.addEventListener('click', () => {
            app.loadDailyCoupons(true);
        });

        // ============================================================
        // 4. GÜN SONU MAÇ & KUPON TAKİBİ BUTONLARI (GERÇEK CANLI SKORLAR)
        // ============================================================
        // 4.1 Gerçek Canlı Skorları Çek & Kuponları Güncelle
        container.querySelector('#btn-coupon-sync-live')?.addEventListener('click', async () => {
            const btn = container.querySelector('#btn-coupon-sync-live');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Canlı Skorlar Çekiliyor...';
            }
            Helpers.showToast('🔄 Gerçek canlı skorlar çekiliyor ve kuponlar taranıyor...', 'info');

            try {
                if (window.LiveScoreService) {
                    const result = await window.LiveScoreService.syncBulletinMatches(app.matches || []);
                    Helpers.showToast(`✅ Canlı Skor Güncellendi! (${result.matched} maç eşleşti: ${result.finished} Biten, ${result.live} Canlı)`, 'success');
                }
                app.loadDailyCoupons(false, app.activeCouponFilter || 'all');
            } catch (err) {
                console.error('Canlı skor kupon senkronizasyon hatası:', err);
                Helpers.showToast('⚠️ Canlı skorlar güncellenirken bir sorun oluştu.', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '🔄 Canlı Skorları Çek & Güncelle';
                }
            }
        });

        // 4.2 Otomatik Canlı Takip Aç / Kapa (45 sn)
        container.querySelector('#btn-coupon-toggle-polling')?.addEventListener('click', () => {
            if (!window.LiveScoreService) return;

            if (window.LiveScoreService.isPolling) {
                window.LiveScoreService.stopAutoPolling();
                Helpers.showToast('⏸️ Canlı otomatik takip durduruldu.', 'info');
            } else {
                window.LiveScoreService.startAutoPolling(app.matches || [], () => {
                    app.loadDailyCoupons(false, app.activeCouponFilter || 'all');
                }, 45000);
                Helpers.showToast('⏱️ Canlı otomatik takip başlatıldı (45 saniyede bir güncellenir).', 'success');
            }
            app.loadDailyCoupons(false, app.activeCouponFilter || 'all');
        });

        // 4.3 Sıfırla (Başlamadı Durumuna Getir)
        container.querySelector('#btn-reset-tracker')?.addEventListener('click', () => {
            if (window.MatchTracker) {
                window.MatchTracker.resetData();
                Helpers.showToast('⏮️ Skorlar sıfırlandı. Maçlar henüz başlamadı durumuna getirildi.', 'info');
                app.loadDailyCoupons(false, app.activeCouponFilter || 'all');
            }
        });

        // 4.4 Skorları Manuel Düzenle Modalını Aç
        container.querySelector('#btn-open-score-editor')?.addEventListener('click', () => {
            this.openScoreEditorModal(app, allCoupons);
        });

        // 4.5 Tekil Maç Üzerindeki ✏️ Butonuna Tıklama
        container.querySelectorAll('.btn-quick-edit-match').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.matchKey;
                this.openScoreEditorModal(app, allCoupons, key);
            });
        });

        // 5. Dinamik Tutar & Kazanç Hesaplayıcı
        container.querySelectorAll('.coupon-stake-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const stake = parseFloat(e.target.value) || 0;
                const totalOdd = parseFloat(e.target.dataset.totalOdd) || 1;
                const couponId = e.target.id.replace('stake-', '');
                const winEl = document.getElementById(`win-${couponId}`);
                if (winEl) {
                    const potential = (stake * totalOdd).toFixed(2);
                    winEl.textContent = `${potential} TL`;
                }
            });
        });

        // 6. Kuponu Kopyala butonları
        container.querySelectorAll('.btn-copy-coupon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cid = btn.dataset.couponId;
                const targetCoupon = allCoupons.find(c => c.id === cid);
                if (targetCoupon && window.CouponEngine) {
                    const text = CouponEngine.formatCouponForClipboard(targetCoupon);
                    navigator.clipboard.writeText(text).then(() => {
                        Helpers.showToast(`📋 "${targetCoupon.title}" panoya kopyalandı!`, 'success');
                    }).catch(() => {
                        Helpers.showToast(`Kupon kopyalandı!`, 'success');
                    });
                }
            });
        });

        // 7. Maç öğesine tıklama -> Detaylı analiz modalı aç
        container.querySelectorAll('.coupon-match-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-quick-edit-match')) return;
                const cid = item.dataset.couponId;
                const midx = parseInt(item.dataset.matchIdx);
                const targetCoupon = allCoupons.find(c => c.id === cid);
                if (targetCoupon && targetCoupon.matches && targetCoupon.matches[midx]) {
                    app.openMatchAnalysis(targetCoupon.matches[midx].match);
                }
            });
        });

        // 8. Maçları İncele butonu
        container.querySelectorAll('.btn-inspect-coupon').forEach(btn => {
            btn.addEventListener('click', () => {
                const cid = btn.dataset.couponId;
                const targetCoupon = allCoupons.find(c => c.id === cid);
                if (targetCoupon && targetCoupon.matches && targetCoupon.matches[0]) {
                    app.openMatchAnalysis(targetCoupon.matches[0].match);
                }
            });
        });
    },

    /**
     * Manuel Skor Düzenleme Modalını Aç
     */
    openScoreEditorModal(app, allCoupons = [], highlightKey = null) {
        if (!window.MatchTracker) return;

        // Benzersiz maçları topla (Kupon listesi veya doğrudan maç listesi desteklenir)
        const uniqueMatchesMap = new Map();
        allCoupons.forEach(item => {
            if (item && item.matches && Array.isArray(item.matches)) {
                item.matches.forEach(m => {
                    const key = window.MatchTracker.getMatchKey(m.match);
                    if (!uniqueMatchesMap.has(key)) uniqueMatchesMap.set(key, m);
                });
            } else if (item && item.match) {
                const key = window.MatchTracker.getMatchKey(item.match);
                if (!uniqueMatchesMap.has(key)) uniqueMatchesMap.set(key, item);
            }
        });

        const uniqueMatches = Array.from(uniqueMatchesMap.values());
        if (uniqueMatches.length === 0) {
            Helpers.showToast('Düzenlenebilecek maç bulunamadı.', 'warning');
            return;
        }

        // Modal elementi bul veya oluştur
        let modalOverlay = document.getElementById('modal-match-tracker-scores');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'modal-match-tracker-scores';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>✏️ Kupon Maçları Skor & Canlı Durum Düzenleme</h3>
                        <button class="modal-close" id="btn-close-tracker-modal">✕</button>
                    </div>
                    <div class="modal-body" id="match-tracker-modal-body"></div>
                </div>
            `;
            document.body.appendChild(modalOverlay);

            modalOverlay.querySelector('#btn-close-tracker-modal')?.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
            });
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) modalOverlay.classList.remove('active');
            });
        }

        const modalBody = modalOverlay.querySelector('#match-tracker-modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = `
            <div class="score-editor-container">
                <p class="score-editor-desc">
                    Aşağıdaki maçların skorlarını gerçek maç sonu veya anlık durumlarına göre güncelleyin. 
                    Kaydettiğinizde tüm kuponların durumları (Kazandı/Kaybetti) ve <strong>Gün Sonu Kazanma Yüzdesi</strong> anında yeniden hesaplanacaktır.
                </p>

                <div class="score-editor-list">
                    ${uniqueMatches.map(m => {
                        const key = window.MatchTracker.getMatchKey(m.match);
                        const scoreData = window.MatchTracker.getMatchScore(m.match);
                        const isHighlighted = highlightKey === key;

                        return `
                            <div class="score-editor-row ${isHighlighted ? 'highlighted' : ''}" data-key="${key}">
                                <div class="se-team-col">
                                    <span class="se-league">${Helpers.escapeHtml(m.league)} · ⏰ ${m.timeStr}</span>
                                    <strong class="se-match-title">${Helpers.escapeHtml(m.homeTeam)} vs ${Helpers.escapeHtml(m.awayTeam)}</strong>
                                    <span class="se-target-pick">Önerilen Tercih: <strong>${Helpers.escapeHtml(m.pickTitle)}</strong> (${m.odd})</span>
                                </div>

                                <div class="se-inputs-col">
                                    <div class="se-score-group">
                                        <input type="number" class="se-input-score se-home" min="0" max="20" value="${scoreData.homeScore}">
                                        <span class="se-divider">-</span>
                                        <input type="number" class="se-input-score se-away" min="0" max="20" value="${scoreData.awayScore}">
                                    </div>
                                    <div class="se-status-group">
                                        <select class="se-select-status">
                                            <option value="FINISHED" ${scoreData.status === 'FINISHED' ? 'selected' : ''}>🏁 Bitti (MS)</option>
                                            <option value="LIVE" ${scoreData.status === 'LIVE' ? 'selected' : ''}>⏳ Canlı Oynanıyor</option>
                                            <option value="NOT_STARTED" ${scoreData.status === 'NOT_STARTED' ? 'selected' : ''}>📅 Henüz Başlamadı</option>
                                        </select>
                                        <input type="text" class="se-input-minute" placeholder="dk. (örn: 65')" value="${scoreData.minute || (scoreData.status === 'FINISHED' ? 'MS' : '')}" style="width: 80px;">
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="score-editor-footer">
                    <button class="btn btn-ghost" id="btn-cancel-scores">İptal</button>
                    <button class="btn btn-primary" id="btn-save-all-scores">💾 Skorları Kaydet ve Yüzdeleri Güncelle</button>
                </div>
            </div>
        `;

        // Buton event'leri
        modalBody.querySelector('#btn-cancel-scores')?.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });

        modalBody.querySelector('#btn-save-all-scores')?.addEventListener('click', () => {
            modalBody.querySelectorAll('.score-editor-row').forEach(row => {
                const key = row.dataset.key;
                const homeScore = parseInt(row.querySelector('.se-home')?.value) || 0;
                const awayScore = parseInt(row.querySelector('.se-away')?.value) || 0;
                const status = row.querySelector('.se-select-status')?.value || 'FINISHED';
                const minute = row.querySelector('.se-input-minute')?.value || (status === 'FINISHED' ? 'MS' : '75\'');

                const targetItem = uniqueMatches.find(m => window.MatchTracker.getMatchKey(m.match) === key);
                if (targetItem) {
                    window.MatchTracker.setMatchScore(targetItem.match, homeScore, awayScore, status, minute, null, null, true);
                }
            });

            modalOverlay.classList.remove('active');
            Helpers.showToast('✅ Skorlar başarıyla kaydedildi! Gün sonu kazanma yüzdeleri güncellendi.', 'success');

            if (window.DbService) {
                window.DbService.syncDailyAnalysesWithScores();
            }

            if (app.currentView === 'analysis') {
                app.loadHighConfidenceShowcase();
            } else if (app.currentView === 'history') {
                app.loadHistory();
            } else {
                app.loadDailyCoupons(false, app.activeCouponFilter || 'all');
            }
        });

        modalOverlay.classList.add('active');
    }
};

// Global dışa aktarım
if (typeof window !== 'undefined') {
    window.CouponPanel = CouponPanel;
}
