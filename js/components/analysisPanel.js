/**
 * analysisPanel.js — Analiz Paneli Bileşeni
 * Bahis Editörü Görüşü, İlk Yarı (İY) Analizi ve Nesine/Bilyoner Yorumcu Değerlendirmeleriyle Zenginleştirildi
 */
const AnalysisPanel = {
    /**
     * Tam analiz panelini render et
     */
    render(analysisResult, riskResult, match = {}, editorAnalysis = null) {
        if (!analysisResult) return '<div class="empty-state"><span class="empty-icon">📊</span><h3>Analiz verisi yok</h3></div>';

        if (analysisResult.error) {
            return this.renderError(analysisResult);
        }

        // Eğer editorAnalysis dışarıdan verilmediyse burada üret
        if (!editorAnalysis && window.EditorEngine) {
            editorAnalysis = EditorEngine.evaluate(analysisResult, match, riskResult);
        }

        const sport = analysisResult.sportType || 'football';

        let html = '';
        html += this.renderHeader(analysisResult, match);

        // 1. 🎯 En Güvenilen Bahis / Editör Seçimi (Üst Manşet)
        if (editorAnalysis && editorAnalysis.topPick) {
            html += this.renderEditorTopPick(editorAnalysis, match);
        }

        html += '<div class="analysis-grid">';

        html += this.renderFootballProbabilities(analysisResult);
        html += this.renderConfidenceRisk(riskResult);
        
        // 2. ⏱️ İlk Yarı (İY) Detaylı Analizi
        html += this.renderFirstHalfAnalysis(analysisResult, editorAnalysis);
        
        // 3. 🎙️ Nesine, Misli & Bilyoner Yorumcu Değerlendirmesi
        html += this.renderCommentatorInsights(editorAnalysis, match);

        // 4. 📊 Gelişmiş Taktiksel İstatistik, xG ve Momentum Analizi (Oransız)
        if (window.SofascoreService) {
            const sofaAnalytics = SofascoreService.getMatchAnalytics(match || analysisResult);
            html += SofascoreService.renderSofascoreCard(sofaAnalytics);
        }

        // 5. 👥 İlk 11 Kadro & 10 Maç Oyuncu Reyting Analizi
        if (window.SquadRatingEngine) {
            html += this.renderSquadRatingSection(match || analysisResult);
        }

        html += this.renderScoreDistribution(analysisResult);
        html += this.renderOverUnder(analysisResult);
        html += this.renderOddsComparison(analysisResult);

        html += this.renderFactors(analysisResult.factors);
        html += this.renderWarnings(riskResult?.warnings);
        html += '</div>';

        return html;
    },

    /**
     * Header
     */
    renderHeader(result, match) {
        const m = match || result;
        const ls = m?.liveScore || (window.MatchTracker ? window.MatchTracker.getMatchScore(m) : null);
        const isFin = ls && (ls.isFinished || ls.status === 'FINISHED' || ls.minute === 'MS' || m.status === 'FINISHED');
        const isLiv = ls && !isFin && (ls.isLive || ls.status === 'LIVE');
        const iddaaCode = m?.iddaaCode || m?.code || result?.iddaaCode || '';
        const mackolikUrl = m?.mackolikUrl || ls?.mackolikUrl || (iddaaCode ? `https://arsiv.mackolik.com/Match/Default.aspx?id=${iddaaCode}` : 'https://arsiv.mackolik.com/Canli-Sonuclar');

        let scoreBadge = '';
        if (isFin) {
            const h = typeof ls.home === 'number' ? ls.home : (typeof ls.homeScore === 'number' ? ls.homeScore : 0);
            const a = typeof ls.away === 'number' ? ls.away : (typeof ls.awayScore === 'number' ? ls.awayScore : 0);
            scoreBadge = `
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <span style="background:rgba(34,197,94,0.2);border:1px solid #22c55e;color:#4ade80;padding:3px 10px;border-radius:6px;font-weight:900;font-size:0.85rem;">🏁 RESMİ SONUÇ: ${h} - ${a}</span>
                    <a href="${mackolikUrl}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(135deg,rgba(234,179,8,0.2),rgba(202,138,4,0.3));border:1px solid #facc15;color:#facc15;padding:3px 10px;border-radius:6px;font-weight:800;font-size:0.75rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Resmi Maçkolik sayfasından maç sonucunu teyit et">
                        🔗 Maçkolik ile Teyit Et ↗
                    </a>
                </div>
            `;
        } else if (isLiv) {
            const h = typeof ls.home === 'number' ? ls.home : (typeof ls.homeScore === 'number' ? ls.homeScore : 0);
            const a = typeof ls.away === 'number' ? ls.away : (typeof ls.awayScore === 'number' ? ls.awayScore : 0);
            const min = ls.minute || 'Canlı';
            scoreBadge = `
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <span style="background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#f87171;padding:3px 10px;border-radius:6px;font-weight:900;font-size:0.85rem;animation:pulse 2s infinite;">🔴 CANLI ${min}: ${h} - ${a}</span>
                    <a href="${mackolikUrl}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(135deg,rgba(234,179,8,0.2),rgba(202,138,4,0.3));border:1px solid #facc15;color:#facc15;padding:3px 10px;border-radius:6px;font-weight:800;font-size:0.75rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Resmi Maçkolik sayfasından maçı teyit et">
                        🔗 Maçkolik ile Teyit Et ↗
                    </a>
                </div>
            `;
        } else if (iddaaCode) {
            scoreBadge = `
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <a href="${mackolikUrl}" target="_blank" rel="noopener noreferrer" style="background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.4);color:#facc15;padding:3px 10px;border-radius:6px;font-weight:800;font-size:0.75rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Resmi Maçkolik bülten sayfasından maçı teyit et">
                        🔗 Maçkolik Maç Sayfası ↗
                    </a>
                </div>
            `;
        }

        return `
            <div class="analysis-header">
                <div class="analysis-teams">
                    <span class="analysis-team-name">${Helpers.escapeHtml(result.homeTeam || '—')}</span>
                    <span class="analysis-vs">vs</span>
                    <span class="analysis-team-name">${Helpers.escapeHtml(result.awayTeam || '—')}</span>
                </div>
                <div class="analysis-meta">
                    <div class="league-name">${Helpers.escapeHtml(result.league || '')}</div>
                    <div class="match-date-info">${result.matchDate ? Helpers.formatDate(result.matchDate, 'full') : ''}</div>
                    ${scoreBadge}
                </div>
            </div>
        `;
    },

    /**
     * 🎯 Bahis Editörünün En Güvendiği Tercih (4 Platform Harmanı & Konsensüs)
     */
    renderEditorTopPick(editorAnalysis, match) {
        const p = editorAnalysis.topPick;
        if (!p) return '';

        const safe = editorAnalysis.safePick;
        const cons = editorAnalysis.consensus || { percentage: 85, level: 'Yüksek Konsensüs' };
        const confidenceClass = p.confidenceScore >= 80 ? 'val-green' : '';

        return `
            <div class="editor-top-pick-card">
                <div class="editor-header-bar">
                    <div class="editor-badge">
                        <span>🎯</span> BAHİS EDİTÖRÜNÜN TAVSİYESİ & EN GÜVENİLEN TAHMİN
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <div class="editor-confidence-tag">
                            <span>⭐</span> Güven: %${p.confidenceScore}/100
                        </div>
                        <div class="editor-confidence-tag" style="background:rgba(0,240,255,0.12);border-color:rgba(0,240,255,0.3);color:var(--accent-cyan);">
                            <span>📊</span> 4 Platform Konsensüsü: %${cons.percentage}
                        </div>
                    </div>
                </div>

                <div class="editor-main-prediction">
                    <div class="prediction-highlight">
                        <div class="prediction-icon">🔥</div>
                        <div class="prediction-title-group">
                            <span class="prediction-market-label">4 PLATFORM (NESİNE · BİLYONER · İDDAA · MİSLİ) HARMANI</span>
                            <span class="prediction-pick-name">${p.shortPick}</span>
                        </div>
                    </div>

                    <div class="prediction-stats-group">
                        <div class="prediction-stat-box">
                            <div class="lbl">Model Olasılığı</div>
                            <div class="val">%${p.probability}</div>
                        </div>
                        <div class="prediction-stat-box">
                            <div class="lbl">Tavsiye Oran</div>
                            <div class="val">${p.odd ? p.odd.toFixed(2) : '—'}</div>
                        </div>
                        <div class="prediction-stat-box ${p.valueEdge > 0 ? 'val-green' : ''}">
                            <div class="lbl">Değer (Value)</div>
                            <div class="val">${p.valueEdge > 0 ? '+' : ''}${p.valueEdge}%</div>
                        </div>
                    </div>
                </div>

                ${editorAnalysis.editorial ? `
                <div class="editor-editorial-box">
                    <strong>📝 Editör Notu & 4 Platform Değerlendirmesi:</strong> ${editorAnalysis.editorial.verdict}
                </div>` : ''}

                ${safe && safe.shortPick !== p.shortPick ? `
                <div class="editor-safe-alternative">
                    <span>🛡️ <strong>Alternatif / Yüksek Güvenli Seçenek:</strong> ${safe.shortPick} (Olasılık: %${safe.probability} — Oran: ${safe.odd})</span>
                    <span class="badge badge-value">Düşük Risk</span>
                </div>` : ''}
            </div>
        `;
    },

    /**
     * ⏱️ İlk Yarı (İY) Detaylı Analizi
     */
    renderFirstHalfAnalysis(result, editorAnalysis) {
        const fh = editorAnalysis?.firstHalf || result.poisson?.firstHalf;
        if (!fh) return '';

        const mr = fh.resultProbabilities || fh.matchResult || { home: 30, draw: 45, away: 25 };
        const ou = fh.overUnder || {};
        const homeName = Helpers.teamAbbreviation(result.homeTeam || 'EV');
        const awayName = Helpers.teamAbbreviation(result.awayTeam || 'DEP');

        return `
            <div class="analysis-card first-half-card">
                <div class="analysis-card-title">⏱️ İlk Yarı (İY) Detaylı Analizi & Senaryosu</div>
                
                <div style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:12px;">
                    İlk yarı beklenen gol (xG): <strong style="color:var(--accent-cyan);">${fh.totalExpected || '1.1'}</strong>
                    · Eğilim: <strong style="color:var(--accent-green);">${fh.favoredSide || 'Dengeli'}</strong>
                </div>

                <!-- İY 1X2 Çubukları -->
                <div class="prob-bars">
                    ${this.renderProbBar(`İY 1 (${homeName})`, mr.home || 30, 'home')}
                    ${this.renderProbBar('İY X (Beraberlik)', mr.draw || 45, 'draw')}
                    ${this.renderProbBar(`İY 2 (${awayName})`, mr.away || 25, 'away')}
                </div>

                <!-- İY Gol İstatistikleri Grid -->
                <div class="first-half-stats-grid">
                    <div class="fh-stat-pill">
                        <div class="fh-lbl">İY 0.5 ÜST</div>
                        <div class="fh-val">%${ou.over05 || ou[0.5]?.over || 68}</div>
                    </div>
                    <div class="fh-stat-pill">
                        <div class="fh-lbl">İY 1.5 ALT</div>
                        <div class="fh-val">%${ou.under15 || ou[1.5]?.under || 72}</div>
                    </div>
                    <div class="fh-stat-pill">
                        <div class="fh-lbl">İY En Olası</div>
                        <div class="fh-val" style="color:var(--accent-amber);">${fh.primaryPick || 'İY 0.5 ÜST'}</div>
                    </div>
                </div>

                <!-- En Olası İY Skorları -->
                ${fh.topScores && fh.topScores.length > 0 ? `
                <div style="margin-top:12px;">
                    <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Olası İY Skorları</div>
                    <div class="fh-scores-row">
                        ${fh.topScores.slice(0, 4).map(s => `<div class="fh-score-chip">${s.score} <span style="opacity:0.7;">(%${s.probability})</span></div>`).join('')}
                    </div>
                </div>` : ''}

                ${fh.tacticalNote ? `
                <div style="margin-top:12px; font-size:0.82rem; color:var(--text-secondary); line-height:1.5; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:var(--radius-sm);">
                    💡 <em>${fh.tacticalNote}</em>
                </div>` : ''}
            </div>
        `;
    },

    /**
     * 🎙️ 4 Büyük Platform Yorumcu & Analiz Masası (Nesine · Bilyoner · İddaa · Misli)
     */
    renderCommentatorInsights(editorAnalysis, match = {}) {
        const comm = editorAnalysis?.commentators;
        if (!comm) return '';

        const picks = comm.picks || [];

        return `
            <div class="analysis-card commentators-card">
                <div class="analysis-card-title">🎙️ 4 Büyük Platform Yorumcu Masası (Nesine · Bilyoner · İddaa · Misli)</div>
                
                <div style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:12px;">
                    Türkiye'nin önde gelen platformlarındaki uzman yazarların ve risk merkezinin ortak değerlendirmesi:
                </div>

                <div class="commentators-list">
                    ${picks.map(p => `
                        <div class="commentator-item">
                            <div class="commentator-left">
                                ${p.avatar ? `
                                    <img src="${p.avatar}" alt="${Helpers.escapeHtml(p.name)}" class="commentator-avatar" onerror="this.outerHTML='<div class=\\'commentator-avatar\\'>${p.badge ? p.badge.substring(0,2) : '🎙️'}</div>'" />
                                ` : `
                                    <div class="commentator-avatar">${p.badge ? p.badge.substring(0,2) : '🎙️'}</div>
                                `}
                                <div>
                                    <div class="commentator-name">${Helpers.escapeHtml(p.name)}</div>
                                    <div class="commentator-source-tag">${p.source} · ${Helpers.escapeHtml(p.title || p.market || 'Analist')}</div>
                                    ${p.reasoning ? `<div style="font-size:0.76rem;color:var(--text-secondary);margin-top:3px;font-style:italic;">"${Helpers.escapeHtml(p.reasoning)}"</div>` : ''}
                                </div>
                            </div>

                            <div class="commentator-pick-pill">
                                <span>${Helpers.escapeHtml(p.pick)}</span>
                                ${p.odd ? `<span class="commentator-odd">@${p.odd.toFixed(2)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Futbol olasılıkları
     */
    renderFootballProbabilities(result) {
        const mr = result.poisson?.matchResult;
        if (!mr) return '';

        const odds = result.odds || {};

        return `
            <div class="analysis-card">
                <div class="analysis-card-title">📊 Maç Sonucu Olasılıkları (1X2)</div>
                <div class="prob-bars">
                    ${this.renderProbBar('MS 1', mr.home, 'home', odds.home?.odds)}
                    ${this.renderProbBar('MS X', mr.draw, 'draw', odds.draw?.odds)}
                    ${this.renderProbBar('MS 2', mr.away, 'away', odds.away?.odds)}
                </div>

                ${odds.home ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <table class="odds-table">
                        <thead>
                            <tr>
                                <th>Sonuç</th>
                                <th>Model Olasılık</th>
                                <th>Piyasa Oranı</th>
                                <th>Örtük Olasılık</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderOddsRow('MS 1', odds.home)}
                            ${this.renderOddsRow('MS X', odds.draw)}
                            ${this.renderOddsRow('MS 2', odds.away)}
                        </tbody>
                    </table>
                    ${odds.margin !== undefined ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">Piyasa Margin: %${odds.margin}</div>` : ''}
                </div>` : ''}
            </div>
        `;
    },

    renderProbBar(label, prob, cls, odds) {
        return `
            <div class="prob-item">
                <div class="prob-label">${label}</div>
                <div class="prob-bar-container">
                    <div class="prob-bar-fill ${cls}" style="width: ${prob}%">${prob.toFixed(1)}%</div>
                </div>
                <div class="prob-odds">${odds ? odds.toFixed(2) : '—'}</div>
            </div>
        `;
    },

    renderOddsRow(label, data) {
        if (!data) return '';
        const valueClass = data.valueDiff > 5 ? 'positive' : data.valueDiff < -5 ? 'negative' : '';
        const valueSign = data.valueDiff > 0 ? '+' : '';
        return `
            <tr>
                <td class="source-name">${label}</td>
                <td class="odds-val">${data.modelProb ? data.modelProb.toFixed(1) : '—'}%</td>
                <td class="odds-val">${data.odds ? data.odds.toFixed(2) : '—'}</td>
                <td class="implied-prob">${data.impliedProb ? data.impliedProb.toFixed(1) : '—'}%</td>
                <td>
                    <span class="value-indicator ${valueClass}">
                        ${valueSign}${data.valueDiff ? data.valueDiff.toFixed(1) : '0'}%
                        ${data.isValue ? ' 💎' : ''}
                    </span>
                </td>
            </tr>
        `;
    },

    /**
     * Güven & Risk
     */
    renderConfidenceRisk(riskResult) {
        if (!riskResult) return '';

        const confPercent = riskResult.confidence;
        const riskPercent = riskResult.risk;
        const riskClass = riskPercent >= 70 ? 'risk-high' : riskPercent >= 40 ? 'risk-medium' : 'risk-low';

        return `
            <div class="analysis-card">
                <div class="analysis-card-title">🎯 Güven & Risk Değerlendirmesi</div>

                <div class="meter-container">
                    <div class="meter-header">
                        <span class="meter-title">Güven Seviyesi</span>
                        <span class="meter-value" style="color: ${riskResult.confidenceColor}">${riskResult.confidenceLabel} (${confPercent}%)</span>
                    </div>
                    <div class="meter-bar">
                        <div class="meter-fill confidence" style="width: ${confPercent}%"></div>
                    </div>
                </div>

                <div class="meter-container">
                    <div class="meter-header">
                        <span class="meter-title">Risk Seviyesi</span>
                        <span class="meter-value" style="color: ${riskResult.riskColor}">${riskResult.riskLabel} (${riskPercent}%)</span>
                    </div>
                    <div class="meter-bar">
                        <div class="meter-fill ${riskClass}" style="width: ${riskPercent}%"></div>
                    </div>
                </div>

                ${riskResult.isValueBet ? `
                <div style="margin-top: 16px; padding: 12px; background: rgba(0,240,255,0.06); border: 1px solid rgba(0,240,255,0.2); border-radius: var(--radius-md); display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.3rem">💎</span>
                    <div>
                        <div style="font-weight:700; color:var(--accent-cyan); font-size:0.9rem;">Value Bet Tespit Edildi</div>
                        <div style="font-size:0.78rem; color:var(--text-secondary);">Model olasılığı piyasa oranından yüksek hesaplanmıştır.</div>
                    </div>
                </div>` : ''}

                ${riskResult.recommendation ? `
                <div style="margin-top:12px; font-size:0.85rem; color:var(--text-secondary);">
                    <strong>Değerlendirme:</strong> ${riskResult.recommendation.text}
                </div>` : ''}
            </div>
        `;
    },

    /**
     * 4 Büyük Platform Oran Karşılaştırması (Nesine vs Bilyoner vs İddaa vs Misli)
     */
    renderOddsComparison(result) {
        const match = App?.currentMatch;
        if (!match?.allOdds || match.allOdds.length < 2) return '';

        // Sütun bazında en yüksek oranları tespit et
        let maxHome = 0, maxDraw = 0, maxAway = 0, maxOver = 0, maxUnder = 0;
        match.allOdds.forEach(s => {
            const o = s.odds || {};
            if (o.home && o.home > maxHome) maxHome = o.home;
            if (o.draw && o.draw > maxDraw) maxDraw = o.draw;
            if (o.away && o.away > maxAway) maxAway = o.away;
            if (o.over25 && o.over25 > maxOver) maxOver = o.over25;
            if (o.under25 && o.under25 > maxUnder) maxUnder = o.under25;
        });

        const renderCell = (val, maxVal) => {
            if (!val) return '<td class="odds-val">—</td>';
            const isBest = val === maxVal && maxVal > 0;
            return `
                <td class="odds-val ${isBest ? 'best-odd' : ''}">
                    ${val.toFixed(2)}
                    ${isBest ? ' <span title="En Yüksek Oran" style="font-size:0.7rem;">🔥</span>' : ''}
                </td>
            `;
        };

        let rows = '';
        match.allOdds.forEach(source => {
            const o = source.odds || {};
            rows += `
                <tr>
                    <td class="source-name">
                        <strong>${source.source}</strong>
                        ${source.badge ? `<div style="font-size:0.7rem;color:var(--text-muted);">${source.badge}</div>` : ''}
                    </td>
                    ${renderCell(o.home, maxHome)}
                    ${renderCell(o.draw, maxDraw)}
                    ${renderCell(o.away, maxAway)}
                    ${renderCell(o.over25, maxOver)}
                    ${renderCell(o.under25, maxUnder)}
                </tr>
            `;
        });

        return `
            <div class="analysis-card">
                <div class="analysis-card-title">📋 4 Büyük Platform Oran Karşılaştırması</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px;">
                    Nesine, Bilyoner, İddaa ve Misli (Kral Oran) platformları arasındaki oran farkları (🔥 En Yüksek Oran):
                </div>
                <div style="overflow-x:auto;">
                    <table class="odds-table">
                        <thead>
                            <tr>
                                <th>Platform</th>
                                <th>MS 1</th>
                                <th>MS X</th>
                                <th>MS 2</th>
                                <th>Üst 2.5</th>
                                <th>Alt 2.5</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Skor dağılımı matrisi
     */
    renderScoreDistribution(result) {
        if (!result.poisson?.scoreMatrix) return '';

        const matrix = result.poisson.scoreMatrix;
        const topScores = result.poisson.topScores;
        let maxProb = 0;
        matrix.forEach(row => row.forEach(p => { if (p > maxProb) maxProb = p; }));

        let matrixHtml = '<div class="score-matrix">';
        // Header row
        matrixHtml += '<div class="score-cell header"></div>';
        for (let a = 0; a <= 5; a++) matrixHtml += `<div class="score-cell header">${a}</div>`;

        for (let h = 0; h <= 5; h++) {
            matrixHtml += `<div class="score-cell header">${h}</div>`;
            for (let a = 0; a <= 5; a++) {
                const prob = matrix[h][a];
                const pct = (prob * 100).toFixed(1);
                const bg = Helpers.heatmapColor(prob, maxProb);
                matrixHtml += `<div class="score-cell prob" style="background:${bg}" title="${h}-${a}: ${pct}%">${pct}</div>`;
            }
        }
        matrixHtml += '</div>';

        // Top skorlar
        let topHtml = '<div style="margin-top:16px;"><strong style="font-size:0.82rem;color:var(--text-secondary);">En Olası Skorlar:</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">';
        topScores.slice(0, 6).forEach(s => {
            topHtml += `<span class="score-chip">${s.score} (%${s.probability})</span>`;
        });
        topHtml += '</div></div>';

        return `
            <div class="analysis-card">
                <div class="analysis-card-title">🎲 Skor Dağılımı Matrisi (Poisson)</div>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">Ev sahibi (satır) x Deplasman (sütun) gol olasılıkları</p>
                <div style="overflow-x:auto;">
                    ${matrixHtml}
                </div>
                ${topHtml}
            </div>
        `;
    },

    /**
     * Alt/Üst analizi
     */
    renderOverUnder(result) {
        const ou = result.poisson?.overUnder;
        if (!ou) return '';

        return `
            <div class="analysis-card">
                <div class="analysis-card-title">⚽ Alt / Üst Olasılıkları</div>
                <div class="ou-bars">
                    ${[1.5, 2.5, 3.5].map(t => {
                        const data = ou[t];
                        if (!data) return '';
                        return `
                            <div class="ou-item">
                                <div class="ou-threshold">${t} Gol</div>
                                <div class="ou-bar-wrap">
                                    <div class="ou-fill over" style="width: ${data.over}%">${data.over}% Üst</div>
                                    <div class="ou-fill under" style="width: ${data.under}%">${data.under}% Alt</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                ${result.poisson?.btts ? `
                <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);">
                    <div style="font-size:0.82rem;font-weight:600;margin-bottom:8px;">Karşılıklı Gol (KG)</div>
                    <div class="ou-bar-wrap">
                        <div class="ou-fill over" style="width: ${result.poisson.btts.yes}%">Var %${result.poisson.btts.yes}</div>
                        <div class="ou-fill under" style="width: ${result.poisson.btts.no}%">Yok %${result.poisson.btts.no}</div>
                    </div>
                </div>` : ''}
            </div>
        `;
    },



    /**
     * Faktörler
     */
    renderFactors(factors) {
        if (!factors || factors.length === 0) return '';

        const items = factors.map(f => `
            <div class="factor-item">
                <span class="factor-icon">${f.icon}</span>
                <span class="factor-text">${f.text}</span>
                <span class="factor-impact ${f.impact}">${f.impact === 'positive' ? '↑' : f.impact === 'negative' ? '↓' : '—'}</span>
            </div>
        `).join('');

        return `
            <div class="analysis-card full-width">
                <div class="analysis-card-title">📋 Analizin Dayandığı Faktörler</div>
                <div class="factors-list">${items}</div>
            </div>
        `;
    },

    /**
     * Uyarılar
     */
    renderWarnings(warnings) {
        if (!warnings || warnings.length === 0) return '';

        return `
            <div class="analysis-card full-width">
                <div class="warning-box">
                    <div class="warning-title">⚠️ Uyarılar ve Bilgilendirme</div>
                    <div class="warning-text">
                        ${warnings.map(w => `<div style="margin-bottom:4px;">${w}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 👥 İlk 11 Kadro & 10 Maç Oyuncu Reyting Analizi Kartı
     */
    renderSquadRatingSection(match) {
        if (!window.SquadRatingEngine) return '';
        const squadData = SquadRatingEngine.generateSquadAnalysis(match);
        if (!squadData) return '';

        const h = squadData.homeSquad;
        const a = squadData.awaySquad;
        const duels = squadData.duels;
        const syn = squadData.synthesis;

        return `
        <div class="analysis-card full-width" style="background:linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.95) 100%);border:1px solid rgba(56,189,248,0.35);border-radius:14px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.1rem;background:linear-gradient(135deg, #0284c7, #38bdf8);color:#fff;padding:3px 8px;border-radius:6px;font-weight:900;">11'LER</span>
                    <span style="font-size:0.95rem;font-weight:800;color:#f8fafc;">İlk 11 Kadro &amp; 10 Maç Oyuncu Reyting Analizi</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="if(window.SquadAnalysisModal) SquadAnalysisModal.open(${JSON.stringify(match).replace(/"/g, '&quot;')})" style="background:linear-gradient(135deg, #0284c7, #06b6d4);border:none;font-weight:800;font-size:0.78rem;display:inline-flex;align-items:center;gap:6px;">
                    <span>👥 10 Maçlık Detaylı Kadro Modalı ↗</span>
                </button>
            </div>

            <!-- Harmanlanmış Kadro & Bahis Açıklaması -->
            <div style="background:rgba(56,189,248,0.08);border-left:4px solid #38bdf8;padding:12px 14px;border-radius:0 8px 8px 0;margin-bottom:16px;">
                <div style="font-size:0.75rem;font-weight:800;color:#38bdf8;margin-bottom:4px;text-transform:uppercase;">
                    🧠 Harmanlanmış Kadro &amp; Taktik Bahis Görüşü (%${syn.confidenceRating} Güven)
                </div>
                <div style="font-size:0.85rem;color:#e2e8f0;line-height:1.5;">
                    ${syn.tacticalAnalysis}
                </div>
                <div style="margin-top:8px;font-size:0.85rem;font-weight:800;color:#38bdf8;">
                    🎯 Önerilen Tercih: <span style="color:#ffffff;">${syn.recommendedBet}</span> 
                    <span style="font-size:0.75rem;color:#94a3b8;font-weight:400;">(${syn.betReasoning})</span>
                </div>
            </div>

            <!-- Mevkisel Düello Karşılaştırma Izgarası -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 12px;">
                    <div style="font-size:0.72rem;color:#94a3b8;font-weight:700;">⚔️ Hücum vs Savunma Düellosu</div>
                    <div style="font-size:0.92rem;font-weight:800;color:#38bdf8;margin-top:2px;">
                        Ev Hücum: ${duels.homeAttackVsAwayDefense.homeFwdAvg} vs Dep Savunma: ${duels.homeAttackVsAwayDefense.awayDefAvg}
                    </div>
                    <div style="font-size:0.72rem;color:#cbd5e1;margin-top:2px;">${duels.homeAttackVsAwayDefense.verdict}</div>
                </div>

                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 12px;">
                    <div style="font-size:0.72rem;color:#94a3b8;font-weight:700;">🔄 Orta Saha Hakimiyeti</div>
                    <div style="font-size:0.92rem;font-weight:800;color:#34d399;margin-top:2px;">
                        %${duels.midfieldBattle.homeControlPercent} vs %${duels.midfieldBattle.awayControlPercent}
                    </div>
                    <div style="font-size:0.72rem;color:#cbd5e1;margin-top:2px;">${duels.midfieldBattle.verdict}</div>
                </div>

                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px 12px;">
                    <div style="font-size:0.72rem;color:#94a3b8;font-weight:700;">⭐ Kilit Oyuncular (Son 10 Maç)</div>
                    <div style="font-size:0.85rem;font-weight:800;color:#f8fafc;margin-top:2px;">
                        ${syn.homeKeyStar.name} <span style="color:#38bdf8;">(${syn.homeKeyStar.avgRating})</span> vs 
                        ${syn.awayKeyStar.name} <span style="color:#a78bfa;">(${syn.awayKeyStar.avgRating})</span>
                    </div>
                    <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">
                        ${syn.homeKeyStar.trendIcon} ${syn.homeKeyStar.trendText} &amp; ${syn.awayKeyStar.trendIcon} ${syn.awayKeyStar.trendText}
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    /**
     * Hata durumu
     */
    renderError(result) {
        return `
            <div class="analysis-card full-width" style="border-color:rgba(239,68,68,0.3);">
                <div class="analysis-card-title" style="color:var(--accent-red);">❌ Analiz Yapılamadı</div>
                <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:12px;">${result.message || 'Yeterli veri yok.'}</p>
                ${result.missing?.length > 0 ? `
                <div style="font-size:0.82rem;">
                    <strong>Eksik veriler:</strong>
                    <ul style="margin-top:6px;padding-left:20px;color:var(--text-muted);">
                        ${result.missing.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>` : ''}
            </div>
        `;
    }
};

window.AnalysisPanel = AnalysisPanel;
