/**
 * statistics.js — İstatistik yardımcı fonksiyonları
 */
const Statistics = {
    /**
     * Poisson olasılığı: P(X=k) = (λ^k * e^-λ) / k!
     */
    poissonProbability(lambda, k) {
        if (lambda <= 0) return k === 0 ? 1 : 0;
        return (Math.pow(lambda, k) * Math.exp(-lambda)) / this.factorial(k);
    },

    /**
     * Faktöriyel hesaplama (cache'li)
     */
    _factorialCache: [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800],
    factorial(n) {
        if (n < 0) return 1;
        if (this._factorialCache[n] !== undefined) return this._factorialCache[n];
        let result = this._factorialCache[this._factorialCache.length - 1];
        for (let i = this._factorialCache.length; i <= n; i++) {
            result *= i;
            this._factorialCache[i] = result;
        }
        return result;
    },

    /**
     * Ortalama
     */
    mean(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((sum, v) => sum + v, 0) / arr.length;
    },

    /**
     * Standart sapma
     */
    stdDev(arr) {
        if (!arr || arr.length < 2) return 0;
        const avg = this.mean(arr);
        const sqDiffs = arr.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(this.mean(sqDiffs));
    },

    /**
     * Ağırlıklı ortalama
     */
    weightedMean(values, weights) {
        if (!values || values.length === 0) return 0;
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        if (totalWeight === 0) return 0;
        return values.reduce((s, v, i) => s + v * weights[i], 0) / totalWeight;
    },

    /**
     * Oran → Örtük olasılık
     */
    oddsToImpliedProbability(odds) {
        if (!odds || odds <= 1) return 0;
        return (1 / odds) * 100;
    },

    /**
     * Olasılık → Oran
     */
    probabilityToOdds(probability) {
        if (!probability || probability <= 0) return 0;
        return 1 / (probability / 100);
    },

    /**
     * Margin hesaplama (overround)
     */
    calculateMargin(odds1, odds2, odds3) {
        const probs = [odds1, odds2, odds3].filter(Boolean).map(o => 1 / o);
        return (probs.reduce((s, p) => s + p, 0) - 1) * 100;
    },

    /**
     * Value hesaplama: pozitif = değerli bahis
     * Value = (modelOlasılık / örtükOlasılık - 1) * 100
     */
    calculateValue(modelProb, odds) {
        const impliedProb = this.oddsToImpliedProbability(odds);
        if (impliedProb <= 0) return 0;
        return ((modelProb / impliedProb) - 1) * 100;
    },

    /**
     * Normalize olasılıklar (toplamı 100 yapar)
     */
    normalizeProbabilities(probs) {
        const total = probs.reduce((s, p) => s + p, 0);
        if (total === 0) return probs.map(() => 0);
        return probs.map(p => (p / total) * 100);
    },

    /**
     * Lineer regresyon trend (basit)
     */
    linearTrend(values) {
        const n = values.length;
        if (n < 2) return { slope: 0, direction: 'stable' };
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable';
        
        return { slope: Math.round(slope * 100) / 100, direction };
    },

    /**
     * Form puanı (son maç sonuçlarından)
     * G=3, B=1, M=0 ve yakın maçlara daha fazla ağırlık
     */
    calculateFormScore(wins, draws, losses) {
        const total = wins + draws + losses;
        if (total === 0) return 50;
        const points = (wins * 3 + draws * 1) / (total * 3) * 100;
        return Math.round(points);
    },

    /**
     * Güç indeksi (lig ortalamasına göre)
     * attack = takım gol ort / lig gol ort
     * defense = takım yenilen gol ort / lig yenilen gol ort
     */
    calculateStrengthIndex(teamGoalAvg, teamConcededAvg, leagueGoalAvg = 1.35) {
        const attackStrength = teamGoalAvg / leagueGoalAvg;
        const defenseStrength = teamConcededAvg / leagueGoalAvg;
        return {
            attack: Math.round(attackStrength * 100) / 100,
            defense: Math.round(defenseStrength * 100) / 100
        };
    },

    /**
     * Clamp
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Yüzde formatlama
     */
    formatPercent(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    },

    /**
     * Oran formatlama
     */
    formatOdds(value) {
        if (!value || value <= 0) return '—';
        return value.toFixed(2);
    }
};

// Global'e ekle
window.Statistics = Statistics;
