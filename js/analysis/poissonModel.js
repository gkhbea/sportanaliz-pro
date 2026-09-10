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

        return {
            homeExpected: Math.round(homeExpected * 100) / 100,
            awayExpected: Math.round(awayExpected * 100) / 100,
            totalExpected: Math.round((homeExpected + awayExpected) * 100) / 100,
            scoreMatrix,
            matchResult,
            overUnder,
            btts,
            topScores,
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
