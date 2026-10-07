/**
 * poissonModel.js — Poisson Gol Modeli
 * Çift Poisson modeli: Ev ve deplasman gollerini bağımsız hesaplar
 */
const PoissonModel = {
    MAX_GOALS: 6, // 0-6 arası gol hesapla

    /**
     * Ana hesaplama: Ev ve deplasman beklenen gol sayılarından skor dağılımı üret
     * @param {number} homeExpected - Ev sahibi beklenen gol
     * @param {number} awayExpected - Deplasman beklenen gol
     * @returns {Object} Tüm olasılıklar
     */
    calculate(homeExpected, awayExpected) {
        if (!homeExpected || !awayExpected || homeExpected < 0 || awayExpected < 0) {
            return null;
        }

        // Skor matrisi oluştur (Tam maç)
        const scoreMatrix = this.buildScoreMatrix(homeExpected, awayExpected);

        // 1X2 olasılıkları
        const matchResult = this.calculateMatchResult(scoreMatrix);

        // Alt/Üst olasılıkları
        const overUnder = this.calculateOverUnder(scoreMatrix, [1.5, 2.5, 3.5, 4.5]);

        // Karşılıklı gol
        const btts = this.calculateBTTS(scoreMatrix);

        // En olası skorlar
        const topScores = this.getTopScores(scoreMatrix, 10);

        // ---- İlk Yarı (İY) Detaylı Hesabı ----
        // Futbolda ilk yarı gol oranı genellikle toplam beklenen golün %43 - %45'i civarındadır
        const firstHalfExpHome = homeExpected * 0.44;
        const firstHalfExpAway = awayExpected * 0.44;
        const firstHalfMatrix = this.buildScoreMatrix(firstHalfExpHome, firstHalfExpAway, 4);
        const firstHalfResult = this.calculateMatchResult(firstHalfMatrix);
        const firstHalfOU = this.calculateOverUnder(firstHalfMatrix, [0.5, 1.5, 2.5]);
        const firstHalfBtts = this.calculateBTTS(firstHalfMatrix);
        const firstHalfTopScores = this.getTopScores(firstHalfMatrix, 6);

        // ---- İlk Yarı / Maç Sonu (İY/MS) Birleşik Poisson Olasılık Dağılımı ----
        const halfTimeFullTime = this.calculateHalfTimeFullTime(homeExpected, awayExpected);

        return {
            homeExpected: Math.round(homeExpected * 100) / 100,
            awayExpected: Math.round(awayExpected * 100) / 100,
            totalExpected: Math.round((homeExpected + awayExpected) * 100) / 100,
            scoreMatrix,
            matchResult,
            overUnder,
            btts,
            topScores,
            halfTimeFullTime,
            firstHalf: {
                homeExpected: Math.round(firstHalfExpHome * 100) / 100,
                awayExpected: Math.round(firstHalfExpAway * 100) / 100,
                totalExpected: Math.round((firstHalfExpHome + firstHalfExpAway) * 100) / 100,
                matchResult: firstHalfResult,
                overUnder: firstHalfOU,
                btts: firstHalfBtts,
                topScores: firstHalfTopScores
            }
        };
    },

    /**
     * İlk Yarı / Maç Sonu (İY/MS) 9'lu Olasılık Dağılımı
     * H1 ~ Poisson(homeExp * 0.44), A1 ~ Poisson(awayExp * 0.44)
     * H2 ~ Poisson(homeExp * 0.56), A2 ~ Poisson(awayExp * 0.56)
     * İY: H1 vs A1 | MS: (H1 + H2) vs (A1 + A2)
     */
    calculateHalfTimeFullTime(homeExpected, awayExpected) {
        if (!homeExpected || !awayExpected || homeExpected <= 0 || awayExpected <= 0) {
            return null;
        }

        const h1Exp = homeExpected * 0.44;
        const a1Exp = awayExpected * 0.44;
        const h2Exp = homeExpected * 0.56;
        const a2Exp = awayExpected * 0.56;

        const htFtProbs = {
            '1/1': 0, '1/X': 0, '1/2': 0,
            'X/1': 0, 'X/X': 0, 'X/2': 0,
            '2/1': 0, '2/X': 0, '2/2': 0
        };

        let totalWeight = 0;
        const MAX_HALF = 4; // Her yarı için 0-4 arası gol %99.9 kümülatif dağılım sağlar

        for (let h1 = 0; h1 <= MAX_HALF; h1++) {
            const p_h1 = (typeof Statistics !== 'undefined' && Statistics.poissonProbability)
                ? Statistics.poissonProbability(h1Exp, h1)
                : this._localPoisson(h1Exp, h1);

            for (let a1 = 0; a1 <= MAX_HALF; a1++) {
                const p_a1 = (typeof Statistics !== 'undefined' && Statistics.poissonProbability)
                    ? Statistics.poissonProbability(a1Exp, a1)
                    : this._localPoisson(a1Exp, a1);

                const htRes = h1 > a1 ? '1' : (h1 === a1 ? 'X' : '2');

                for (let h2 = 0; h2 <= MAX_HALF; h2++) {
                    const p_h2 = (typeof Statistics !== 'undefined' && Statistics.poissonProbability)
                        ? Statistics.poissonProbability(h2Exp, h2)
                        : this._localPoisson(h2Exp, h2);

                    for (let a2 = 0; a2 <= MAX_HALF; a2++) {
                        const p_a2 = (typeof Statistics !== 'undefined' && Statistics.poissonProbability)
                            ? Statistics.poissonProbability(a2Exp, a2)
                            : this._localPoisson(a2Exp, a2);
                        const prob = p_h1 * p_a1 * p_h2 * p_a2;
                        totalWeight += prob;

                        const totalH = h1 + h2;
                        const totalA = a1 + a2;
                        const ftRes = totalH > totalA ? '1' : (totalH === totalA ? 'X' : '2');

                        const comboKey = `${htRes}/${ftRes}`;
                        htFtProbs[comboKey] += prob;
                    }
                }
            }
        }

        const result = {};
        for (const [key, val] of Object.entries(htFtProbs)) {
            result[key] = Math.round((val / (totalWeight || 1)) * 10000) / 100;
        }

        return result;
    },

    /**
     * Fallback Poisson formülü (Statistics modülü hazır değilse)
     */
    _localPoisson(lambda, k) {
        if (lambda <= 0 && k === 0) return 1;
        if (lambda <= 0) return 0;
        let fact = 1;
        for (let i = 2; i <= k; i++) fact *= i;
        return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
    },

    /**
     * Skor olasılık matrisi (0-0'dan maxGoals-maxGoals'a)
     */
    buildScoreMatrix(homeLambda, awayLambda, maxGoals = this.MAX_GOALS) {
        const matrix = [];
        for (let h = 0; h <= maxGoals; h++) {
            matrix[h] = [];
            for (let a = 0; a <= maxGoals; a++) {
                const homeProb = Statistics.poissonProbability(homeLambda, h);
                const awayProb = Statistics.poissonProbability(awayLambda, a);
                matrix[h][a] = Math.round(homeProb * awayProb * 10000) / 10000;
            }
        }
        return matrix;
    },

    /**
     * 1X2 olasılıkları hesapla
     */
    calculateMatchResult(matrix) {
        let homeWin = 0, draw = 0, awayWin = 0;
        const maxH = matrix.length - 1;

        for (let h = 0; h <= maxH; h++) {
            const maxA = matrix[h].length - 1;
            for (let a = 0; a <= maxA; a++) {
                if (h > a) homeWin += matrix[h][a];
                else if (h === a) draw += matrix[h][a];
                else awayWin += matrix[h][a];
            }
        }

        const total = homeWin + draw + awayWin || 1;
        return {
            home: Math.round((homeWin / total) * 10000) / 100,
            draw: Math.round((draw / total) * 10000) / 100,
            away: Math.round((awayWin / total) * 10000) / 100
        };
    },

    /**
     * Alt/Üst olasılıkları
     */
    calculateOverUnder(matrix, thresholds = [1.5, 2.5, 3.5, 4.5]) {
        const result = {};
        const maxH = matrix.length - 1;
        const total = this._matrixSum(matrix) || 1;

        thresholds.forEach(threshold => {
            let under = 0;
            for (let h = 0; h <= maxH; h++) {
                const maxA = matrix[h].length - 1;
                for (let a = 0; a <= maxA; a++) {
                    if (h + a < threshold) under += matrix[h][a];
                }
            }
            result[threshold] = {
                over: Math.round(((total - under) / total) * 10000) / 100,
                under: Math.round((under / total) * 10000) / 100
            };
        });

        return result;
    },

    /**
     * Karşılıklı Gol (BTTS)
     */
    calculateBTTS(matrix) {
        let bttsYes = 0;
        const maxH = matrix.length - 1;

        for (let h = 1; h <= maxH; h++) {
            const maxA = matrix[h].length - 1;
            for (let a = 1; a <= maxA; a++) {
                bttsYes += matrix[h][a];
            }
        }

        const total = this._matrixSum(matrix) || 1;
        return {
            yes: Math.round((bttsYes / total) * 10000) / 100,
            no: Math.round(((total - bttsYes) / total) * 10000) / 100
        };
    },

    /**
     * En olası N skor
     */
    getTopScores(matrix, n = 10) {
        const scores = [];
        const maxH = matrix.length - 1;
        for (let h = 0; h <= maxH; h++) {
            const maxA = matrix[h].length - 1;
            for (let a = 0; a <= maxA; a++) {
                scores.push({
                    home: h,
                    away: a,
                    score: `${h}-${a}`,
                    probability: Math.round(matrix[h][a] * 10000) / 100
                });
            }
        }
        return scores.sort((a, b) => b.probability - a.probability).slice(0, n);
    },

    /**
     * Matris toplamı
     */
    _matrixSum(matrix) {
        let sum = 0;
        const maxH = matrix.length - 1;
        for (let h = 0; h <= maxH; h++) {
            const maxA = matrix[h].length - 1;
            for (let a = 0; a <= maxA; a++) {
                sum += matrix[h][a];
            }
        }
        return sum;
    }
};

if (typeof window !== 'undefined') {
    window.PoissonModel = PoissonModel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoissonModel;
}
