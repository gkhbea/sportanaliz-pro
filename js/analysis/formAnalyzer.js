/**
 * formAnalyzer.js - Gelişmiş Takım Form ve Trend Analiz Motoru
 * SportAnaliz Pro
 */
const FormAnalyzer = {
    /**
     * Takım form dizgisini (örn: ['W','W','D','L','W','W','D','W']) son 8 maç üzerinden ağırlıklı puana dönüştürür (0-100)
     */
    calculateWeightedForm(formArray = []) {
        if (!formArray || formArray.length === 0) return 60; // Varsayılan nötr form

        // Son 8 maç ağırlıkları (en yeniden eskiye azalan ağırlık)
        const weights = [1.7, 1.5, 1.4, 1.2, 1.1, 0.9, 0.8, 0.6];
        let totalScore = 0;
        let totalWeight = 0;

        const pointsMap = { 'W': 3, 'G': 3, 'D': 1, 'B': 1, 'L': 0, 'M': 0 };

        formArray.slice(0, 8).forEach((result, idx) => {
            const resChar = String(result).toUpperCase().charAt(0);
            const pts = pointsMap[resChar] !== undefined ? pointsMap[resChar] : 1;
            const w = weights[idx] || 0.6;
            totalScore += pts * w;
            totalWeight += 3 * w; // Maksimum puan 3
        });

        if (totalWeight === 0) return 60;
        return Math.min(100, Math.max(10, Math.round((totalScore / totalWeight) * 100)));
    },

    /**
     * İki takımın karşılaşması için derin form & xG metrikleri üretir (Son 8 maç bazlı)
     */
    analyzeMatchup(match) {
        if (!match) return null;

        // Son 8 maç form dizgileri
        const homeForm = match.homeForm || ['W', 'W', 'D', 'W', 'W', 'W', 'D', 'W'];
        const awayForm = match.awayForm || ['W', 'D', 'L', 'W', 'D', 'L', 'W', 'D'];

        const homeFormScore = this.calculateWeightedForm(homeForm);
        const awayFormScore = this.calculateWeightedForm(awayForm);

        // Gol ortalamaları ve xG projeksiyonu
        const homeAvgScored = parseFloat(match.homeGoalsAvg || match.homeStats?.avgScored || 2.1);
        const homeAvgConceded = parseFloat(match.homeConcededAvg || match.homeStats?.avgConceded || 0.8);
        const awayAvgScored = parseFloat(match.awayGoalsAvg || match.awayStats?.avgScored || 1.3);
        const awayAvgConceded = parseFloat(match.awayConcededAvg || match.awayStats?.avgConceded || 1.4);

        // Beklenen Gol (xG Projeksiyonu)
        const homeXG = Math.max(0.4, ((homeAvgScored + awayAvgConceded) / 2) * 1.1); // Ev sahibi avantajı +%10
        const awayXG = Math.max(0.3, ((awayAvgScored + homeAvgConceded) / 2) * 0.9);
        const totalXG = (homeXG + awayXG);

        // Olasılık projeksiyonları (Poisson simülasyon desteğiyle)
        const over25Prob = Math.min(92, Math.max(25, Math.round((1 - Math.exp(-totalXG) * (1 + totalXG + Math.pow(totalXG, 2)/2)) * 100)));
        const bttsProb = Math.min(88, Math.max(20, Math.round((1 - Math.exp(-homeXG)) * (1 - Math.exp(-awayXG)) * 100)));

        // Güç Endeksi Farkı (-100 ile +100 arası)
        const powerDiff = Math.round((homeFormScore * 1.15 + (homeXG - awayXG) * 20) - awayFormScore);

        return {
            homeFormScore: homeFormScore,
            awayFormScore: awayFormScore,
            homeXG: parseFloat(homeXG.toFixed(2)),
            awayXG: parseFloat(awayXG.toFixed(2)),
            totalXG: parseFloat(totalXG.toFixed(2)),
            over25Prob: over25Prob,
            bttsProb: bttsProb,
            powerDiff: powerDiff,
            dominantTeam: powerDiff > 15 ? 'HOME' : (powerDiff < -15 ? 'AWAY' : 'BALANCED')
        };
    }
};

if (typeof window !== 'undefined') {
    window.FormAnalyzer = FormAnalyzer;
}
