/**
 * footballAnalysis.js — Futbol Analiz Motoru
 */
const FootballAnalysis = {
    LEAGUE_AVG_GOALS: 1.35, // Lig ortalaması (toplam gol / 2)

    /**
     * Tam analiz yap
     */
    analyze(data) {
        const missing = this.validateData(data);
        if (missing.length > 5) {
            return { error: true, missing, message: 'Yeterli veri yok. Lütfen eksik verileri girin.' };
        }

        const home = data.home || {};
        const away = data.away || {};
        const h2h = data.h2h || {};
        const odds = data.odds || {};

        // Güç indeksleri
        const homeStrength = this.calculateTeamStrength(home, 'home');
        const awayStrength = this.calculateTeamStrength(away, 'away');

        // Beklenen goller
        const expectedGoals = this.calculateExpectedGoals(home, away, homeStrength, awayStrength);

        // Poisson modeli
        const poisson = PoissonModel.calculate(expectedGoals.home, expectedGoals.away);

        // Form analizi
        const homeForm = Statistics.calculateFormScore(
            home.last5_wins || 0, home.last5_draws || 0, home.last5_losses || 0
        );
        const awayForm = Statistics.calculateFormScore(
            away.last5_wins || 0, away.last5_draws || 0, away.last5_losses || 0
        );

        // H2H analizi
        const h2hAnalysis = this.analyzeH2H(h2h);

        // Oran analizi
        const oddsAnalysis = this.analyzeOdds(odds, poisson?.matchResult);

        // Faktörler
        const factors = this.buildFactors(home, away, homeForm, awayForm, homeStrength, awayStrength, h2hAnalysis, odds);

        return {
            error: false,
            missing,
            sportType: 'football',
            homeTeam: data.homeTeam,
            awayTeam: data.awayTeam,
            league: data.league,
            matchDate: data.matchDate,
            
            strength: { home: homeStrength, away: awayStrength },
            expectedGoals,
            poisson,
            form: { home: homeForm, away: awayForm },
            h2h: h2hAnalysis,
            odds: oddsAnalysis,
            factors,

            // Özet
            summary: this.buildSummary(poisson, oddsAnalysis, homeForm, awayForm)
        };
    },

    /**
     * Takım gücü hesapla
     */
    calculateTeamStrength(team, side) {
        const goalsAvg = team.goals_scored_avg || this.LEAGUE_AVG_GOALS;
        const concededAvg = team.goals_conceded_avg || this.LEAGUE_AVG_GOALS;
        
        const venueGoals = side === 'home' 
            ? (team.home_goals_avg || goalsAvg)
            : (team.away_goals_avg || goalsAvg);
        const venueConceded = side === 'home'
            ? (team.home_conceded_avg || concededAvg)
            : (team.away_conceded_avg || concededAvg);

        const attack = Statistics.calculateStrengthIndex(venueGoals, 0, this.LEAGUE_AVG_GOALS).attack;
        const defense = Statistics.calculateStrengthIndex(0, venueConceded, this.LEAGUE_AVG_GOALS).defense;

        return {
            attack: Math.max(0.3, Math.min(3.0, attack)),
            defense: Math.max(0.3, Math.min(3.0, defense)),
            overall: Math.round(((attack / defense) * 50) * 100) / 100,
            venueGoals,
            venueConceded
        };
    },

    /**
     * Beklenen goller hesapla
     * Home xG = lig ort * ev hücum gücü * deplasman savunma gücü * ev avantajı
     */
    calculateExpectedGoals(home, away, homeStrength, awayStrength) {
        const homeAdvantage = 1.1; // Ev sahibi avantajı (%10)
        
        const homeXG = this.LEAGUE_AVG_GOALS * homeStrength.attack * awayStrength.defense * homeAdvantage;
        const awayXG = this.LEAGUE_AVG_GOALS * awayStrength.attack * homeStrength.defense;

        // Ağırlıklı: %60 model + %40 gerçek ortalamalar
        const homeActual = home.home_goals_avg || home.goals_scored_avg || this.LEAGUE_AVG_GOALS;
        const awayActual = away.away_goals_avg || away.goals_scored_avg || this.LEAGUE_AVG_GOALS;

        return {
            home: Math.round(Statistics.weightedMean([homeXG, homeActual], [0.6, 0.4]) * 100) / 100,
            away: Math.round(Statistics.weightedMean([awayXG, awayActual], [0.6, 0.4]) * 100) / 100
        };
    },

    /**
     * H2H analizi
     */
    analyzeH2H(h2h) {
        const total = (h2h.home_wins || 0) + (h2h.draws || 0) + (h2h.away_wins || 0);
        if (total === 0) return { available: false };

        return {
            available: true,
            totalMatches: total,
            homeWinRate: Math.round((h2h.home_wins / total) * 100),
            drawRate: Math.round((h2h.draws / total) * 100),
            awayWinRate: Math.round((h2h.away_wins / total) * 100),
            avgGoals: h2h.total_goals_avg || null
        };
    },

    /**
     * Oran analizi & value tespiti
     */
    analyzeOdds(odds, modelResult) {
        if (!odds || !modelResult) return null;

        const analysis = {};

        if (odds.home) {
            const implied = Statistics.oddsToImpliedProbability(odds.home);
            const value = Statistics.calculateValue(modelResult.home, odds.home);
            analysis.home = {
                odds: odds.home,
                impliedProb: Math.round(implied * 100) / 100,
                modelProb: modelResult.home,
                valueDiff: Math.round(value * 100) / 100,
                isValue: value > 5
            };
        }

        if (odds.draw) {
            const implied = Statistics.oddsToImpliedProbability(odds.draw);
            const value = Statistics.calculateValue(modelResult.draw, odds.draw);
            analysis.draw = {
                odds: odds.draw,
                impliedProb: Math.round(implied * 100) / 100,
                modelProb: modelResult.draw,
                valueDiff: Math.round(value * 100) / 100,
                isValue: value > 5
            };
        }

        if (odds.away) {
            const implied = Statistics.oddsToImpliedProbability(odds.away);
            const value = Statistics.calculateValue(modelResult.away, odds.away);
            analysis.away = {
                odds: odds.away,
                impliedProb: Math.round(implied * 100) / 100,
                modelProb: modelResult.away,
                valueDiff: Math.round(value * 100) / 100,
                isValue: value > 5
            };
        }

        // Margin
        if (odds.home && odds.draw && odds.away) {
            analysis.margin = Math.round(Statistics.calculateMargin(odds.home, odds.draw, odds.away) * 100) / 100;
        }

        // Value bet var mı?
        analysis.hasValueBet = [analysis.home, analysis.draw, analysis.away]
            .filter(Boolean).some(a => a.isValue);

        return analysis;
    },

    /**
     * Faktörler listesi oluştur
     */
    buildFactors(home, away, homeForm, awayForm, homeStr, awayStr, h2h, odds) {
        const factors = [];

        // Form
        if (homeForm > 70) factors.push({ icon: '🔥', text: `Ev sahibi güçlü formda (${homeForm}/100)`, impact: 'positive' });
        else if (homeForm < 35) factors.push({ icon: '📉', text: `Ev sahibi kötü formda (${homeForm}/100)`, impact: 'negative' });

        if (awayForm > 70) factors.push({ icon: '🔥', text: `Deplasman güçlü formda (${awayForm}/100)`, impact: 'negative' });
        else if (awayForm < 35) factors.push({ icon: '📉', text: `Deplasman kötü formda (${awayForm}/100)`, impact: 'positive' });

        // Güç
        if (homeStr.attack > 1.5) factors.push({ icon: '⚔️', text: `Ev sahibi yüksek hücum gücü (${homeStr.attack}x)`, impact: 'positive' });
        if (homeStr.defense > 1.3) factors.push({ icon: '🛡️', text: `Ev sahibi zayıf savunma (${homeStr.defense}x lig ort.)`, impact: 'negative' });
        if (awayStr.attack > 1.5) factors.push({ icon: '⚔️', text: `Deplasman yüksek hücum gücü (${awayStr.attack}x)`, impact: 'negative' });

        // H2H
        if (h2h.available) {
            if (h2h.homeWinRate > 60) factors.push({ icon: '📊', text: `H2H: Ev sahibi baskın (%${h2h.homeWinRate})`, impact: 'positive' });
            else if (h2h.awayWinRate > 60) factors.push({ icon: '📊', text: `H2H: Deplasman baskın (%${h2h.awayWinRate})`, impact: 'negative' });
        }

        // Lig sırası
        if (home.league_position && away.league_position) {
            const diff = away.league_position - home.league_position;
            if (diff > 5) factors.push({ icon: '🏆', text: `Ev sahibi ligde ${diff} sıra üstte`, impact: 'positive' });
            else if (diff < -5) factors.push({ icon: '🏆', text: `Deplasman ligde ${Math.abs(diff)} sıra üstte`, impact: 'negative' });
        }

        // Ev avantajı
        factors.push({ icon: '🏟️', text: 'Ev sahibi avantajı hesaba katıldı (+%10)', impact: 'neutral' });

        // Gol beklentisi yüksek
        const totalXG = (homeStr.venueGoals || 0) + (awayStr.venueGoals || 0);
        if (totalXG > 3) factors.push({ icon: '⚽', text: `Yüksek gol beklentisi (${totalXG.toFixed(1)} gol)`, impact: 'neutral' });

        return factors;
    },

    /**
     * Özet oluştur
     */
    buildSummary(poisson, oddsAnalysis, homeForm, awayForm) {
        if (!poisson) return null;

        const mr = poisson.matchResult;
        const bestOutcome = mr.home > mr.away && mr.home > mr.draw ? '1'
            : mr.away > mr.home && mr.away > mr.draw ? '2' : 'X';

        return {
            bestOutcome,
            bestProb: Math.max(mr.home, mr.draw, mr.away),
            totalExpectedGoals: poisson.totalExpected,
            over25Prob: poisson.overUnder[2.5]?.over,
            bttsProb: poisson.btts.yes,
            hasValue: oddsAnalysis?.hasValueBet || false
        };
    },

    /**
     * Veri doğrulama
     */
    validateData(data) {
        const missing = [];
        const home = data.home || {};
        const away = data.away || {};

        if (!data.homeTeam) missing.push('Ev sahibi takım adı');
        if (!data.awayTeam) missing.push('Deplasman takım adı');
        if (!home.goals_scored_avg && !home.home_goals_avg) missing.push('Ev sahibi gol ortalaması');
        if (!away.goals_scored_avg && !away.away_goals_avg) missing.push('Deplasman gol ortalaması');
        if (!home.goals_conceded_avg && !home.home_conceded_avg) missing.push('Ev sahibi yenilen gol ortalaması');
        if (!away.goals_conceded_avg && !away.away_conceded_avg) missing.push('Deplasman yenilen gol ortalaması');
        
        return missing;
    }
};

window.FootballAnalysis = FootballAnalysis;
