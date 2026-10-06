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

        // ---- İlk Yarı / Maç Sonu (İY/MS — HT/FT) Hesabı ----
        const htft = this.calculateHTFT(homeExpected, awayExpected);

        return {
            homeExpected: Math.round(homeExpected * 100) / 100,
            awayExpected: Math.round(awayExpected * 100) / 100,
            totalExpected: Math.round((homeExpected + awayExpected) * 100) / 100,
            scoreMatrix,
            matchResult,
            overUnder,
            btts,
            topScores,
            htft,
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
     * İlk Yarı / Maç Sonu (İY/MS — HT/FT) 9 Olasılık Dağılımını Hesapla
     * 1/1, 1/X, 1/2, X/1, X/X, X/2, 2/1, 2/X, 2/2
     * @param {number} homeExpected - Ev sahibi beklenen gol
     * @param {number} awayExpected - Deplasman beklenen gol
     * @returns {Object} 9 adet İY/MS yüzdesi ve en olası seçimler
     */
    calculateHTFT(homeExpected, awayExpected) {
        if (!homeExpected || !awayExpected || homeExpected < 0 || awayExpected < 0) return null;

        const stats = (typeof Statistics !== 'undefined') ? Statistics : (typeof window !== 'undefined' ? window.Statistics : null);
        const poissonFn = (lambda, k) => {
            if (stats && typeof stats.poissonProbability === 'function') {
                return stats.poissonProbability(lambda, k);
            }
            if (lambda <= 0) return k === 0 ? 1 : 0;
            let fact = 1;
            for (let i = 2; i <= k; i++) fact *= i;
            return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
        };

        const fhH = homeExpected * 0.44;
        const fhA = awayExpected * 0.44;
        const shH = homeExpected * 0.56;
        const shA = awayExpected * 0.56;

        const rawProbs = {
            '1/1': 0, '1/X': 0, '1/2': 0,
            'X/1': 0, 'X/X': 0, 'X/2': 0,
            '2/1': 0, '2/X': 0, '2/2': 0
        };

        let totalProb = 0;
        const maxGoals = 4;

        for (let h1 = 0; h1 <= maxGoals; h1++) {
            const p_h1 = poissonFn(fhH, h1);
            for (let a1 = 0; a1 <= maxGoals; a1++) {
                const p_a1 = poissonFn(fhA, a1);
                const p_fh = p_h1 * p_a1;
                const htRes = h1 > a1 ? '1' : (h1 === a1 ? 'X' : '2');

                for (let h2 = 0; h2 <= maxGoals; h2++) {
                    const p_h2 = poissonFn(shH, h2);
                    for (let a2 = 0; a2 <= maxGoals; a2++) {
                        const p_a2 = poissonFn(shA, a2);
                        const prob = p_fh * p_h2 * p_a2;

                        const totH = h1 + h2;
                        const totA = a1 + a2;
                        const ftRes = totH > totA ? '1' : (totH === totA ? 'X' : '2');

                        const key = `${htRes}/${ftRes}`;
                        rawProbs[key] += prob;
                        totalProb += prob;
                    }
                }
            }
        }

        const normalized = {};
        for (const k in rawProbs) {
            normalized[k] = Math.round((rawProbs[k] / (totalProb || 1)) * 10000) / 100;
        }

        return normalized;
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

window.PoissonModel = PoissonModel;
