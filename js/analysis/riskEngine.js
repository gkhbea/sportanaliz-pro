/**
 * riskEngine.js — Risk & Güven Değerlendirme Motoru
 */
const RiskEngine = {
    /**
     * Risk ve güven değerlendirmesi yap
     */
    evaluate(analysisResult) {
        if (!analysisResult || analysisResult.error) {
            return { confidence: 0, risk: 100, confidenceLabel: 'Düşük', riskLabel: 'Yüksek' };
        }

        const confidence = this.calculateConfidence(analysisResult);
        const risk = this.calculateRisk(analysisResult);
        const isValueBet = this.detectValueBet(analysisResult);

        return {
            confidence: Math.round(confidence),
            risk: Math.round(risk),
            confidenceLabel: Helpers.confidenceLabel(confidence).text,
            confidenceColor: Helpers.confidenceLabel(confidence).color,
            riskLabel: Helpers.riskLabel(risk).text,
            riskColor: Helpers.riskLabel(risk).color,
            isValueBet,
            warnings: this.getWarnings(analysisResult),
            recommendation: this.getRecommendation(confidence, risk, isValueBet)
        };
    },

    /**
     * Güven seviyesi hesapla (0-100)
     */
    calculateConfidence(result) {
        let score = 50; // Başlangıç

        // Veri kalitesi
        const missing = result.missing || [];
        score -= missing.length * 8;

        if (result.sportType === 'football' && result.poisson) {
            const mr = result.poisson.matchResult;
            const maxProb = Math.max(mr.home, mr.draw, mr.away);

            // Dominant sonuç = yüksek güven
            if (maxProb > 55) score += 15;
            else if (maxProb > 45) score += 8;
            else score -= 5;

            // Form tutarlılığı
            if (result.form) {
                const formDiff = Math.abs(result.form.home - result.form.away);
                if (formDiff > 30) score += 10;
            }

            // H2H desteği
            if (result.h2h?.available) score += 8;

            // Oranlarla uyum
            if (result.odds) {
                const bestModel = maxProb;
                const bestImplied = Math.max(
                    result.odds.home?.impliedProb || 0,
                    result.odds.draw?.impliedProb || 0,
                    result.odds.away?.impliedProb || 0
                );
                const alignment = 100 - Math.abs(bestModel - bestImplied);
                score += (alignment / 100) * 10;
            }
        }

        return Statistics.clamp(score, 5, 95);
    },

    /**
     * Risk seviyesi hesapla (0-100)
     */
    calculateRisk(result) {
        let risk = 40; // Orta başlangıç

        const missing = result.missing || [];
        risk += missing.length * 6;

        if (result.sportType === 'football' && result.poisson) {
            const mr = result.poisson.matchResult;
            const maxProb = Math.max(mr.home, mr.draw, mr.away);

            // Düşük olasılık = yüksek risk
            if (maxProb < 35) risk += 20;
            else if (maxProb < 45) risk += 10;
            else if (maxProb > 55) risk -= 10;

            // Beraberlik olasılığı yüksekse risk artar
            if (mr.draw > 30) risk += 8;

            // Çok gol beklentisi = belirsizlik
            if (result.poisson.totalExpected > 3.5) risk += 5;
        }

        // Odds value ters yönde → risk artışı
        if (result.odds?.hasValueBet) risk -= 5;

        return Statistics.clamp(risk, 5, 95);
    },

    /**
     * Value bet tespiti
     */
    detectValueBet(result) {
        if (!result.odds) return false;
        return result.odds.hasValueBet || false;
    },

    /**
     * Uyarılar
     */
    getWarnings(result) {
        const warnings = [];

        if (result.missing?.length > 0) {
            warnings.push(`⚠️ ${result.missing.length} eksik veri var. Analiz doğruluğu düşük olabilir.`);
        }

        if (result.sportType === 'football' && result.poisson) {
            if (result.poisson.matchResult.draw > 30) {
                warnings.push('⚠️ Beraberlik olasılığı yüksek. Sonuç tahmininde belirsizlik var.');
            }
        }

        if (!result.h2h?.available) {
            warnings.push('ℹ️ H2H verisi mevcut değil. Karşılıklı performans değerlendirilemedi.');
        }

        // Her zaman göster
        warnings.push('⚠️ Bu analiz istatistiksel modellerden üretilmiştir. Kesin sonuç garantisi vermez.');

        return warnings;
    },

    /**
     * Tavsiye
     */
    getRecommendation(confidence, risk, isValueBet) {
        if (confidence >= 70 && risk <= 40 && isValueBet) {
            return { text: 'Güçlü Value Bet', type: 'strong' };
        }
        if (confidence >= 60 && risk <= 50) {
            return { text: 'Olumlu Analiz', type: 'positive' };
        }
        if (confidence >= 40 && risk <= 60) {
            return { text: 'Nötr — Dikkatli Değerlendirin', type: 'neutral' };
        }
        return { text: 'Riskli — Ek Araştırma Önerilir', type: 'negative' };
    }
};

window.RiskEngine = RiskEngine;
