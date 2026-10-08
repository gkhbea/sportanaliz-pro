/**
 * autoArchiveService.js - Otomatik Maç Sonucu, Arşiv & Canlı Senkronizasyon Motoru (Optimize Edildi)
 * SportAnaliz Pro - Günlük maç sonuçlarını ve arşivi tarayıcıyı kasmadan, sessiz ve optimize şekilde yönetir.
 */
const AutoArchiveService = {
    STORAGE_KEY: 'sportanaliz_auto_archive_v1',
    LAST_SYNC_KEY: 'sportanaliz_last_sync_timestamp',
    SYNC_INTERVAL_MS: 45 * 1000, // 45 saniyede bir canlı takip // 15 dakikada bir hafif arka plan senkronizasyonu (kasmayı ve donmayı önler)
    timer: null,
    isSyncing: false,

    /**
     * Otomatik arşiv servisini başlatır
     */
    init(app) {
        this.app = app;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Açılışta arayüzün akıcı yüklenmesi için 4 saniye gecikmeyle 1 kez çalıştır
        setTimeout(() => {
            this.checkAndSyncDailyArchive();
        }, 4000);

        // 15 dakikada bir hafif aralıkla kontrol et
        this.timer = setInterval(() => {
            // Eğer tarayıcı sekmesi gizliyse veya kullanıcı etkileşimdeyse boşuna CPU harcama
            // Arka planda olsa da canlı maç takibini kesme
            this.checkAndSyncDailyArchive();
        }, this.SYNC_INTERVAL_MS);

        console.log('⚡ AutoArchiveService: Optimize edilmiş (15 dk) arka plan senkronizasyonu devrede.');
    },

    /**
     * Arşiv, canlı skorlar ve güncel maç durumlarını kontrol edip senkronize eder
     */
    async checkAndSyncDailyArchive() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // 1. Canlı Skorları Çek ve Bültenle Eşitle (Sadece bülten maçları varsa)
            if (window.LiveScoreService && typeof LiveScoreService.fetchLiveScores === 'function') {
                try {
                    await LiveScoreService.fetchLiveScores();
                    if (this.app?.matches && this.app.matches.length > 0) {
                        await LiveScoreService.syncBulletinMatches(this.app.matches);
                    }
                } catch (liveErr) {
                    console.warn('AutoArchiveService canlı skor uyarısı:', liveErr.message);
                }
            }

            // 2. Gün Sonu ve Maç Analizlerini Temizle & Kaydet
            if (window.MatchTracker) {
                if (typeof window.MatchTracker.sanitizeDailyAnalysisHistory === 'function') {
                    window.MatchTracker.sanitizeDailyAnalysisHistory();
                }
                if (typeof window.MatchTracker.sanitizeStaleScores === 'function') {
                    window.MatchTracker.sanitizeStaleScores(window.MatchTracker.data);
                }
                if (this.app?.matches && this.app.matches.length > 0) {
                    window.MatchTracker.recordDailyAnalysis(this.app.matches);
                }
                if (typeof window.MatchTracker.calculateCumulativeCouponStats === 'function') {
                    const stats = window.MatchTracker.calculateCumulativeCouponStats('2026-09-09');
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                        lastSyncDate: todayStr,
                        timestamp: Date.now(),
                        totalCoupons: stats.totalCoupons,
                        wonCoupons: stats.wonCoupons,
                        netProfit: stats.netProfit
                    }));
                }
            }

            localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());

            // 4. Canlı skorları ve arayüzü anlık güncelle
            this.refreshCountersOnly();
            if (this.app) {
                if (this.app.currentView === 'dashboard' && typeof this.app.applyFilters === 'function') {
                    this.app.applyFilters();
                } else if (this.app.currentView === 'coupons' && typeof this.app.loadDailyCoupons === 'function') {
                    this.app.loadDailyCoupons();
                } else if (this.app.currentView === 'daily-analysis' && typeof this.app.loadDailyAnalysisPanel === 'function') {
                    this.app.loadDailyAnalysisPanel();
                } else if (this.app.currentView === 'all-matches' && typeof this.app.loadAllMatchesTrackerPanel === 'function') {
                    this.app.loadAllMatchesTrackerPanel();
                } else if (this.app.currentView === 'matches' && typeof this.app.renderMatches === 'function') {
                    this.app.renderMatches();
                }
            }

        } catch (e) {
            console.error('AutoArchiveService senkronizasyon hatası:', e);
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * DOM'u yok edip kaydırmayı kilitlemeden, sadece sayısal rozet ve sayaçları günceller
     */
    refreshCountersOnly() {
        if (!this.app) return;
        try {
            // Canlı maç sayısı rozetini güncelle
            const liveBadge = document.getElementById('nav-live-count');
            if (liveBadge && window.LiveScoreService) {
                const liveCount = (LiveScoreService.cachedScores || []).filter(m => m.status === 'LIVE').length;
                liveBadge.textContent = liveCount > 0 ? liveCount : '';
            }
        } catch (e) {}
    },

    /**
     * Kullanıcı istediğinde anında zorunlu senkronizasyon yapar
     */
    async forceSyncArchive() {
        await this.checkAndSyncDailyArchive();
        if (window.Helpers && typeof Helpers.showToast === 'function') {
            Helpers.showToast('Tüm maç sonuçları, kuponlar ve arşiv senkronize edildi!', 'success');
        }
    }
};

if (typeof window !== 'undefined') {
    window.AutoArchiveService = AutoArchiveService;
}
