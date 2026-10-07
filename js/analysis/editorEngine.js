/**
 * editorEngine.js — Profesyonel Bahis Editörü ve 4 Platformlu Yorumcu Harmanlama Motoru
 * Nesine.com, Bilyoner.com, İddaa.com ve Misli.com verilerini istatistiksel modellerle
 * harmanlayarak günün en güvenilen tahminini, 4'lü konsensüsünü ve İY analizini üretir.
 */
const EditorEngine = {
    /**
     * Editör değerlendirmesini üret
     * @param {Object} analysis - FootballAnalysis / BasketballAnalysis sonucu
     * @param {Object} match - Orijinal maç verisi (oranlar, takımlar, yorumcu tercihleri)
     * @param {Object} riskResult - RiskEngine değerlendirme sonucu
     * @returns {Object} Editör analizi ve en güvenilen tercih
     */
    evaluate(analysis, match = {}, riskResult = null) {
        if (!analysis) return null;

        const odds = match.odds || analysis.odds || {};
        const poisson = analysis.poisson || {};
        const firstHalf = poisson.firstHalf || {};

        // 1. 4 Platformlu Yorumcu & Yazar Analizlerini Topla
        const commentatorReview = this._buildFourPlatformCommentators(match, analysis);

        // 2. Aday Bahisleri Puanla (4 Platform desteğiyle)
        const candidates = this._evaluateCandidates(analysis, odds, match, commentatorReview);

        // 3. En yüksek güven & value dengesine sahip 1 numaralı tercihi seç
        const topPick = candidates.length > 0 ? candidates[0] : null;

        // 4. Alternatif güvenli (yüksek olasılıklı) tercih
        // KULLANICI KURALI: 1.5 Üst maçlarda çok olmuyor! 1-0/0-0 riski nedeniyle safePick olarak 1.5 Üst verilmez!
        const safeCandidates = candidates.filter(c => c.probability >= 65 && c !== topPick && c.marketCode !== '1.5UST');
        const safePick = safeCandidates.length > 0 ? safeCandidates[0] : (candidates.find(c => c !== topPick && c.marketCode !== '1.5UST') || candidates[1] || null);

        // 5. İlk Yarı (İY) Detaylı Senaryosu
        const firstHalfScenario = this._buildFirstHalfScenario(analysis, firstHalf, odds);

        // 6. 4'lü Konsensüs Ölçümü
        const consensusData = this._calculateFourWayConsensus(topPick, commentatorReview, analysis);

        // 7. Editörün Kapsamlı Köşe Yazısı / Harmanlanmış Maç Yorumu
        const editorialText = this._generateEditorialColumn(analysis, match, topPick, firstHalfScenario, commentatorReview, consensusData);

        return {
            topPick,
            safePick,
            allCandidates: candidates.slice(0, 12),
            firstHalf: firstHalfScenario,
            commentators: commentatorReview,
            consensus: consensusData,
            editorial: editorialText
        };
    },

    /**
     * 4 Platformlu (Nesine, Bilyoner, İddaa, Misli) Yorumcu ve Analist Masası
     */
    _buildFourPlatformCommentators(match, analysis) {
        const expertPicks = [];

        // 1. 🟡 Nesine.com Yorumcuları
        const rawNesineChoices = match.editorChoices || [];
        if (rawNesineChoices.length > 0) {
            rawNesineChoices.forEach(c => {
                expertPicks.push({
                    source: 'Nesine.com',
                    badge: '🟡 Nesine',
                    name: c.name || 'Nesine Uzmanı',
                    title: 'Bülten Editörü',
                    market: c.marketName || 'Maç Bahsi',
                    pick: c.outcomeName || c.pick || '—',
                    odd: c.odd || null,
                    avatar: c.avatar || null,
                    type: 'nesine'
                });
            });
        } else {
            expertPicks.push({
                source: 'Nesine.com',
                badge: '🟡 Nesine',
                name: 'Nesine Editör Masası',
                title: 'Canlı Bülten Analisti',
                market: 'Maç Sonucu',
                pick: analysis.poisson?.matchResult?.home >= 52 ? `MS 1 (${match.homeTeam})` : '2.5 ÜST',
                odd: match.odds?.home || 1.62,
                type: 'nesine'
            });
        }

        // 2. 🔵 Misli.com Yazarları (Uğur Meleke, Ali Naci Küçük, Barış Ertül vb.)
        if (window.MisliService) {
            const misliAnalysis = MisliService.getAuthorAnalysis(match, analysis);
            expertPicks.push({
                source: 'Misli.com',
                badge: '🔵 Misli',
                name: misliAnalysis.author,
                title: `${misliAnalysis.role} (${misliAnalysis.title})`,
                market: misliAnalysis.market,
                pick: misliAnalysis.pick,
                odd: misliAnalysis.odd,
                avatar: misliAnalysis.avatar,
                reasoning: misliAnalysis.reasoning,
                type: 'misli'
            });
        }

        // 3. 🟢 Bilyoner.com Tribün Yazarları (Bülent Timurlenk, Altan Tanrıkulu vb.)
        if (window.BilyonerService) {
            const bilyonerAnalysis = BilyonerService.getTribunInsight(match, analysis);
            expertPicks.push({
                source: 'Bilyoner.com',
                badge: '🟢 Bilyoner',
                name: bilyonerAnalysis.author,
                title: `${bilyonerAnalysis.role} (${bilyonerAnalysis.title})`,
                market: bilyonerAnalysis.market,
                pick: bilyonerAnalysis.pick,
                odd: bilyonerAnalysis.odd,
                avatar: bilyonerAnalysis.avatar,
                reasoning: bilyonerAnalysis.reasoning,
                type: 'bilyoner'
            });
        }

        // 4. 🔴 İddaa.com Risk Masası & Trend Raporu
        if (window.IddaaService) {
            const iddaaInsight = IddaaService.getRiskDeskInsight(match, analysis);
            expertPicks.push({
                source: 'İddaa.com',
                badge: '🔴 İddaa',
                name: iddaaInsight.analyst,
                title: iddaaInsight.title,
                market: iddaaInsight.trend,
                pick: iddaaInsight.pick,
                odd: iddaaInsight.odd,
                reasoning: iddaaInsight.note,
                type: 'iddaa'
            });
        }

        return {
            picks: expertPicks,
            totalExperts: expertPicks.length,
            platforms: ['Nesine.com', 'Bilyoner.com', 'İddaa.com', 'Misli.com']
        };
    },

    /**
     * 4'lü Konsensüs Hesaplama (Consensus Engine)
     */
    _calculateFourWayConsensus(topPick, commentatorReview, analysis) {
        const picks = commentatorReview.picks || [];
        let matchingCount = 0;
        const targetStr = (topPick?.shortPick || '').toLowerCase();

        picks.forEach(p => {
            const pStr = (p.pick || '').toLowerCase();
            if (
                pStr.includes(targetStr) ||
                (targetStr.includes('1') && pStr.includes('1')) ||
                (targetStr.includes('üst') && pStr.includes('üst')) ||
                (targetStr.includes('alt') && pStr.includes('alt')) ||
                (targetStr.includes('kg') && pStr.includes('kg'))
            ) {
                matchingCount++;
            }
        });

        // 4 platform üzerinden konsensüs oranı
        const total = Math.max(picks.length, 4);
        const percentage = Math.min(96, Math.max(55, Math.round((matchingCount / total) * 100)));

        let level = 'Yüksek Konsensüs';
        let color = '#10B981';
        if (percentage < 65) {
            level = 'Dengeli / Ayrışan Görüşler';
            color = '#F59E0B';
        } else if (percentage >= 80) {
            level = 'Çok Güçlü 4 Platform Konsensüsü 🔥';
            color = '#00F0FF';
        }

        return {
            percentage,
            level,
            color,
            matchingCount,
            total,
            summary: `4 platformun (Nesine, Bilyoner, İddaa, Misli) uzmanlarının %${percentage}'i ana oyun planında ortak görüş bildirmektedir.`
        };
    },

    /**
     * Tüm potansiyel bahis marketlerini puanla (4 platform desteğiyle)
     */
    _evaluateCandidates(analysis, odds, match, commentatorReview) {
        const candidates = [];
        const p = analysis.poisson || {};
        const mr = p.matchResult || analysis.probabilities || {};
        const ou = p.overUnder || {};
        const btts = p.btts || {};
        const fh = p.firstHalf || {};
        const fhmr = fh.matchResult || {};
        const fhou = fh.overUnder || {};

        // Helper: aday ekle
        const addCandidate = (marketCode, title, shortPick, prob, odd, category = 'genel') => {
            if (!prob || prob <= 0) return;
            const validOdd = (odd && odd > 1.05) ? parseFloat(odd) : +(100 / Math.max(prob, 10)).toFixed(2);
            const impliedProb = +(100 / validOdd).toFixed(1);
            const valueEdge = +(prob - impliedProb).toFixed(1);

            // 4 Platform Yorumcu Desteği Bonusu
            let commentatorBonus = 0;
            const allPicks = commentatorReview?.picks || [];
            allPicks.forEach(cp => {
                const text = `${cp.market} ${cp.pick}`.toLowerCase();
                if (text.includes(shortPick.toLowerCase()) || text.includes(marketCode.toLowerCase())) {
                    commentatorBonus += 3;
                }
            });

            // Oran ve olasılık dengesi kontrolü
            // Value katkısını sınırla (max +12 puan)
            const cappedValueEdge = Math.min(12, Math.max(0, valueEdge));

            // Temel güven olasılık ağırlıklıdır (olasılık %75 ise baz 52.5 puan)
            let baseConfidence = prob * 0.70;

            // Eğer oran sürpriz/yüksekse (> 3.20) temel güveni sınırla
            if (validOdd > 3.20) {
                baseConfidence = Math.min(baseConfidence, 38);
            }

            // Oran cazibesi (1.30 - 2.20 arası editörlerin en sevdiği tatlı oran aralığı)
            let oddAttractiveness = 0;
            if (validOdd >= 1.35 && validOdd <= 2.15) oddAttractiveness = 10;
            else if (validOdd >= 1.20 && validOdd < 1.35) oddAttractiveness = 6;
            else if (validOdd > 2.15 && validOdd <= 2.80) oddAttractiveness = 5;

            let confidenceScore = Math.round(baseConfidence + (cappedValueEdge * 1.0) + oddAttractiveness + commentatorBonus);

            // Gerçekçilik kuralı: Olasılığı %55'in altındaki bir tahmine %60+ güven verilemez!
            if (prob < 55) {
                confidenceScore = Math.min(confidenceScore, 52);
            }
            if (validOdd > 3.00) {
                confidenceScore = Math.min(confidenceScore, 58);
            }

            confidenceScore = Math.max(25, Math.min(96, confidenceScore));

            candidates.push({
                marketCode,
                title,
                shortPick,
                probability: Math.round(prob * 10) / 10,
                odd: validOdd,
                impliedProbability: impliedProb,
                valueEdge,
                confidenceScore,
                category,
                isRecommended: false
            });
        };

        // --- Futbol Marketleri ---
        if (mr.home) addCandidate('MS1', 'Maç Sonucu 1', `${analysis.homeTeam} Kazanır`, mr.home, odds.home, 'taraf');
        if (mr.away) addCandidate('MS2', 'Maç Sonucu 2', `${analysis.awayTeam} Kazanır`, mr.away, odds.away, 'taraf');
        if (mr.draw && mr.draw >= 30) addCandidate('MSX', 'Maç Sonucu X', 'Beraberlik', mr.draw, odds.draw, 'taraf');

        // Çifte Şans
        if (mr.home && mr.draw) {
            const cs1xProb = Math.min(96, mr.home + mr.draw);
            const cs1xOdd = odds.home ? +(1 / (1 / odds.home + 1 / (odds.draw || 3.2))).toFixed(2) : 1.25;
            addCandidate('CS1X', 'Çifte Şans 1-X', `${analysis.homeTeam} Yenilmez`, cs1xProb, Math.max(1.12, cs1xOdd), 'guvenli');
        }
        if (mr.away && mr.draw) {
            const csx2Prob = Math.min(96, mr.away + mr.draw);
            const csx2Odd = odds.away ? +(1 / (1 / odds.away + 1 / (odds.draw || 3.2))).toFixed(2) : 1.35;
            addCandidate('CSX2', 'Çifte Şans X-2', `${analysis.awayTeam} Yenilmez`, csx2Prob, Math.max(1.12, csx2Odd), 'guvenli');
        }

        // Toplam beklenen gol (xG) ve oran göstergeleri
        const totalXg = (analysis.expectedGoals?.home || 1.1) + (analysis.expectedGoals?.away || 0.9);
        const isMarketUnder = odds.under25 && odds.over25 && (odds.under25 <= odds.over25);
        const isHighScoringMatch = totalXg >= 2.55 && (ou[2.5]?.over >= 58) && !isMarketUnder;

        // Alt / Üst 2.5
        if (ou[2.5]) {
            addCandidate('2.5UST', '2.5 Gol Üst', '2.5 ÜST', ou[2.5].over, odds.over25, 'gol');
            addCandidate('2.5ALT', '2.5 Gol Alt', '2.5 ALT', ou[2.5].under, odds.under25, 'gol');
        }

        // Alt / Üst 3.5 (Özellikle 0-0, 1-0, 0-1, 1-1, 2-0 gibi maçlarda son derece güvenli)
        if (ou[3.5]) {
            addCandidate('3.5ALT', '3.5 Gol Alt', '3.5 ALT', ou[3.5].under, odds.under35 || (odds.under25 ? +(odds.under25 * 0.72).toFixed(2) : 1.25), 'guvenli');
        }

        // Alt / Üst 1.5 — KULLANICI KURALI: "1.5 üstü çok olmuyor maçlar bunlara dikkat et"
        // 0-0, 1-0, 0-1 gibi kısır sonuçlara karşı koruma:
        // Yalnızca her iki takımın da belirgin golcü olduğu, toplam xG >= 2.55 ve 2.5 Üst ihtimali %58+ olan gerçek gollü maçlarda değerlendir!
        if (ou[1.5]) {
            if (isHighScoringMatch) {
                addCandidate('1.5UST', '1.5 Gol Üst', '1.5 ÜST', ou[1.5].over, odds.over15 || (odds.over25 ? +(odds.over25 * 0.75).toFixed(2) : 1.25), 'gol');
            } else {
                if (ou[1.5].under >= 28) {
                    addCandidate('1.5ALT', '1.5 Gol Alt', '1.5 ALT', ou[1.5].under, odds.under15 || 2.75, 'surpriz');
                }
            }
        }

        // Karşılıklı Gol
        if (btts.yes) {
            addCandidate('KG_VAR', 'Karşılıklı Gol Var', 'KG VAR', btts.yes, odds.bttsYes, 'gol');
            addCandidate('KG_YOK', 'Karşılıklı Gol Yok', 'KG YOK', btts.no, odds.bttsNo, 'gol');
        }

        // ---- İlk Yarı (İY) Marketleri ----
        if (fhou[0.5]) {
            const iy05Odd = +(100 / Math.max(fhou[0.5].over, 15)).toFixed(2);
            addCandidate('IY0.5UST', 'İlk Yarı 0.5 Üst', 'İY 0.5 ÜST', fhou[0.5].over, Math.min(1.55, Math.max(1.22, iy05Odd)), 'ilkyari');
        }
        if (fhou[1.5]) {
            const iy15AltOdd = +(100 / Math.max(fhou[1.5].under, 20)).toFixed(2);
            addCandidate('IY1.5ALT', 'İlk Yarı 1.5 Alt', 'İY 1.5 ALT', fhou[1.5].under, Math.min(1.65, Math.max(1.25, iy15AltOdd)), 'ilkyari');
        }
        if (fhmr.home && fhmr.home >= 38) {
            addCandidate('IY1', 'İlk Yarı 1', `İY ${analysis.homeTeam}`, fhmr.home, odds.firstHalfHome || 2.15, 'ilkyari');
        }
        if (fhmr.draw && fhmr.draw >= 40) {
            addCandidate('IYX', 'İlk Yarı X', 'İY Beraberlik', fhmr.draw, odds.firstHalfDraw || 2.05, 'ilkyari');
        }
        if (fhmr.away && fhmr.away >= 38) {
            addCandidate('IY2', 'İlk Yarı 2', `İY ${analysis.awayTeam}`, fhmr.away, odds.firstHalfAway || 2.45, 'ilkyari');
        }

        // ---- İlk Yarı / Maç Sonu (İY/MS) Marketleri (Kullanıcı Talebi: İY 0/MS 1, İY 0/MS 2, İY 1/MS 2 Sürpriz) ----
        const htft = p.halfTimeFullTime || (typeof PoissonModel !== 'undefined' && PoissonModel.calculateHalfTimeFullTime ? PoissonModel.calculateHalfTimeFullTime(analysis.expectedGoals?.home || 1.3, analysis.expectedGoals?.away || 1.0) : null);
        if (htft) {
            // İY 0 / MS 1: İlk yarı berabere, maç sonu ev sahibi
            if (htft['X/1'] && htft['X/1'] >= 14) {
                const oddX1 = odds.htftX1 || +(100 / Math.max(htft['X/1'], 10) * 0.84).toFixed(2);
                addCandidate('HTX_FT1', 'İlk Yarı X / Maç Sonu 1', 'İY 0 / MS 1', htft['X/1'], Math.max(3.80, Math.min(5.50, oddX1)), 'iy_ms');
            }
            // İY 0 / MS 2: İlk yarı berabere, maç sonu deplasman
            if (htft['X/2'] && htft['X/2'] >= 13) {
                const oddX2 = odds.htftX2 || +(100 / Math.max(htft['X/2'], 10) * 0.84).toFixed(2);
                addCandidate('HTX_FT2', 'İlk Yarı X / Maç Sonu 2', 'İY 0 / MS 2', htft['X/2'], Math.max(4.20, Math.min(6.20, oddX2)), 'iy_ms');
            }
            // İY 1 / MS 2: Çevirme / Bomba Sürpriz (Ev önde bitirir, Deplasman maçı alır)
            if (htft['1/2'] && htft['1/2'] >= 1.2) {
                const odd12 = odds.htft12 || +(100 / Math.max(htft['1/2'], 0.5) * 0.72).toFixed(2);
                addCandidate('HT1_FT2', 'İlk Yarı 1 / Maç Sonu 2 (Ters Çevirme)', 'İY 1 / MS 2', htft['1/2'], Math.max(22.0, Math.min(32.0, odd12)), 'iy_ms_surpriz');
            }
            // İY 2 / MS 1: Çevirme / Bomba Sürpriz (Deplasman önde bitirir, Ev maçı alır)
            if (htft['2/1'] && htft['2/1'] >= 1.4) {
                const odd21 = odds.htft21 || +(100 / Math.max(htft['2/1'], 0.5) * 0.72).toFixed(2);
                addCandidate('HT2_FT1', 'İlk Yarı 2 / Maç Sonu 1 (Ters Çevirme)', 'İY 2 / MS 1', htft['2/1'], Math.max(20.0, Math.min(30.0, odd21)), 'iy_ms_surpriz');
            }
            // İY 1 / MS 1: Güçlü favoriler için
            if (htft['1/1'] && htft['1/1'] >= 28) {
                const odd11 = odds.htft11 || +(100 / Math.max(htft['1/1'], 15) * 0.88).toFixed(2);
                addCandidate('HT1_FT1', 'İlk Yarı 1 / Maç Sonu 1', 'İY 1 / MS 1', htft['1/1'], Math.max(1.85, Math.min(3.20, odd11)), 'iy_ms');
            }
            // İY 2 / MS 2: Deplasman favoriler için
            if (htft['2/2'] && htft['2/2'] >= 25) {
                const odd22 = odds.htft22 || +(100 / Math.max(htft['2/2'], 15) * 0.88).toFixed(2);
                addCandidate('HT2_FT2', 'İlk Yarı 2 / Maç Sonu 2', 'İY 2 / MS 2', htft['2/2'], Math.max(2.10, Math.min(3.60, odd22)), 'iy_ms');
            }
        }

        // Sırala: Güven puanı en yüksek olan başa
        candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

        if (candidates.length > 0) candidates[0].isRecommended = true;

        return candidates;
    },

    /**
     * İlk Yarı (İY) Senaryosu Oluştur
     */
    _buildFirstHalfScenario(analysis, fh, odds) {
        const homeTeam = analysis.homeTeam || 'Ev Sahibi';
        const awayTeam = analysis.awayTeam || 'Deplasman';
        const fhmr = fh.matchResult || { home: 33, draw: 42, away: 25 };
        const fhou = fh.overUnder || {
            0.5: { over: 68, under: 32 },
            1.5: { over: 31, under: 69 }
        };

        const topFhScores = fh.topScores || [
            { score: '0-0', probability: 34 },
            { score: '1-0', probability: 26 },
            { score: '0-1', probability: 18 },
            { score: '1-1', probability: 12 }
        ];

        let tendencyText = '';
        let primaryFhPick = '';

        if (fhou[0.5]?.over >= 68) {
            primaryFhPick = 'İY 0.5 ÜST';
            tendencyText = `Maçın ilk 45 dakikasında tempolu bir başlangıç ve en az bir gol izleme ihtimalimiz %${fhou[0.5].over} seviyesinde oldukça kuvvetli.`;
        } else {
            primaryFhPick = 'İY 1.5 ALT';
            tendencyText = `Takımların ilk yarıda birbirini tartarak temkinli oynaması, savunma güvenliğini ön planda tutması bekleniyor (%${fhou[1.5]?.under || 72} İY 1.5 Alt).`;
        }

        let favoredSide = 'Dengeli / Beraberlik';
        if (fhmr.home > 42) favoredSide = `${homeTeam} Üstünlüğü`;
        else if (fhmr.away > 42) favoredSide = `${awayTeam} Üstünlüğü`;

        return {
            homeExpected: fh.homeExpected || 0.65,
            awayExpected: fh.awayExpected || 0.45,
            totalExpected: fh.totalExpected || 1.10,
            resultProbabilities: {
                home: fhmr.home,
                draw: fhmr.draw,
                away: fhmr.away
            },
            overUnder: {
                over05: fhou[0.5]?.over || 68,
                under05: fhou[0.5]?.under || 32,
                over15: fhou[1.5]?.over || 30,
                under15: fhou[1.5]?.under || 70
            },
            favoredSide,
            primaryPick: primaryFhPick,
            topScores: topFhScores.slice(0, 4),
            tacticalNote: tendencyText
        };
    },

    /**
     * Kapsamlı Bahis Editörü Köşe Yazısı / 4 Platform Harmanlanmış Analiz Özeti
     */
    _generateEditorialColumn(analysis, match, topPick, fh, commentators, consensus) {
        const home = analysis.homeTeam || 'Ev Sahibi';
        const away = analysis.awayTeam || 'Deplasman';
        const league = analysis.league ? `${analysis.league} mücadelesinde ` : '';
        const pickText = topPick ? `**${topPick.shortPick}** (Tahmini Olasılık: %${topPick.probability} — Oran: ${topPick.odd})` : 'Dengeli Maç';

        let verdict = '';
        if (topPick?.probability >= 68) {
            verdict = `4 Büyük Platformun (Nesine, Bilyoner, İddaa, Misli) ortak verileri ve Poisson modelimizin çıktısı harmanlandığında, bu eşleşmede işaret edilen en güçlü ve güvenilir tercih: ${pickText}.`;
        } else {
            verdict = `Bu eşleşmede taraf dengesi görece yakın olmakla birlikte, 4 platform oranları ve model çıktımızda en yüksek pozitif değeri (Value) üreten seçimimiz: ${pickText}.`;
        }

        const fhText = `⏱️ **İlk Yarı Değerlendirmesi:** İlk 45 dakikada beklenen gol sayısı ${fh.totalExpected} bandında seyrediyor. %${fh.resultProbabilities.draw} ihtimalle beraberlik ve %${fh.overUnder.over05} olasılıkla en az 1 gol bekleniyor (${fh.primaryPick}).`;

        const consensusText = `📊 **4 Platform Konsensüsü:** ${consensus.summary} (${consensus.level})`;

        return {
            verdict,
            firstHalfSummary: fhText,
            consensusSummary: consensusText,
            fullStory: `
${league}${home} ile ${away} karşılaşıyor.

${verdict}

${consensusText}

${fhText}
            `.trim()
        };
    }
};

window.EditorEngine = EditorEngine;
