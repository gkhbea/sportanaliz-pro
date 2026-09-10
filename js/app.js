/**
 * app.js — Ana Uygulama
 * SportAnaliz Pro - Spor Karşılaşması Analiz ve Tahmin Platformu
 */
const App = {
    currentView: 'dashboard',
    currentSport: 'football',
    currentMatch: null,
    matches: [],
    filteredMatches: [],

    /**
     * Uygulama başlat
     */
    async init() {
        console.log('🚀 SportAnaliz Pro başlatılıyor...');

        // Supabase oto bağlantı
        SupabaseConfig.autoConnect();

        // Oturum kontrolü
        if (SupabaseConfig.isConnected) {
            await AuthService.checkSession();
            AuthService.onAuthStateChange((event) => {
                console.log('Auth event:', event);
            });
        }

        // Service Worker Kaydı (Android PWA / APK için)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('✅ ServiceWorker kayıt başarılı:', reg.scope))
                .catch(err => console.warn('ServiceWorker kayıt uyarısı:', err));
        }

        // Event listener'lar
        this.bindEvents();

        // Ayarları yükle
        this.loadSettings();

        // Loading screen'i kaldır
        setTimeout(() => {
            document.getElementById('loading-screen')?.classList.add('fade-out');
            document.getElementById('app')?.classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('loading-screen')?.remove();
            }, 500);
        }, 1500);

        // Dashboard verilerini yükle
        this.loadDashboard();
    },

    /**
     * Event Listener'lar
     */
    bindEvents() {
        // Navigation (Header, Mobil Alt Bar, Üst Kayan Butonlar ve Çekmece Menü)
        document.querySelectorAll('.nav-btn, .m-nav-btn, .m-pill-btn, .m-drawer-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.navigate(view);
                this.closeMobileDrawer();
            });
        });

        // Mobil Menü Hamburger Aç/Kapa
        document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
            this.toggleMobileDrawer();
        });

        // Mobil Çekmeceyi Kapat Butonu & Arka Plan Karartması
        document.getElementById('btn-close-drawer')?.addEventListener('click', () => this.closeMobileDrawer());
        document.getElementById('mobile-drawer-overlay')?.addEventListener('click', () => this.closeMobileDrawer());

        // Mobil Çekmeceden Mail ve Ayarlar
        document.getElementById('btn-mobile-mail-modal')?.addEventListener('click', () => {
            this.closeMobileDrawer();
            this.openMailModal();
        });

        document.getElementById('btn-mobile-settings')?.addEventListener('click', () => {
            this.closeMobileDrawer();
            this.openSettings();
        });

        document.getElementById('btn-mobile-login')?.addEventListener('click', () => {
            this.closeMobileDrawer();
            Helpers.openModal('modal-auth');
        });

        // Logo → Dashboard
        document.getElementById('logo-home')?.addEventListener('click', () => this.navigate('dashboard'));

        // Sport tabs
        document.querySelectorAll('.sport-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sport-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentSport = tab.dataset.sport;
                this.loadDashboard();
            });
        });

        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce(() => this.applyFilters(), 300));
        }

        // Filter selects
        document.getElementById('filter-league')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-date')?.addEventListener('change', () => this.applyFilters());

        // Güven %65+ butonuna tıklama (Dashboard filter bar)
        document.getElementById('btn-quick-high-conf')?.addEventListener('click', () => {
            this.navigate('analysis');
            this.loadHighConfidenceShowcase('all');
        });

        // Güven %65+ stat kartına tıklama
        document.getElementById('stat-high-conf')?.addEventListener('click', () => {
            this.navigate('analysis');
            this.loadHighConfidenceShowcase('all');
        });

        // Günün 4 Kuponu (Benim İçin Bahis Yap) butonuna tıklama
        document.getElementById('btn-quick-coupons')?.addEventListener('click', () => {
            this.navigate('coupons');
            this.loadDailyCoupons(false, 'all', 'today');
        });

        // Dünün Kuponları butonuna tıklama
        document.getElementById('btn-quick-yesterday-coupons')?.addEventListener('click', () => {
            this.navigate('coupons');
            this.loadDailyCoupons(false, 'all', 'yesterday');
        });

        // Şampiyonlar Ligi Özel Kuponu butonuna tıklama
        document.getElementById('btn-quick-ucl-coupon')?.addEventListener('click', () => {
            this.navigate('coupons');
            this.loadDailyCoupons(false, 'ucl');
        });

        // Gün Sonu Maç & Kupon Takip Masası butonuna tıklama
        document.getElementById('btn-quick-tracker')?.addEventListener('click', () => {
            this.navigate('coupons');
            this.loadDailyCoupons(false, 'all').then(() => {
                setTimeout(() => {
                    document.getElementById('tracker-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 150);
            });
        });

        // Günün Tüm Maçları & Bahis Karnesi butonuna tıklama (Dashboard filter bar)
        document.getElementById('btn-quick-all-stats')?.addEventListener('click', () => {
            this.navigate('all-stats');
        });

        // Refresh
        document.getElementById('btn-refresh-data')?.addEventListener('click', () => {
            DataManager.clearCache();
            this.highConfidenceMatches = null;
            this.loadDashboard();
            Helpers.showToast('Veriler yenileniyor...', 'info');
        });

        // Disclaimer close
        document.getElementById('btn-close-disclaimer')?.addEventListener('click', () => {
            document.getElementById('disclaimer-banner')?.remove();
            document.body.classList.add('no-disclaimer');
            const mc = document.querySelector('.main-content');
            if (mc) mc.style.marginTop = 'var(--header-height)';
        });

        // Settings button
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.openSettings();
        });

        // Login button
        document.getElementById('btn-login')?.addEventListener('click', () => {
            Helpers.openModal('modal-auth');
        });

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isLogin = tab.dataset.authTab === 'login';
                document.getElementById('login-form')?.classList.toggle('hidden', !isLogin);
                document.getElementById('register-form')?.classList.toggle('hidden', isLogin);
                document.getElementById('auth-modal-title').textContent = isLogin ? 'Giriş Yap' : 'Kayıt Ol';
            });
        });

        // Login form
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            
            try {
                if (!SupabaseConfig.isConnected) {
                    errorEl.textContent = 'Önce Ayarlar\'dan Supabase bağlantısı kurun.';
                    return;
                }
                await AuthService.login(email, password);
                Helpers.closeModal('modal-auth');
                Helpers.showToast('Giriş başarılı! 👋', 'success');
            } catch (err) {
                errorEl.textContent = err.message || 'Giriş başarısız.';
            }
        });

        // Register form
        document.getElementById('register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorEl = document.getElementById('register-error');
            
            try {
                if (!SupabaseConfig.isConnected) {
                    errorEl.textContent = 'Önce Ayarlar\'dan Supabase bağlantısı kurun.';
                    return;
                }
                await AuthService.register(email, password, name);
                Helpers.closeModal('modal-auth');
                Helpers.showToast('Kayıt başarılı! E-posta onayı gerekebilir.', 'success');
            } catch (err) {
                errorEl.textContent = err.message || 'Kayıt başarısız.';
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                if (modalId) Helpers.closeModal(modalId);
            });
        });

        // Overlay click → close modal
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('active');
            });
        });

        // E-Posta Kupon Gönder Modalını Aç Butonu
        document.getElementById('btn-open-mail-modal')?.addEventListener('click', () => {
            this.openMailModal();
        });

        // E-Posta Gönderme Formu Gönderimi
        document.getElementById('form-send-coupons')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendCouponsEmail();
        });

        // Save Supabase settings
        document.getElementById('btn-save-supabase')?.addEventListener('click', () => {
            const url = document.getElementById('setting-supabase-url').value.trim();
            const key = document.getElementById('setting-supabase-key').value.trim();
            if (url && key) {
                const success = SupabaseConfig.init(url, key);
                if (success) {
                    AuthService.checkSession();
                    Helpers.showToast('Supabase bağlantısı kuruldu! ✅', 'success');
                } else {
                    Helpers.showToast('Bağlantı başarısız. URL ve Key\'i kontrol edin.', 'error');
                }
            } else {
                Helpers.showToast('URL ve Key girilmelidir.', 'warning');
            }
        });

        // Save settings
        document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());

        // Manual form sport type change
        document.querySelectorAll('input[name="sport_type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.sport-option').forEach(o => o.classList.remove('active'));
                radio.closest('.sport-option')?.classList.add('active');
            });
        });

        // Analyze button
        document.getElementById('btn-analyze')?.addEventListener('click', () => this.runManualAnalysis());

        // Clear form
        document.getElementById('btn-clear-form')?.addEventListener('click', () => {
            document.getElementById('manual-form')?.reset();
            Helpers.showToast('Form temizlendi', 'info');
        });

        // Try manual button (from empty state)
        document.getElementById('btn-try-manual')?.addEventListener('click', () => this.navigate('manual'));
    },

    /**
     * Navigation
     */
    navigate(view) {
        this.currentView = view;

        // View'ları güncelle
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`)?.classList.add('active');

        // Nav butonlarını güncelle (Header, Mobil Alt Bar, Kayan Haplar ve Çekmece)
        document.querySelectorAll('.nav-btn, .m-nav-btn, .m-pill-btn, .m-drawer-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`.nav-btn[data-view="${view}"], .m-nav-btn[data-view="${view}"], .m-pill-btn[data-view="${view}"], .m-drawer-item[data-view="${view}"]`).forEach(b => b.classList.add('active'));

        // Sayfa bazlı yükleme
        if (view === 'history') {
            this.loadHistory();
        } else if (view === 'analysis') {
            if (!this.showingSingleMatchAnalysis) {
                this.loadHighConfidenceShowcase('all');
            }
        } else if (view === 'coupons') {
            this.loadDailyCoupons();
        } else if (view === 'all-stats') {
            this.loadAllMatchesStats();
        }
    },

    /**
     * Mobil Çekmece Menü Yönetimi
     */
    toggleMobileDrawer() {
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('mobile-drawer-overlay');
        const isActive = drawer?.classList.contains('active');
        if (isActive) {
            this.closeMobileDrawer();
        } else {
            this.openMobileDrawer();
        }
    },

    openMobileDrawer() {
        document.getElementById('mobile-drawer')?.classList.add('active');
        document.getElementById('mobile-drawer-overlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeMobileDrawer() {
        document.getElementById('mobile-drawer')?.classList.remove('active');
        document.getElementById('mobile-drawer-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    /**
     * Dashboard yükle
     */
    async loadDashboard() {
        const matchesList = document.getElementById('matches-list');
        const emptyState = document.getElementById('empty-matches');
        const matchCount = document.getElementById('match-count');

        // Loading state
        if (matchesList) matchesList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">⏳ Maçlar yükleniyor...</div>';

        try {
            const result = await DataManager.fetchMatches(this.currentSport);
            this.matches = result.matches;
            this.highConfidenceMatches = null;
            
            // Kaynakları göster
            const sourceEl = document.getElementById('stat-data-source');
            if (sourceEl) {
                const val = sourceEl.querySelector('.stat-value');
                if (val) val.textContent = result.sources.length > 0 ? result.sources.join(' + ') : 'Yok';
            }

            this.applyFilters();

            // Hata varsa göster
            if (result.errors.length > 0 && result.matches.length === 0) {
                Helpers.showToast('Veri kaynağına ulaşılamadı. Manuel giriş yapabilirsiniz.', 'warning');
            }
        } catch (err) {
            console.error('Dashboard yükleme hatası:', err);
            if (matchesList) matchesList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            Helpers.showToast('Veri yüklenirken hata oluştu.', 'error');
        }
    },

    /**
     * Filtreleri uygula
     */
    applyFilters() {
        const search = document.getElementById('search-input')?.value || '';
        const league = document.getElementById('filter-league')?.value || '';
        const dateFilter = document.getElementById('filter-date')?.value || 'all';

        this.filteredMatches = DataManager.filterMatches(this.matches, { search, league, dateFilter });

        this.renderMatches();
        this.updateStats();
        this.updateLeagueFilter();
    },

    /**
     * Maçları render et
     */
    renderMatches() {
        const matchesList = document.getElementById('matches-list');
        const emptyState = document.getElementById('empty-matches');
        const matchCount = document.getElementById('match-count');

        if (!matchesList) return;

        if (this.filteredMatches.length === 0) {
            matchesList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (matchCount) matchCount.textContent = '0 maç';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (matchCount) matchCount.textContent = `${this.filteredMatches.length} maç`;

        matchesList.innerHTML = MatchCard.renderList(this.filteredMatches);

        // Maç kartlarına tıklama
        matchesList.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.matchIndex);
                this.openMatchAnalysis(this.filteredMatches[index]);
            });
        });
    },

    /**
     * İstatistikleri güncelle
     */
    updateStats() {
        const totalEl = document.querySelector('#stat-total-matches .stat-value');
        if (totalEl) totalEl.textContent = this.matches.length;

        // Value bet sayısı
        let valueBets = 0;
        (this.filteredMatches || []).forEach(m => {
            if (m.odds?.home && m.odds?.draw && m.odds?.away) {
                const margin = Statistics.calculateMargin(m.odds.home, m.odds.draw, m.odds.away);
                if (margin < 8) valueBets++;
            }
        });

        // Güven %65+ sayısı
        const highConfList = this.highConfidenceMatches || this.computeHighConfidenceMatches();

        const valueEl = document.querySelector('#stat-value-bets .stat-value');
        if (valueEl) valueEl.textContent = valueBets;

        const confEl = document.querySelector('#stat-high-conf .stat-value');
        if (confEl) confEl.textContent = highConfList.length;
    },

    /**
     * Lig filtresi güncelle
     */
    updateLeagueFilter() {
        const select = document.getElementById('filter-league');
        if (!select) return;

        const leagues = DataManager.getLeagues(this.matches);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Tüm Ligler</option>';
        leagues.forEach(league => {
            select.innerHTML += `<option value="${Helpers.escapeHtml(league)}">${Helpers.escapeHtml(league)}</option>`;
        });
        select.value = currentValue;
    },

    /**
     * Maç analizini standartlaştırılmış şekilde üret
     */
    getMatchAnalysis(match) {
        if (!match) return null;

        const analysisData = {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            matchDate: match.matchDate,
            home: {
                goals_scored_avg: 1.4,
                goals_conceded_avg: 1.1,
                home_goals_avg: 1.6,
                home_conceded_avg: 0.9,
                last5_wins: 3, last5_draws: 1, last5_losses: 1
            },
            away: {
                goals_scored_avg: 1.2,
                goals_conceded_avg: 1.3,
                away_goals_avg: 1.0,
                away_conceded_avg: 1.5,
                last5_wins: 2, last5_draws: 1, last5_losses: 2
            },
            odds: match.odds || {},
            h2h: {}
        };

        if (match.odds?.home && match.odds?.away) {
            const homeImplied = Statistics.oddsToImpliedProbability(match.odds.home) / 100;
            const awayImplied = Statistics.oddsToImpliedProbability(match.odds.away) / 100;
            analysisData.home.home_goals_avg = 0.8 + homeImplied * 2;
            analysisData.home.home_conceded_avg = 0.5 + awayImplied * 1.5;
            analysisData.away.away_goals_avg = 0.6 + awayImplied * 2;
            analysisData.away.away_conceded_avg = 0.5 + homeImplied * 1.5;
        }

        let result = FootballAnalysis.analyze(analysisData);

        const risk = RiskEngine ? RiskEngine.evaluate(result) : null;
        return { result, risk, analysisData };
    },

    /**
     * Güven Seviyesi %65 ve üzeri olan maçları hesapla ve sırala
     */
    computeHighConfidenceMatches() {
        const list = [];
        (this.matches || []).forEach((match, idx) => {
            const an = this.getMatchAnalysis(match);
            if (!an || !an.result) return;

            const ed = EditorEngine ? EditorEngine.evaluate(an.result, match, an.risk) : null;
            if (!ed || !ed.topPick) return;

            const top = ed.topPick;
            if (top.confidenceScore >= 65 || top.probability >= 65) {
                list.push({
                    match,
                    index: idx,
                    analysis: an.result,
                    risk: an.risk,
                    editor: ed,
                    topPick: top,
                    confidenceScore: top.confidenceScore,
                    probability: top.probability
                });
            }
        });

        // Güven skoruna ve olasılığa göre azalan sırala
        list.sort((a, b) => (b.confidenceScore * 1.5 + b.probability) - (a.confidenceScore * 1.5 + a.probability));
        this.highConfidenceMatches = list;
        return list;
    },

    /**
     * Güven %65+ Maçlar Vitrini (Analiz Ekranı)
     * @param {string|null} filterType - 'all', '75', '80', 'taraf', 'gol', 'ilkyari'
     * @param {string|null} sortType - 'confidence', 'date_asc', 'date_desc', 'prob_desc', 'odd_desc'
     * @param {string|null} dateFilter - 'all', 'today', 'tomorrow', 'week'
     */
    async loadHighConfidenceShowcase(filterType = null, sortType = null, dateFilter = null) {
        this.showingSingleMatchAnalysis = false;

        // State güncelle
        if (filterType !== null) this.highConfFilter = filterType;
        if (sortType !== null) this.highConfSort = sortType;
        if (dateFilter !== null) this.highConfDate = dateFilter;

        const currentFilter = this.highConfFilter || 'all';
        const currentSort = this.highConfSort || 'date_asc';
        const currentDate = this.highConfDate || 'all';

        const container = document.getElementById('analysis-container');
        if (!container) return;

        // Maçlar henüz gelmediyse yükle
        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <div class="spinner" style="margin:0 auto 16px;"></div>
                    <h3 style="color:var(--text-primary);margin-bottom:8px;">Bülten ve %65+ Güven Analizleri Yükleniyor...</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;">4 platformdan (Nesine, Bilyoner, İddaa, Misli) bülten verileri ve yazar tahminleri taranıyor.</p>
                </div>
            `;
            await this.loadDashboard();
        }

        // Gerçek canlı ve biten maç skorlarını otomatik senkronize et (Simülasyon yok)
        if (window.LiveScoreService && (!LiveScoreService.lastFetchedAt || (Date.now() - LiveScoreService.lastFetchedAt.getTime() > 60000))) {
            try {
                await LiveScoreService.syncBulletinMatches(this.matches || []);
            } catch (e) {
                console.warn('Canlı skor analiz senkronizasyon uyarısı:', e);
            }
        }

        const highConfList = this.highConfidenceMatches || this.computeHighConfidenceMatches();

        // 1. Kategori Filtresi
        let filteredList = highConfList;
        if (currentFilter === '75') {
            filteredList = highConfList.filter(item => item.confidenceScore >= 75 || item.probability >= 75);
        } else if (currentFilter === '80') {
            filteredList = highConfList.filter(item => item.confidenceScore >= 80 || item.probability >= 80);
        } else if (currentFilter === 'taraf') {
            filteredList = highConfList.filter(item => item.topPick.category === 'taraf' || item.topPick.marketCode.startsWith('MS') || item.topPick.marketCode.startsWith('CS'));
        } else if (currentFilter === 'gol') {
            filteredList = highConfList.filter(item => item.topPick.category === 'gol' || item.topPick.marketCode.includes('OVER') || item.topPick.marketCode.includes('UNDER') || item.topPick.marketCode.includes('BTTS'));
        } else if (currentFilter === 'ilkyari') {
            filteredList = highConfList.filter(item => item.topPick.category === 'ilkyari' || item.topPick.marketCode.includes('IY'));
        }

        // 2. Tarih Filtresi (Tüm Günler, Bugün, Yarın, Bu Hafta)
        if (currentDate && currentDate !== 'all') {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();
            const d = now.getDate();
            const todayStart = new Date(y, m, d, 0, 0, 0);
            const tomorrowStart = new Date(y, m, d + 1, 0, 0, 0);
            const dayAfterTomorrowStart = new Date(y, m, d + 2, 0, 0, 0);
            const weekEnd = new Date(y, m, d + 7, 23, 59, 59);

            filteredList = filteredList.filter(item => {
                if (!item.match.matchDate) return true;
                const md = new Date(item.match.matchDate);
                if (isNaN(md.getTime())) return true;
                if (currentDate === 'today') return md >= todayStart && md < tomorrowStart;
                if (currentDate === 'tomorrow') return md >= tomorrowStart && md < dayAfterTomorrowStart;
                if (currentDate === 'week') return md >= todayStart && md <= weekEnd;
                return true;
            });
        }

        // 3. Sıralama (Varsayılan: Saat ve Tarihe Göre Kronolojik Sıralama)
        filteredList = [...filteredList].sort((a, b) => {
            const timeA = a.match.matchDate ? new Date(a.match.matchDate).getTime() : 0;
            const timeB = b.match.matchDate ? new Date(b.match.matchDate).getTime() : 0;

            if (currentSort === 'date_asc') {
                // En erken/yakın başlayan maç önce (aynı saatteyse güvene göre)
                if (timeA !== timeB) {
                    if (!timeA) return 1;
                    if (!timeB) return -1;
                    return timeA - timeB;
                }
                return b.confidenceScore - a.confidenceScore;
            } else if (currentSort === 'date_desc') {
                // En ileri tarihli maç önce
                if (timeA !== timeB) {
                    if (!timeA) return 1;
                    if (!timeB) return -1;
                    return timeB - timeA;
                }
                return b.confidenceScore - a.confidenceScore;
            } else if (currentSort === 'prob_desc') {
                // En yüksek kazanma olasılığı önce
                return b.probability - a.probability;
            } else if (currentSort === 'odd_desc') {
                // En yüksek oran önce
                return (b.topPick.odd || 0) - (a.topPick.odd || 0);
            } else {
                // En Yüksek Güven Skoru + Olasılık Dengesi
                const scoreA = (a.confidenceScore * 1.5) + a.probability;
                const scoreB = (b.confidenceScore * 1.5) + b.probability;
                if (scoreB !== scoreA) return scoreB - scoreA;
                // Eşitlik durumunda en yakın tarih önce
                if (timeA && timeB) return timeA - timeB;
                return 0;
            }
        });

        // Günlük analiz edilen tüm maçları veritabanına kaydet ve maç skorlarıyla eşle
        if (window.DbService) {
            await DbService.batchSaveDailyAnalyses(filteredList);
            await DbService.syncDailyAnalysesWithScores();
        }
        const accStats = window.DbService ? await DbService.getDailyAccuracyStats('today') : null;

        container.innerHTML = `
            <div class="high-conf-container animate-fade-in">
                <!-- Üst Hero Başlık & AI Gün Sonu Doğruluk Karnesi -->
                <div class="high-conf-hero">
                    <div class="high-conf-title-row">
                        <div class="high-conf-title">
                            <span>🎯 Güven %65+ Analiz Masası & Vitrini</span>
                        </div>
                        <span class="high-conf-counter-badge">
                            🔥 Toplam ${highConfList.length} Maç / Filtrelenen: ${filteredList.length} Tercih
                        </span>
                    </div>
                    <p class="high-conf-desc">
                        Bu ekranda <strong>4 platformun</strong> (Nesine.com, Bilyoner.com, İddaa.com, Misli.com) bülten oranları, 
                        yazar konsensüsleri ve istatistiksel modelleri taranarak 
                        <strong>Güven Seviyesi veya Kazanma İhtimali %65 ve üzerinde</strong> olan tüm maçlar listelenmektedir.
                    </p>

                    <!-- AI Gün Sonu Doğruluk Karnesi & Canlı Veritabanı Masası -->
                    <div class="ai-accuracy-banner">
                        <div class="ai-acc-header">
                            <div class="ai-acc-title-group">
                                <span class="ai-acc-pill">🤖 AI GÜN SONU TAHMİN KARNESİ · CANLI VERİTABANI</span>
                                <h3 class="ai-acc-title">Günün Analiz Edilen Maçları & AI Doğruluk Karnesi</h3>
                                <p class="ai-acc-sub">
                                    Analiz edilen maçlar ve önerilen tercihler veritabanında saklanır. 
                                    Gerçek maç sonuçları ve canlı skorlar çekilerek AI'nin doğru tahmin yüzdesi anlık hesaplanır.
                                </p>
                            </div>
                            <div class="ai-acc-gauge-box">
                                <div class="ai-acc-gauge-val" style="color: ${accStats && accStats.accuracyRate >= 70 ? 'var(--accent-green)' : (accStats && accStats.accuracyRate >= 50 ? 'var(--accent-amber)' : 'var(--accent-cyan)')};">
                                    ${accStats && accStats.decidedCount > 0 ? '%' + accStats.accuracyRate : '—'}
                                </div>
                                <span class="ai-acc-gauge-lbl">AI İSABET ORANI</span>
                            </div>
                        </div>

                        <!-- İstatistik Rozetleri -->
                        <div class="ai-acc-stats-strip">
                            <div class="ai-stat-item">
                                <span class="lbl">Kayıtlı Analiz:</span>
                                <strong class="val">${accStats ? accStats.total : filteredList.length} Maç</strong>
                            </div>
                            <div class="ai-stat-item stat-correct">
                                <span class="lbl">Tutan Tahmin:</span>
                                <strong class="val">✅ ${accStats ? accStats.correctCount : 0} Doğru</strong>
                            </div>
                            <div class="ai-stat-item stat-incorrect">
                                <span class="lbl">Yatan Tahmin:</span>
                                <strong class="val">❌ ${accStats ? accStats.incorrectCount : 0} Yanılma</strong>
                            </div>
                            <div class="ai-stat-item stat-pending">
                                <span class="lbl">Devam / Bekleyen:</span>
                                <strong class="val">⏳ ${accStats ? accStats.pendingCount : filteredList.length}</strong>
                            </div>
                            <div class="ai-stat-item stat-ultra" title="Ultra Güven (%80+) Tahmin Başarısı">
                                <span class="lbl">💎 %80+ Ultra Güven:</span>
                                <strong class="val">${accStats && accStats.ultra.decided > 0 ? '%' + accStats.ultra.rate : (accStats ? accStats.ultra.total + ' Maç' : '—')}</strong>
                            </div>
                        </div>

                        <!-- Aksiyon Çubuğu -->
                        <div class="ai-acc-actions">
                            <button class="btn btn-primary btn-sm" id="btn-conf-sync-live" title="Gerçek dünya canlı skorlarını çek ve analiz doğruluğunu anlık güncelle">
                                🔄 Canlı Skorları Çek & Sonuçları Gör
                            </button>
                            <button class="btn btn-ghost btn-sm" id="btn-conf-open-scores" title="Maç skorlarını elle gir veya düzenle">
                                ✏️ Skorları Manuel Düzenle
                            </button>
                            <button class="btn btn-ghost btn-sm" id="btn-conf-go-history" title="Tüm kayıtlı analizleri ve veritabanı geçmişini incele">
                                📋 Veritabanı Geçmişi ➔
                            </button>
                        </div>
                    </div>

                    <!-- Filtreler & Sıralama Kontrolleri -->
                    <div class="high-conf-controls-bar">
                        <div class="high-conf-filter-pills" id="high-conf-filters">
                            <button class="conf-pill ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Tümü (%65+) (${highConfList.length})</button>
                            <button class="conf-pill ${currentFilter === '75' ? 'active' : ''}" data-filter="75">Yüksek Güven (%75+)</button>
                            <button class="conf-pill ${currentFilter === '80' ? 'active' : ''}" data-filter="80">Ultra Güven (%80+) 💎</button>
                            <button class="conf-pill ${currentFilter === 'taraf' ? 'active' : ''}" data-filter="taraf">Taraf (MS 1/2)</button>
                            <button class="conf-pill ${currentFilter === 'gol' ? 'active' : ''}" data-filter="gol">Gol Bahisleri (Üst/Alt)</button>
                            <button class="conf-pill ${currentFilter === 'ilkyari' ? 'active' : ''}" data-filter="ilkyari">İlk Yarı (İY)</button>
                        </div>

                        <div class="high-conf-sort-actions">
                            <!-- Tarih Filtresi -->
                            <div class="high-conf-select-group">
                                <span class="high-conf-select-label">Tarih:</span>
                                <select id="select-high-conf-date" class="high-conf-select">
                                    <option value="all" ${currentDate === 'all' ? 'selected' : ''}>📅 Tüm Tarihler</option>
                                    <option value="today" ${currentDate === 'today' ? 'selected' : ''}>Bugün</option>
                                    <option value="tomorrow" ${currentDate === 'tomorrow' ? 'selected' : ''}>Yarın</option>
                                    <option value="week" ${currentDate === 'week' ? 'selected' : ''}>Bu Hafta</option>
                                </select>
                            </div>

                            <!-- Sıralama Ölçütü (Varsayılan: Saat ve Tarihe Göre) -->
                            <div class="high-conf-select-group">
                                <span class="high-conf-select-label">Sırala:</span>
                                <select id="select-high-conf-sort" class="high-conf-select">
                                    <option value="date_asc" ${currentSort === 'date_asc' ? 'selected' : ''}>⏱️ Tarih & Saat (En Yakın Maç Önce) ★</option>
                                    <option value="confidence" ${currentSort === 'confidence' ? 'selected' : ''}>⭐ En Yüksek Güven</option>
                                    <option value="date_desc" ${currentSort === 'date_desc' ? 'selected' : ''}>📅 Tarih (En İleri Tarih Önce)</option>
                                    <option value="prob_desc" ${currentSort === 'prob_desc' ? 'selected' : ''}>📈 En Yüksek Olasılık (% İhtimal)</option>
                                    <option value="odd_desc" ${currentSort === 'odd_desc' ? 'selected' : ''}>💰 En Yüksek Oran</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Kartlar Listesi -->
                ${filteredList.length === 0 ? `
                    <div class="empty-state" style="padding:60px 20px;">
                        <span class="empty-icon">🔍</span>
                        <h3>Bu filtrelere uygun %65+ maç bulunamadı</h3>
                        <p>Tarih veya kategori filtresini değiştirerek diğer karşılaşmaları görüntüleyebilirsiniz.</p>
                        <button class="btn btn-primary btn-sm" id="btn-reset-conf-filter" style="margin-top:14px;">Filtreleri Sıfırla (Tüm %65+ Maçlar)</button>
                    </div>
                ` : `
                    <div class="high-conf-grid">
                        ${filteredList.map((item, i) => {
                            const m = item.match;
                            const top = item.topPick;
                            const ed = item.editor;
                            const cons = ed.consensus || { percentage: 75 };
                            const stars = '⭐'.repeat(Math.min(5, Math.max(3, Math.round(top.confidenceScore / 20))));
                            const timeStr = m.matchDate ? Helpers.formatDate(m.matchDate, 'time') : (m.matchTime || 'Bugün');
                            const dateStr = m.matchDate ? Helpers.formatDate(m.matchDate, 'short') : '';
                            const bestOdd = top.odd ? Number(top.odd).toFixed(2) : '—';
                            const valueBadge = (top.valueEdge > 0) ? `<span style="color:var(--accent-green);font-weight:700;">💎 +%${top.valueEdge} Value</span>` : '';
                            const isDateSorted = (currentSort === 'date_asc' || currentSort === 'date_desc');
                            const timeStyle = isDateSorted ? 'background:rgba(0,240,255,0.12);border:1px solid rgba(0,240,255,0.3);padding:2px 8px;border-radius:4px;' : '';

                            // Maç skoru ve AI tahmin değerlendirmesi
                            const scoreData = window.MatchTracker ? window.MatchTracker.getMatchScore(m) : { homeScore: 0, awayScore: 0, status: 'NOT_STARTED', minute: '00:00' };
                            const evalPick = window.MatchTracker ? window.MatchTracker.evaluatePick(top, scoreData) : { status: 'PENDING', badge: '⏳ Bekliyor', css: 'status-pending' };
                            const isWon = evalPick.status === 'WON';
                            const isLiveWin = evalPick.status === 'LIVE_WINNING';
                            const isLost = evalPick.status === 'LOST';

                            let cardStatusClass = '';
                            let wonHeaderBanner = '';
                            if (isWon) {
                                cardStatusClass = 'match-won-card';
                                wonHeaderBanner = `
                                    <div class="match-won-hero-banner">
                                        <div class="m-won-left">
                                            <span class="m-won-badge">✅ TAHMİN TUTTU!</span>
                                            <span class="m-won-desc">${Helpers.escapeHtml(evalPick.detail || 'Tercih Başarıyla Geldi')}</span>
                                        </div>
                                        <div class="m-won-right">
                                            <span class="m-won-pill">KAZANDI 🎯</span>
                                            <span class="m-won-score">${scoreData.homeScore} - ${scoreData.awayScore} (MS)</span>
                                        </div>
                                    </div>
                                `;
                            } else if (isLiveWin) {
                                cardStatusClass = 'match-live-win-card';
                                wonHeaderBanner = `
                                    <div class="match-live-hero-banner">
                                        <div class="m-live-left">
                                            <span class="m-live-badge">⏳ CANLI · TAHMİN TUTUYOR</span>
                                            <span class="m-live-desc">${Helpers.escapeHtml(evalPick.detail || 'Şu an lehte gidiyor')}</span>
                                        </div>
                                        <div class="m-live-right">
                                            <span class="m-live-score">${scoreData.homeScore} - ${scoreData.awayScore} (${scoreData.minute || 'Canlı'})</span>
                                        </div>
                                    </div>
                                `;
                            } else if (isLost) {
                                cardStatusClass = 'match-lost-card';
                            }

                            return `
                                <div class="high-conf-card ${cardStatusClass}" data-conf-index="${i}">
                                    ${wonHeaderBanner}
                                    <div class="high-conf-card-header">
                                        <span class="high-conf-league">${Helpers.escapeHtml(m.league || 'Bülten')}</span>
                                        <div style="display:flex;align-items:center;gap:6px;">
                                            <span class="high-conf-time" style="${timeStyle}">📅 ${dateStr ? dateStr + ' ' : ''}⏰ ${timeStr}</span>
                                            <!-- Canlı / Biten Skor Kutucuğu -->
                                            <div class="high-conf-score-badge ${scoreData.status.toLowerCase()}" title="Canlı/Maç Sonu Skoru">
                                                <span class="hc-score-txt">${scoreData.homeScore} - ${scoreData.awayScore}</span>
                                                <span class="hc-score-min">${scoreData.status === 'FINISHED' ? 'MS' : (scoreData.status === 'LIVE' ? scoreData.minute : '00:00')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="high-conf-teams-row">
                                        <div class="high-conf-team-name">${Helpers.escapeHtml(m.homeTeam)}</div>
                                        <span class="high-conf-vs-badge">VS</span>
                                        <div class="high-conf-team-name away">${Helpers.escapeHtml(m.awayTeam)}</div>
                                    </div>

                                    <div class="high-conf-pick-box">
                                        <div class="high-conf-pick-left">
                                            <span class="high-conf-pick-label">ÖNERİLEN TERCİH · GÜVEN %${top.confidenceScore}</span>
                                            <span class="high-conf-pick-value">${Helpers.escapeHtml(top.shortPick || top.title)}</span>
                                        </div>
                                        <div class="high-conf-pick-right">
                                            <div style="display:flex;flex-direction:column;align-items:flex-end;">
                                                <span class="high-conf-prob-text">%${top.probability}</span>
                                                <div class="high-conf-odd-text">Oran: <strong>${bestOdd}</strong></div>
                                            </div>
                                            <!-- AI Doğruluk Rozeti -->
                                            <div class="ai-eval-pill ${evalPick.css}">
                                                ${evalPick.badge}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="high-conf-meta-row">
                                        <span title="4 Platform Konsensüsü" style="display:flex;align-items:center;gap:4px;">
                                            <span>🟡🔵🟢🔴</span>
                                            <strong style="color:${cons.color || 'var(--accent-cyan)'};">%${cons.percentage} Konsensüs</strong>
                                        </span>
                                        <div>
                                            ${valueBadge}
                                            <span class="high-conf-stars" style="margin-left:6px;">${stars}</span>
                                        </div>
                                    </div>

                                    <div style="display:flex;gap:8px;align-items:center;">
                                        <button class="high-conf-btn" data-conf-index="${i}" style="flex:1;">
                                            Detaylı 4 Platform Analizini Gör ➔
                                        </button>
                                        <a href="${scoreData.mackolikUrl || m.mackolikUrl || 'https://arsiv.mackolik.com/Canli-Sonuclar'}" target="_blank" rel="noopener noreferrer" class="btn-mackolik-pill" title="Maçkolik canlı skor ve istatistik sayfası üzerinden teyit et" onclick="event.stopPropagation();">
                                            🟢 Maçkolik Teyit ↗
                                        </a>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        // Gerçek Canlı Skorları Çek & Analiz Karnesini Güncelle
        container.querySelector('#btn-conf-sync-live')?.addEventListener('click', async () => {
            const btn = container.querySelector('#btn-conf-sync-live');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Skorlar Çekiliyor...';
            }
            Helpers.showToast('🔄 Gerçek canlı skorlar çekiliyor ve analiz karnesi taranıyor...', 'info');

            try {
                if (window.LiveScoreService) {
                    await window.LiveScoreService.syncBulletinMatches(this.matches || []);
                }
                if (window.DbService) {
                    await DbService.syncDailyAnalysesWithScores();
                }
                Helpers.showToast('✅ Canlı skorlar güncellendi! Tutan tahminler yeşil renkle işaretlendi.', 'success');
                this.loadHighConfidenceShowcase();
            } catch (err) {
                console.error('Canlı skor vitrin senkronizasyon hatası:', err);
                Helpers.showToast('⚠️ Canlı skorlar güncellenirken bir sorun oluştu.', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '🔄 Canlı Skorları Çek & Sonuçları Gör';
                }
            }
        });

        container.querySelector('#btn-conf-open-scores')?.addEventListener('click', () => {
            if (window.CouponPanel) {
                window.CouponPanel.openScoreEditorModal(this, filteredList);
            }
        });

        container.querySelector('#btn-conf-go-history')?.addEventListener('click', () => {
            this.navigate('history');
            this.loadHistory('today');
        });

        // Filter pills event listeners
        container.querySelectorAll('.conf-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const f = e.currentTarget.dataset.filter;
                this.loadHighConfidenceShowcase(f, this.highConfSort, this.highConfDate);
            });
        });

        // Sort select event listener
        container.querySelector('#select-high-conf-sort')?.addEventListener('change', (e) => {
            this.loadHighConfidenceShowcase(this.highConfFilter, e.target.value, this.highConfDate);
        });

        // Date select event listener
        container.querySelector('#select-high-conf-date')?.addEventListener('change', (e) => {
            this.loadHighConfidenceShowcase(this.highConfFilter, this.highConfSort, e.target.value);
        });

        // Reset button
        container.querySelector('#btn-reset-conf-filter')?.addEventListener('click', () => {
            this.loadHighConfidenceShowcase('all', 'confidence', 'all');
        });

        // Card clicks
        container.querySelectorAll('.high-conf-card, .high-conf-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const idx = parseInt(el.dataset.confIndex);
                if (!isNaN(idx) && filteredList[idx]) {
                    this.openMatchAnalysis(filteredList[idx].match);
                }
            });
        });
    },

    /**
     * Maç analizi aç (quick analysis from dashboard or showcase)
     */
    openMatchAnalysis(match, inContainer = false) {
        if (!match) return;
        this.currentMatch = match;

        const an = this.getMatchAnalysis(match);
        if (!an) return;

        const result = an.result;
        const riskResult = an.risk;
        const editorAnalysis = EditorEngine ? EditorEngine.evaluate(result, match, riskResult) : null;

        if (inContainer) {
            this.showingSingleMatchAnalysis = true;
            this.navigate('analysis');
            const container = document.getElementById('analysis-container');
            if (container) {
                const backBtnHtml = `
                    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                        <button class="btn btn-ghost btn-sm" id="btn-back-to-high-conf">
                            ← Güven %65+ Vitrinine Dön
                        </button>
                        <span class="badge badge-primary">🎯 Detaylı 4 Platform Analizi</span>
                    </div>
                `;
                container.innerHTML = backBtnHtml + AnalysisPanel.render(result, riskResult, match, editorAnalysis);
                container.querySelector('#btn-back-to-high-conf')?.addEventListener('click', () => {
                    this.loadHighConfidenceShowcase('all');
                });
            }
        } else {
            // Modal aç
            const title = document.getElementById('analysis-detail-title');
            const body = document.getElementById('analysis-detail-body');
            if (title) title.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
            if (body) body.innerHTML = AnalysisPanel.render(result, riskResult, match, editorAnalysis);

            Helpers.openModal('modal-analysis-detail');
        }

        // Auto save
        const settings = Helpers.storage.get('user_settings', {});
        if (settings.auto_save_analysis !== false) {
            this.saveAnalysisToHistory(result, riskResult);
        }
    },

    /**
     * Günlük 4 AI Garantör Kuponunu ve Şampiyonlar Ligi Özel Kuponunu Yükle
     */
    async loadDailyCoupons(forceRefresh = false, activeFilter = null, targetDate = null) {
        const container = document.getElementById('coupons-container');
        if (!container) return;

        if (activeFilter) {
            this.activeCouponFilter = activeFilter;
        }
        const currentFilter = this.activeCouponFilter || 'all';

        if (targetDate) {
            this.selectedCouponDate = targetDate;
        }
        const activeDate = this.selectedCouponDate || 'today';
        const isYesterday = (activeDate === 'yesterday' || activeDate === '2026-09-09');

        if (!window.CouponEngine || !window.CouponPanel) {
            container.innerHTML = '<div class="empty-state"><h3>Kupon motoru yüklenemedi.</h3></div>';
            return;
        }

        // DÜNÜN KUPONLARI: Arşivden yükle (Bugünün bültenini bekletmeden anında sun)
        if (isYesterday) {
            const yData = CouponEngine.getYesterdayCoupons();
            const coupons = yData.coupons || [];
            const euroCoupons = yData.euroCoupons || [];

            container.innerHTML = CouponPanel.render(coupons, euroCoupons, currentFilter, 'yesterday');
            CouponPanel.bindEvents(this, coupons, euroCoupons, 'yesterday');
            return;
        }

        // BUGÜNÜN KUPONLARI:
        // Maçlar henüz çekilmediyse önce bülteni çek
        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <div class="spinner" style="margin:0 auto 16px;"></div>
                    <h3 style="color:var(--text-primary);margin-bottom:8px;">Bülten Taranıyor ve Kuponlar Hesaplanıyor...</h3>
                    <p style="color:var(--text-secondary);font-size:0.9rem;">4 platformdan oranlar harmanlanarak en garantör maçlar seçiliyor.</p>
                </div>
            `;
            await this.loadDashboard();
        }

        // Gerçek canlı ve biten maç skorlarını otomatik senkronize et (Simülasyon yok)
        if (window.LiveScoreService && (!LiveScoreService.lastFetchedAt || (Date.now() - LiveScoreService.lastFetchedAt.getTime() > 60000))) {
            try {
                await LiveScoreService.syncBulletinMatches(this.matches);
            } catch (e) {
                console.warn('Canlı skor kupon senkronizasyon uyarısı:', e);
            }
        }

        const coupons = CouponEngine.generateDailyCoupons(this.matches, forceRefresh);
        const euroCoupons = CouponEngine.generateEuropeanCoupons(this.matches, forceRefresh);
        const hourlyCoupon = CouponEngine.generateHourlyCoupon ? CouponEngine.generateHourlyCoupon(this.matches, 3, forceRefresh) : null;

        container.innerHTML = CouponPanel.render(coupons, euroCoupons, currentFilter, 'today', hourlyCoupon);
        CouponPanel.bindEvents(this, coupons, euroCoupons, 'today');
    },

    /**
     * Günün Tüm Maçları & Bütün Bahis Analizleri Masasını Yükle
     */
    async loadAllMatchesStats(search = '', statusFilter = 'all') {
        const container = document.getElementById('all-stats-container');
        if (!container) return;

        this.currentAllStatsSearch = search;
        this.currentAllStatsFilter = statusFilter;

        // Maçlar henüz yoksa yükle
        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <div class="loading-bar" style="width:220px;margin:0 auto 16px;"><div class="loading-bar-fill"></div></div>
                    <h3 style="color:#ffffff;">Günün Maçları Çekiliyor ve Bahis Analizleri Hesaplanıyor...</h3>
                    <p style="color:var(--text-muted);font-size:0.88rem;">Tüm ligler taranıyor, Maç Sonucu, Alt/Üst, KG ve İY ihtimalleri inceleniyor.</p>
                </div>
            `;
            await this.loadDashboard();
        }

        if (!window.MatchTracker || !window.AllMatchesTrackerPanel) {
            container.innerHTML = '<div class="empty-state"><h3>İstatistik motoru yüklenemedi.</h3></div>';
            return;
        }

        // Canlı skor servisinden GERÇEK canlı ve biten maç skorlarını çek ve eşleştir
        if (window.LiveScoreService && this.matches && this.matches.length > 0) {
            try {
                await LiveScoreService.syncBulletinMatches(this.matches);
            } catch (syncErr) {
                console.warn('Canlı skor senkronizasyon uyarısı:', syncErr);
            }
        }

        // Tüm maçların istatistiklerini hesapla
        const stats = MatchTracker.calculateAllDailyMatchesStats(this.matches);
        this.currentAllMatchesStats = stats;

        // Otomatik olarak yerel hafızaya kaydet
        if (window.DBService) {
            DBService.saveAllMatchesResultsAndBetStats(stats);
        }

        container.innerHTML = AllMatchesTrackerPanel.render(stats, search, statusFilter);
        this.bindAllMatchesEvents(container, search, statusFilter);

        // Canlı takip döngüsünü başlat (45sn)
        if (!this.isAutoPollingInitialized && window.LiveScoreService) {
            this.isAutoPollingInitialized = true;
            this.isAutoPollingActive = true;
            LiveScoreService.startAutoPolling(() => this.matches, () => {
                if (this.currentView === 'all-stats') {
                    this.loadAllMatchesStats(this.currentAllStatsSearch || '', this.currentAllStatsFilter || 'all');
                }
            }, 45000);
        }
    },

    /**
     * Tüm Maçlar Masası Event'lerini Bağla
     */
    bindAllMatchesEvents(container, currentSearch, currentFilter) {
        // 1. Canlı Skorları Çek & Senkronize Et (Doğrudan canlı sonuçlar)
        container.querySelector('#btn-all-matches-sync-live')?.addEventListener('click', async () => {
            if (!this.matches || this.matches.length === 0) return;
            Helpers.showToast('📡 Canlı skorlar doğrudan kaynaktan çekiliyor...', 'info');

            if (window.LiveScoreService) {
                const res = await LiveScoreService.syncBulletinMatches(this.matches);
                const updated = MatchTracker.calculateAllDailyMatchesStats(this.matches);
                this.currentAllMatchesStats = updated;
                if (window.DBService) DBService.saveAllMatchesResultsAndBetStats(updated);
                this.loadAllMatchesStats(this.currentAllStatsSearch || '', this.currentAllStatsFilter || 'all');
                Helpers.showToast(`✅ Canlı sonuçlar senkronize edildi! (${res.finishedCount} Bitti, ${res.liveCount} Canlı)`, 'success');
            }
        });

        // 2. Canlı Otomatik Takip Toggle (Açık/Kapalı)
        const toggleBtn = container.querySelector('#btn-toggle-auto-polling');
        if (toggleBtn) {
            toggleBtn.textContent = this.isAutoPollingActive ? '⏱️ Canlı Takip: Açık (45sn)' : '⏱️ Canlı Takip: Kapalı';
            toggleBtn.addEventListener('click', () => {
                this.isAutoPollingActive = !this.isAutoPollingActive;
                if (this.isAutoPollingActive) {
                    LiveScoreService.startAutoPolling(() => this.matches, () => {
                        if (this.currentView === 'all-stats') {
                            this.loadAllMatchesStats(this.currentAllStatsSearch || '', this.currentAllStatsFilter || 'all');
                        }
                    }, 45000);
                    toggleBtn.textContent = '⏱️ Canlı Takip: Açık (45sn)';
                    Helpers.showToast('⏱️ Otomatik canlı takip açıldı (45sn aralıkla güncellenir).', 'info');
                } else {
                    LiveScoreService.stopAutoPolling();
                    toggleBtn.textContent = '⏱️ Canlı Takip: Kapalı';
                    Helpers.showToast('Otomatik canlı takip durduruldu.', 'info');
                }
            });
        }

        // 3. Supabase Kaydet
        container.querySelector('#btn-all-matches-save-db')?.addEventListener('click', async () => {
            if (this.currentAllMatchesStats && window.DBService) {
                await DBService.saveAllMatchesResultsAndBetStats(this.currentAllMatchesStats);
                Helpers.showToast('💾 Tüm canlı maç sonuçları ve bahis istatistikleri Supabase Cloud & belleğe kaydedildi!', 'success');
            } else {
                Helpers.showToast('Kaydedilecek veri bulunamadı.', 'warning');
            }
        });

        // 5. Filtre Tab Butonları
        container.querySelectorAll('.all-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.filter;
                this.loadAllMatchesStats(this.currentAllStatsSearch || '', f);
            });
        });

        // 6. Arama Inputu
        const searchInput = container.querySelector('#all-stats-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce((e) => {
                this.loadAllMatchesStats(e.target.value, this.currentAllStatsFilter || 'all');
            }, 300));
        }

        // 7. Skoru Değiştir Butonları
        container.querySelectorAll('.btn-edit-score').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.matchKey;
                AllMatchesTrackerPanel.openScoreModal(this, key);
            });
        });

        // 8. Tekrar Yükle butonu (empty state)
        container.querySelector('#btn-reload-all-matches-stats')?.addEventListener('click', () => {
            this.loadAllMatchesStats();
        });
    },

    /**
     * Manuel analiz çalıştır
     */
    runManualAnalysis() {
        const sportType = document.querySelector('input[name="sport_type"]:checked')?.value || 'football';
        const homeTeam = document.getElementById('home_team')?.value?.trim();
        const awayTeam = document.getElementById('away_team')?.value?.trim();

        if (!homeTeam || !awayTeam) {
            Helpers.showToast('Ev sahibi ve deplasman takım adlarını girin.', 'warning');
            return;
        }

        const data = {
            homeTeam,
            awayTeam,
            league: document.getElementById('league')?.value?.trim() || '',
            matchDate: document.getElementById('match_date')?.value || null,
            home: {
                goals_scored_avg: parseFloat(document.getElementById('home_goals_scored_avg')?.value) || null,
                goals_conceded_avg: parseFloat(document.getElementById('home_goals_conceded_avg')?.value) || null,
                home_goals_avg: parseFloat(document.getElementById('home_home_goals_avg')?.value) || null,
                home_conceded_avg: parseFloat(document.getElementById('home_home_conceded_avg')?.value) || null,
                last5_wins: parseInt(document.getElementById('home_last5_wins')?.value) || 0,
                last5_draws: parseInt(document.getElementById('home_last5_draws')?.value) || 0,
                last5_losses: parseInt(document.getElementById('home_last5_losses')?.value) || 0,
                league_position: parseInt(document.getElementById('home_league_position')?.value) || null,
                first_half_goals: parseFloat(document.getElementById('home_first_half_goals')?.value) || null,
                second_half_goals: parseFloat(document.getElementById('home_second_half_goals')?.value) || null
            },
            away: {
                goals_scored_avg: parseFloat(document.getElementById('away_goals_scored_avg')?.value) || null,
                goals_conceded_avg: parseFloat(document.getElementById('away_goals_conceded_avg')?.value) || null,
                away_goals_avg: parseFloat(document.getElementById('away_away_goals_avg')?.value) || null,
                away_conceded_avg: parseFloat(document.getElementById('away_away_conceded_avg')?.value) || null,
                last5_wins: parseInt(document.getElementById('away_last5_wins')?.value) || 0,
                last5_draws: parseInt(document.getElementById('away_last5_draws')?.value) || 0,
                last5_losses: parseInt(document.getElementById('away_last5_losses')?.value) || 0,
                league_position: parseInt(document.getElementById('away_league_position')?.value) || null,
                first_half_goals: parseFloat(document.getElementById('away_first_half_goals')?.value) || null,
                second_half_goals: parseFloat(document.getElementById('away_second_half_goals')?.value) || null
            },
            h2h: {
                home_wins: parseInt(document.getElementById('h2h_home_wins')?.value) || 0,
                draws: parseInt(document.getElementById('h2h_draws')?.value) || 0,
                away_wins: parseInt(document.getElementById('h2h_away_wins')?.value) || 0,
                total_goals_avg: parseFloat(document.getElementById('h2h_total_goals_avg')?.value) || null
            },
            odds: {
                home: parseFloat(document.getElementById('odds_home')?.value) || null,
                draw: parseFloat(document.getElementById('odds_draw')?.value) || null,
                away: parseFloat(document.getElementById('odds_away')?.value) || null,
                over25: parseFloat(document.getElementById('odds_over25')?.value) || null,
                under25: parseFloat(document.getElementById('odds_under25')?.value) || null,
                btts_yes: parseFloat(document.getElementById('odds_btts_yes')?.value) || null
            }
        };

        let result = FootballAnalysis.analyze(data);

        const riskResult = RiskEngine.evaluate(result);
        const editorAnalysis = EditorEngine ? EditorEngine.evaluate(result, data, riskResult) : null;

        // Analiz view'a geç ve göster
        this.showingSingleMatchAnalysis = true;
        this.navigate('analysis');
        const container = document.getElementById('analysis-container');
        if (container) {
            const backBtnHtml = `
                <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                    <button class="btn btn-ghost btn-sm" id="btn-back-to-high-conf">
                        ← Güven %65+ Vitrinine Dön
                    </button>
                    <span class="badge badge-primary">✏️ Manuel Analiz Sonucu</span>
                </div>
            `;
            container.innerHTML = backBtnHtml + AnalysisPanel.render(result, riskResult, data, editorAnalysis);
            container.querySelector('#btn-back-to-high-conf')?.addEventListener('click', () => {
                this.loadHighConfidenceShowcase('all');
            });
        }

        Helpers.showToast('Analiz tamamlandı! 📊', 'success');

        // Kaydet
        const settings = Helpers.storage.get('user_settings', {});
        if (settings.auto_save_analysis !== false) {
            this.saveAnalysisToHistory(result, riskResult);
        }
    },

    /**
     * Analizi geçmişe kaydet
     */
    async saveAnalysisToHistory(result, riskResult) {
        if (result.error) return;

        try {
            await DbService.saveAnalysis({
                sportType: result.sportType,
                homeTeam: result.homeTeam,
                awayTeam: result.awayTeam,
                league: result.league,
                matchDate: result.matchDate,
                analysis: result,
                predictedOutcome: result.summary?.bestOutcome || null,
                confidenceLevel: riskResult?.confidenceLabel || null,
                riskLevel: riskResult?.riskLabel || null,
                isValueBet: riskResult?.isValueBet || false
            });
        } catch (err) {
            console.error('Geçmişe kaydetme hatası:', err);
        }
    },

    /**
     * Geçmişi yükle & AI Gün Sonu Doğruluk Karnesi
     * @param {string|null} filterType - 'yesterday', 'all', 'today', 'correct', 'incorrect', 'value'
     */
    async loadHistory(filterType = null) {
        if (filterType !== null) this.historyFilter = filterType;
        const currentFilter = this.historyFilter || 'yesterday';

        const list = document.getElementById('history-list');
        if (!list) return;

        // Maç skorlarıyla veritabanını eşitle
        if (window.DbService) {
            await DbService.syncDailyAnalysesWithScores();
        }

        // İstatistikleri ilgili tarih filtresine göre çek
        let statsParam = 'all';
        if (currentFilter === 'yesterday') statsParam = 'yesterday';
        else if (currentFilter === 'today') statsParam = 'today';

        const stats = await DbService.getDailyAccuracyStats(statsParam);

        // Sekme butonlarının aktifliğini güncelle
        document.querySelectorAll('.hist-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.histFilter === currentFilter);
        });

        // Öğeleri filtrele
        let displayItems = stats.items || [];
        if (currentFilter === 'correct') {
            displayItems = displayItems.filter(h => h.isCorrect === true || h.is_correct === true);
        } else if (currentFilter === 'incorrect') {
            displayItems = displayItems.filter(h => h.isCorrect === false || h.is_correct === false);
        } else if (currentFilter === 'value') {
            displayItems = displayItems.filter(h => h.isValueBet || h.is_value_bet);
        } else if (currentFilter === 'yesterday') {
            const yesterdayDate = new Date(Date.now() - 86400000);
            const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
            displayItems = displayItems.filter(h => {
                const d = h.matchDate || h.match_date || h.created_at || '';
                return d.includes(yesterdayStr) || d.includes('2026-09-09') || d.includes('09.09.2026');
            });
        } else if (currentFilter === 'today') {
            const todayStr = new Date().toISOString().slice(0, 10);
            displayItems = displayItems.filter(h => {
                const d = h.matchDate || h.match_date || h.created_at || '';
                return d.includes(todayStr) || d.includes('2026-09-10');
            });
        }

        // İstatistik kartlarını gösterilen maçlara göre dinamik güncelle
        const decidedList = displayItems.filter(h => (h.isCorrect !== null && h.isCorrect !== undefined) || (h.is_correct !== null && h.is_correct !== undefined));
        const correctList = decidedList.filter(h => h.isCorrect === true || h.is_correct === true);
        const rateVal = decidedList.length > 0 ? (Math.round((correctList.length / decidedList.length) * 1000) / 10) : (displayItems.length > 0 ? '—' : '0');
        const valueCount = displayItems.filter(h => h.isValueBet || h.is_value_bet).length;

        document.querySelector('#hist-total')?.replaceChildren(document.createTextNode(displayItems.length));
        document.querySelector('#hist-correct')?.replaceChildren(document.createTextNode(correctList.length));
        document.querySelector('#hist-rate')?.replaceChildren(document.createTextNode(rateVal !== '—' && rateVal !== '0' ? `%${rateVal}` : (rateVal === '0' ? '%0' : '—')));
        document.querySelector('#hist-value')?.replaceChildren(document.createTextNode(valueCount));

        if (displayItems.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <h3>Bu filtreye uygun analiz kaydı bulunamadı</h3>
                    <p>Filtreyi değiştirerek veya yeni bir maç analiz ederek verileri görüntüleyebilirsiniz.</p>
                </div>
            `;
        } else {
            const sportIcons = { football: '⚽' };

            list.innerHTML = displayItems.map(item => {
                const icon = sportIcons[item.sportType || item.sport_type] || '📊';
                const conf = item.confidenceLevel || item.confidence_level || (item.confidenceScore ? `Güven %${item.confidenceScore}` : '—');
                
                const isCorrect = (item.isCorrect === true || item.is_correct === true);
                const isIncorrect = (item.isCorrect === false || item.is_correct === false);
                const isPending = !isCorrect && !isIncorrect;

                let statusBadge = '';
                if (isCorrect) {
                    statusBadge = `<span class="hist-badge correct">✅ TAHMİN TUTTU</span>`;
                } else if (isIncorrect) {
                    statusBadge = `<span class="hist-badge incorrect">❌ YANILGI</span>`;
                } else {
                    statusBadge = `<span class="hist-badge pending">⏳ BEKLİYOR / CANLI</span>`;
                }

                const homeTeam = item.homeTeam || item.home_team || 'Ev Sahibi';
                const awayTeam = item.awayTeam || item.away_team || 'Deplasman';
                const date = item.created_at ? Helpers.formatDate(item.created_at, 'full') : (item.matchDate ? Helpers.formatDate(item.matchDate, 'short') : '');
                const pickTitle = item.predictedOutcome || item.predicted_outcome || 'Önerilen Tercih';
                const oddVal = item.odd || '—';

                // Skor bilgisi
                const hScore = typeof item.homeScore === 'number' ? item.homeScore : 0;
                const aScore = typeof item.awayScore === 'number' ? item.awayScore : 0;
                const st = item.status || 'NOT_STARTED';
                const min = item.minute || (st === 'FINISHED' ? 'MS' : '00:00');

                return `
                    <div class="history-item-card ${isCorrect ? 'eval-won' : (isIncorrect ? 'eval-lost' : 'eval-pending')}">
                        <div class="hist-card-header">
                            <div class="hist-meta-left">
                                <span class="hist-sport">${icon}</span>
                                <span class="hist-league">${Helpers.escapeHtml(item.league || 'Bülten')}</span>
                                <span class="hist-date">📅 ${date}</span>
                            </div>
                            <div class="hist-meta-right">
                                ${item.isValueBet || item.is_value_bet ? '<span class="badge badge-value">💎 Value Bet</span>' : ''}
                                <span class="hist-conf-pill">${conf}</span>
                            </div>
                        </div>

                        <div class="hist-match-body">
                            <div class="hist-teams-col">
                                <div class="hist-teams">
                                    <span class="hist-team">${Helpers.escapeHtml(homeTeam)}</span>
                                    <span class="hist-vs">vs</span>
                                    <span class="hist-team">${Helpers.escapeHtml(awayTeam)}</span>
                                </div>
                                <div class="hist-pick-row">
                                    <span class="hist-pick-label">🤖 AI Tahmini:</span>
                                    <strong class="hist-pick-name">${Helpers.escapeHtml(pickTitle)}</strong>
                                    <span class="hist-pick-odd">Oran: ${oddVal}</span>
                                </div>
                            </div>

                            <div class="hist-score-col">
                                <div class="hist-score-box ${st.toLowerCase()}">
                                    <span class="hist-score-val">${hScore} - ${aScore}</span>
                                    <span class="hist-score-min">${min}</span>
                                </div>
                                <div class="hist-eval-container">
                                    ${statusBadge}
                                    ${item.actualOutcome || item.actual_outcome ? `<span class="hist-eval-detail" title="${Helpers.escapeHtml(item.actualOutcome || item.actual_outcome)}">💡 ${Helpers.escapeHtml(item.actualOutcome || item.actual_outcome)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Toolbar Event Listeners
        // 1. Filtre Sekmeleri
        document.querySelectorAll('.hist-filter-btn').forEach(btn => {
            btn.onclick = () => {
                this.loadHistory(btn.dataset.histFilter);
            };
        });

        // 2. Gün Sonu Skorlarını Simüle Et
        document.getElementById('btn-hist-simulate')?.addEventListener('click', async () => {
            if (window.MatchTracker) {
                window.MatchTracker.simulateEndOfDay(this.coupons || []);
                if (window.DbService) await DbService.syncDailyAnalysesWithScores();
                Helpers.showToast('⚡ Gün sonu skorları simüle edildi ve AI tahmin karnesi güncellendi!', 'success');
                this.loadHistory();
            }
        });

        // 3. Skorları Eşitle & Güncelle
        document.getElementById('btn-hist-sync')?.addEventListener('click', async () => {
            if (window.DbService) {
                await DbService.syncDailyAnalysesWithScores();
                Helpers.showToast('🔄 Veritabanı ve skorlar güncellendi!', 'info');
                this.loadHistory();
            }
        });

        // 4. Skorları Manuel Düzenle
        document.getElementById('btn-hist-open-scores')?.addEventListener('click', () => {
            if (window.CouponPanel) {
                const fakeList = displayItems.map(item => ({
                    match: {
                        id: item.matchId,
                        homeTeam: item.homeTeam || item.home_team,
                        awayTeam: item.awayTeam || item.away_team,
                        league: item.league
                    }
                }));
                window.CouponPanel.openScoreEditorModal(this, fakeList);
            }
        });

        // 5. Geçmişi Temizle
        document.getElementById('btn-hist-clear')?.addEventListener('click', () => {
            if (confirm('Analiz geçmişini temizlemek istediğinizden emin misiniz?')) {
                DbService.clearHistory();
                Helpers.showToast('Analiz geçmişi temizlendi.', 'info');
                this.loadHistory();
            }
        });
    },

    /**
     * Ayarlar panelini aç
     */
    openSettings() {
        // Kayıtlı değerleri yükle
        const supaUrl = Helpers.storage.get('supabase_url', '');
        const supaKey = Helpers.storage.get('supabase_key', '');
        const settings = Helpers.storage.get('user_settings', {});

        document.getElementById('setting-supabase-url').value = supaUrl;
        document.getElementById('setting-supabase-key').value = supaKey;
        document.getElementById('setting-api-football').value = settings.api_football_key || '';
        document.getElementById('setting-odds-api').value = settings.odds_api_key || '';
        document.getElementById('setting-auto-save').checked = settings.auto_save_analysis !== false;
        document.getElementById('setting-risk-warnings').checked = settings.show_risk_warnings !== false;

        Helpers.openModal('modal-settings');
    },

    /**
     * Ayarları kaydet
     */
    saveSettings() {
        const settings = {
            api_football_key: document.getElementById('setting-api-football')?.value?.trim() || '',
            odds_api_key: document.getElementById('setting-odds-api')?.value?.trim() || '',
            odds_format: document.getElementById('setting-odds-format')?.value || 'decimal',
            auto_save_analysis: document.getElementById('setting-auto-save')?.checked ?? true,
            show_risk_warnings: document.getElementById('setting-risk-warnings')?.checked ?? true
        };

        Helpers.storage.set('user_settings', settings);
        DbService.saveSettings(settings);

        Helpers.closeModal('modal-settings');
        Helpers.showToast('Ayarlar kaydedildi! ✅', 'success');
    },

    /**
     * E-Posta Gönderim Modalını Aç ve Hazırla
     */
     openMailModal() {
         const savedEmail = Helpers.storage.get('subscriber_email', '') || (AuthService.currentUser?.email || '');
         const inputEl = document.getElementById('input-email-target');
         if (inputEl && savedEmail) {
             inputEl.value = savedEmail;
         }

         const savedSmtpEmail = Helpers.storage.get('smtp_email', '');
         const smtpEmailEl = document.getElementById('smtp-email');
         if (smtpEmailEl && savedSmtpEmail) {
             smtpEmailEl.value = savedSmtpEmail;
         }

         const statusBox = document.getElementById('mail-status-box');
         if (statusBox) {
             statusBox.style.display = 'none';
             statusBox.innerHTML = '';
         }

         Helpers.openModal('modal-email-coupons');
     },

     /**
      * Günün kuponlarını backend üzerinden e-posta olarak gönder
      */
     async sendCouponsEmail() {
         const emailInput = document.getElementById('input-email-target');
         const targetEmail = emailInput ? emailInput.value.trim() : '';
         const subscribeDaily = document.getElementById('check-subscribe-daily')?.checked ?? true;
         const submitBtn = document.getElementById('btn-submit-send-mail');
         const statusBox = document.getElementById('mail-status-box');

         if (!targetEmail || !targetEmail.includes('@')) {
             Helpers.showToast('Lütfen geçerli bir e-posta adresi yazın.', 'warning');
             return;
         }

         // Kuponları hazırla (Bugünün canlı kuponları)
         if (!this.matches || this.matches.length === 0) {
             await this.loadDashboard();
         }

         const dailyCoupons = (window.CouponEngine) ? window.CouponEngine.generateDailyCoupons(this.matches) : [];
         const euroCoupons = (window.CouponEngine) ? window.CouponEngine.generateEuropeanCoupons(this.matches) : [];
         const hourlyCoupon = (window.CouponEngine && window.CouponEngine.generateHourlyCoupon) ? window.CouponEngine.generateHourlyCoupon(this.matches, 3) : null;

         const allCouponsToSend = [];
         if (hourlyCoupon) allCouponsToSend.push(hourlyCoupon);
         if (Array.isArray(euroCoupons)) allCouponsToSend.push(...euroCoupons);
         if (Array.isArray(dailyCoupons)) allCouponsToSend.push(...dailyCoupons);

         if (allCouponsToSend.length === 0) {
             Helpers.showToast('Gönderilecek kupon bulunamadı. Lütfen bülteni yenileyin.', 'error');
             return;
         }

         // İsteğe bağlı SMTP ayarları
         const smtpEmail = document.getElementById('smtp-email')?.value.trim();
         const smtpPass = document.getElementById('smtp-pass')?.value.trim();
         let smtpConfig = null;
         if (smtpEmail && smtpPass) {
             smtpConfig = { user: smtpEmail, pass: smtpPass };
             Helpers.storage.set('smtp_email', smtpEmail);
         }

         // UI loading durumuna al
         if (submitBtn) {
             submitBtn.disabled = true;
             submitBtn.innerHTML = '⏳ Gönderiliyor...';
         }
         if (statusBox) {
             statusBox.style.display = 'block';
             statusBox.style.background = 'rgba(56, 189, 248, 0.1)';
             statusBox.style.border = '1px solid rgba(56, 189, 248, 0.3)';
             statusBox.style.color = '#38bdf8';
             statusBox.innerHTML = '📬 Kuponlar e-posta şablonuna dönüştürülüyor ve gönderim başlatılıyor...';
         }

         try {
             const baseUrl = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3001')) 
                 ? 'http://localhost:3001' 
                 : '';

             const res = await fetch(`${baseUrl}/api/mail/send-coupons`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     email: targetEmail,
                     coupons: allCouponsToSend,
                     smtpConfig,
                     dateStr: '10 Eylül 2026'
                 })
             });

             const result = await res.json();

             if (!res.ok || !result.success) {
                 throw new Error(result.error || result.detail || 'E-posta gönderilemedi.');
             }

             Helpers.storage.set('subscriber_email', targetEmail);

             // Günlük abonelik seçildiyse kaydet
             if (subscribeDaily) {
                 fetch(`${baseUrl}/api/mail/subscribe`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ email: targetEmail, time: '10:00' })
                 }).catch(e => console.warn('Abonelik kaydedilemedi:', e));
             }

             if (statusBox) {
                 statusBox.style.background = 'rgba(16, 185, 129, 0.15)';
                 statusBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
                 statusBox.style.color = '#34d399';

                 let previewHtml = '';
                 if (result.previewUrl) {
                     previewHtml = `
                     <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(16,185,129,0.3);">
                         <strong>🌐 E-posta Web Önizleme Linki:</strong><br>
                         <a href="${result.previewUrl}" target="_blank" style="color:#00f0ff;text-decoration:underline;font-weight:700;word-break:break-all;">
                             ${result.previewUrl} ➔
                         </a>
                     </div>`;
                 }

                 statusBox.innerHTML = `
                     <div>
                         ✅ <strong>Tebrikler!</strong> Günün tüm garantör kuponları <strong>${targetEmail}</strong> adresine başarıyla gönderildi.
                         ${subscribeDaily ? '<br>🔔 <em>Her sabah saat 10:00 bülten aboneliğiniz aktif edildi!</em>' : ''}
                     </div>
                     ${previewHtml}
                 `;
             }

             Helpers.showToast(`✅ Kuponlar ${targetEmail} adresine iletildi!`, 'success');

         } catch (err) {
             console.error('Mail gönderim hatası:', err);
             if (statusBox) {
                 statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
                 statusBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                 statusBox.style.color = '#f87171';
                 statusBox.innerHTML = `❌ <strong>Hata:</strong> ${err.message || 'E-posta gönderilemedi.'}`;
             }
             Helpers.showToast('E-posta gönderimi başarısız: ' + err.message, 'error');
         } finally {
             if (submitBtn) {
                 submitBtn.disabled = false;
                 submitBtn.innerHTML = '🚀 Şimdi Gönder';
             }
         }
     },

    /**
     * Kayıtlı ayarları yükle
     */
    loadSettings() {
        // Disclaimer daha önce kapatıldıysa gösterme
        const dismissed = Helpers.storage.get('disclaimer_dismissed', false);
        if (dismissed) {
            document.getElementById('disclaimer-banner')?.remove();
            document.body.classList.add('no-disclaimer');
            const mc = document.querySelector('.main-content');
            if (mc) mc.style.marginTop = 'var(--header-height)';
        } else {
            document.getElementById('btn-close-disclaimer')?.addEventListener('click', () => {
                Helpers.storage.set('disclaimer_dismissed', true);
            });
        }
    }
};

// ===== BAŞLAT =====
document.addEventListener('DOMContentLoaded', () => App.init());
