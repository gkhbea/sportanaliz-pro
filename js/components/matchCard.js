/**
 * matchCard.js — Maç Kartı Bileşeni
 */
const MatchCard = {
    /**
     * Maç kartı HTML'i oluştur
     */
    render(match, index) {
        const homeAbbr = Helpers.teamAbbreviation(match.homeTeam);
        const awayAbbr = Helpers.teamAbbreviation(match.awayTeam);
        const time = match.matchDate ? Helpers.formatTime(match.matchDate) : '—';
        const league = match.league || '';
        const odds = match.commonOdds || match.odds || {};
        const iddaaCode = match.iddaaCode || match.code || (match.rawData && match.rawData.eventCode) || '';

        // Basit quick-analysis & Yorumcu rozetleri & İddaa Kodu
        let badges = '';
        if (iddaaCode) {
            badges += `<span class="badge badge-iddaa-code" style="background:rgba(234,179,8,0.2);border:1px solid rgba(234,179,8,0.55);color:#facc15;font-weight:900;letter-spacing:0.5px;" title="Resmi İddaa Maç Kodu">🏷️ Kod: ${iddaaCode}</span> `;
        }
        badges += '<span class="badge badge-ai-bubble" data-ai-trigger="true" title="Yapay Zeka Analiz Baloncuğunu görmek için üzerine gelin veya dokunun">🤖 AI Analiz</span> ';
        badges += `<span class="badge badge-squad-trigger" onclick="event.stopPropagation();if(window.SquadAnalysisModal) SquadAnalysisModal.open(window.app?.matches?.[${index}] || window.app?.liveMatches?.[${index}]);" style="background:rgba(56,189,248,0.18);border:1px solid rgba(56,189,248,0.4);color:#38bdf8;cursor:pointer;" title="İlk 11 Kadro ve 10 Maç Oyuncu Reyting Analizini Aç">👥 11'ler &amp; Reyting</span> `;
        if (match.isCommonBulletin) {
            badges += '<span class="badge badge-common-bulletin" style="background:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.4);color:#34d399;" title="Bu maç Nesine, Bilyoner, İddaa ve Misli bültenlerinde ortaktır">🤝 Ortak Bülten</span> ';
        }
        if (match.editorChoices && match.editorChoices.length > 0) {
            badges += `<span class="badge" style="background:rgba(124,58,237,0.18);border-color:rgba(124,58,237,0.4);color:#c084fc;">🎙️ ${match.editorChoices.length} Yorumcu</span> `;
        }
        if (odds.home && odds.draw && odds.away) {
            const margin = Statistics.calculateMargin(odds.home, odds.draw, odds.away);
            if (margin < 8) badges += '<span class="badge badge-value">💎 Düşük Margin</span>';
        }

        // Canlı / Biten maç skoru rozeti (MatchTracker ve liveScore ile çift teyitli)
        const ls = match.liveScore || (window.MatchTracker ? window.MatchTracker.getMatchScore(match) : null);
        let scoreHtml = '';
        const isFin = ls && (ls.isFinished || ls.status === 'FINISHED' || ls.minute === 'MS' || match.status === 'FINISHED');
        const isLiv = ls && !isFin && (ls.isLive || ls.status === 'LIVE' || (typeof ls.minute === 'string' && (ls.minute.includes("'") || ls.minute.includes('İY'))));

        if (isFin) {
            const h = typeof ls.home === 'number' ? ls.home : (typeof ls.homeScore === 'number' ? ls.homeScore : 0);
            const a = typeof ls.away === 'number' ? ls.away : (typeof ls.awayScore === 'number' ? ls.awayScore : 0);
            scoreHtml = `<div class="match-finished-pill" style="margin-top:4px;display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,0.18);border:1px solid rgba(34,197,94,0.4);color:#4ade80;font-weight:800;font-size:0.82rem;padding:2px 8px;border-radius:6px;">🏁 BİTTİ (MS: ${h} - ${a})</div>`;
        } else if (isLiv) {
            const h = typeof ls.home === 'number' ? ls.home : (typeof ls.homeScore === 'number' ? ls.homeScore : 0);
            const a = typeof ls.away === 'number' ? ls.away : (typeof ls.awayScore === 'number' ? ls.awayScore : 0);
            const min = ls.minute || 'Canlı';
            scoreHtml = `<div class="match-live-pill" style="margin-top:4px;display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);color:#f87171;font-weight:800;font-size:0.82rem;padding:2px 8px;border-radius:6px;animation:pulse 2s infinite;">🔴 CANLI ${min} (${h} - ${a})</div>`;
        }

        return `
            <div class="match-card" data-match-index="${index}" id="match-card-${index}">
                <div class="match-team home">
                    <div class="team-logo">${homeAbbr}</div>
                    <div>
                        <div class="team-name">${Helpers.escapeHtml(match.homeTeam)}</div>
                        <div class="team-detail">${match.source === 'nesine' ? '🟡' : '🟢'} ${match.source}</div>
                    </div>
                </div>

                <div class="match-info">
                    <div class="match-time">${time}</div>
                    ${scoreHtml}
                    <div class="match-league" title="${Helpers.escapeHtml(league)}">${Helpers.escapeHtml(league)}</div>
                    <div class="match-badges">${badges}</div>
                </div>

                <div class="match-team away">
                    <div class="team-logo">${awayAbbr}</div>
                    <div>
                        <div class="team-name">${Helpers.escapeHtml(match.awayTeam)}</div>
                    </div>
                </div>

                <div class="match-odds">
                    ${this.renderOddsBtn('MS 1', odds.home, match)}
                    ${match.sportType === 'football' ? this.renderOddsBtn('MS X', odds.draw, match) : ''}
                    ${this.renderOddsBtn('MS 2', odds.away, match)}
                </div>
            </div>
        `;
    },

    renderOddsBtn(label, value, match) {
        if (!value) {
            return `
                <div class="odds-btn" style="opacity:0.4;">
                    <div class="odds-label">${label}</div>
                    <div class="odds-value">—</div>
                </div>
            `;
        }

        const safeHome = (match && match.homeTeam ? match.homeTeam.replace(/'/g, "\\'") : 'Ev Sahibi');
        const safeAway = (match && match.awayTeam ? match.awayTeam.replace(/'/g, "\\'") : 'Deplasman');
        const safeLeague = (match && match.league ? match.league.replace(/'/g, "\\'") : 'Futbol');
        const matchId = match ? (match.id || `${safeHome}-${safeAway}`) : 'm_' + Math.random();

        return `
            <div class="odds-btn" title="${label}: ${value.toFixed(2)}">
                <div class="odds-label">${label}</div>
                <div class="odds-value">${value.toFixed(2)}</div>
            </div>
        `;
    },

    /**
     * Maç listesini render et
     */
    renderList(matches) {
        if (!matches || matches.length === 0) return '';
        return matches.map((m, i) => this.render(m, i)).join('');
    }
};

window.MatchCard = MatchCard;
