/**
 * userProfileService.js - Kullanıcı Profili & Kasa Yönetim Servisi
 * SportAnaliz Pro
 */
const UserProfileService = {
    STORAGE_KEY: 'sportanaliz_user_profile_v2',

    defaultProfile: {
        userName: 'Pro Bahisçi',
        startingBankroll: 1000,       // Başlangıç Kasası (TL)
        currentBankroll: 1000,        // Güncel Kasa (TL)
        stakeStrategy: 'fixed',       // 'fixed' (Sabit TL), 'percentage' (% Kasa), 'kelly' (Kelly Kriteri)
        fixedStakeAmount: 100,        // Sabit kupon tutarı (TL)
        percentageStakeRate: 5,       // Kasa yüzdesi (%)
        dailyProfitGoal: 150,         // Günlük kâr hedefi (TL)
        weeklyProfitGoal: 800,        // Haftalık kâr hedefi (TL)
        stopLossDaily: 250,           // Günlük stop-loss limiti (TL)
        currency: 'TL',
        createdAt: '2026-09-09'
    },

    /**
     * Kullanıcı profilini yükler
     */
    getProfile() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return Object.assign({}, this.defaultProfile, parsed);
            }
        } catch (e) {
            console.error('UserProfileService getProfile hatası:', e);
        }
        return Object.assign({}, this.defaultProfile);
    },

    /**
     * Kullanıcı profilini günceller ve kaydeder
     */
    saveProfile(updates) {
        try {
            const current = this.getProfile();
            const merged = Object.assign({}, current, updates);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            return merged;
        } catch (e) {
            console.error('UserProfileService saveProfile hatası:', e);
            return this.getProfile();
        }
    },

    /**
     * Gerçek sistem kâr/zararı ile birlikte güncel kasa durumunu hesaplar
     */
    getBankrollSummary(systemNetProfit = 0) {
        const profile = this.getProfile();
        const start = parseFloat(profile.startingBankroll) || 1000;
        const net = parseFloat(systemNetProfit) || 0;
        const currentBank = start + net;
        const growthPercent = start > 0 ? ((net / start) * 100).toFixed(1) : '0.0';

        return {
            startingBankroll: start,
            currentBankroll: currentBank,
            netProfit: net,
            growthPercent: growthPercent,
            isProfit: net >= 0,
            stakeStrategy: profile.stakeStrategy,
            dailyGoal: profile.dailyProfitGoal,
            weeklyGoal: profile.weeklyProfitGoal
        };
    },

    /**
     * Stratejiye göre kupon için önerilen bahis tutarını belirler
     * @param {number} totalOdd - Kupon toplam oranı
     * @param {number} confidence - Güven puanı (0-100)
     */
    calculateRecommendedStake(totalOdd = 2.0, confidence = 85) {
        const profile = this.getProfile();
        const summary = this.getBankrollSummary();
        const currentBank = Math.max(100, summary.currentBankroll);

        if (profile.stakeStrategy === 'fixed') {
            return Math.round(profile.fixedStakeAmount || 100);
        }

        if (profile.stakeStrategy === 'percentage') {
            const pct = (profile.percentageStakeRate || 5) / 100;
            const amount = Math.round(currentBank * pct);
            return Math.max(20, Math.min(amount, currentBank * 0.25));
        }

        if (profile.stakeStrategy === 'kelly') {
            // Yarım Kelly Kriteri (Half-Kelly - Güvenli Kasa Büyütme)
            const b = Math.max(0.1, totalOdd - 1.0);
            const p = Math.min(0.95, Math.max(0.1, confidence / 100));
            const q = 1 - p;
            let kellyFraction = (b * p - q) / b;
            kellyFraction = Math.max(0.01, Math.min(kellyFraction * 0.5, 0.15)); // max %15 kasa

            const stake = Math.round(currentBank * kellyFraction);
            return Math.max(20, stake);
        }

        return 100;
    },

    /**
     * Hedef tamamlama oranlarını hesaplar
     */
    getGoalProgress(stats) {
        const profile = this.getProfile();
        const netProfitTotal = (stats && stats.netProfit) ? stats.netProfit : 0;
        
        // Son gün kârı
        const latestDay = (stats && stats.dayByDay && stats.dayByDay.length > 0)
            ? stats.dayByDay[stats.dayByDay.length - 1]
            : null;
        const dailyNet = latestDay ? (latestDay.netProfit || 0) : 0;

        const dailyGoal = parseFloat(profile.dailyProfitGoal) || 150;
        const weeklyGoal = parseFloat(profile.weeklyProfitGoal) || 800;

        const dailyProgressPct = Math.min(100, Math.max(0, Math.round((dailyNet / dailyGoal) * 100)));
        const weeklyProgressPct = Math.min(100, Math.max(0, Math.round((netProfitTotal / weeklyGoal) * 100)));

        return {
            dailyNet: dailyNet,
            dailyGoal: dailyGoal,
            dailyProgressPct: dailyProgressPct,
            dailyReached: dailyNet >= dailyGoal,
            weeklyNet: netProfitTotal,
            weeklyGoal: weeklyGoal,
            weeklyProgressPct: weeklyProgressPct,
            weeklyReached: netProfitTotal >= weeklyGoal
        };
    },

    /**
     * Kasayı başlangıç değerine sıfırlar
     */
    resetBankroll() {
        return this.saveProfile({
            startingBankroll: 1000,
            currentBankroll: 1000
        });
    }
};

if (typeof window !== 'undefined') {
    window.UserProfileService = UserProfileService;
}
