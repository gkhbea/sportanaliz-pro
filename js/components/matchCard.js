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
        const odds = match.odds || {};

        // Basit quick-analysis & Yorumcu rozetleri
        let badges = '';
        if (match.editorChoices && match.editorChoices.length > 0) {
            badges += `<span class="badge" style="background:rgba(124,58,237,0.18);border-color:rgba(124,58,237,0.4);color:#c084fc;">🎙️ ${match.editorChoices.length} Yorumcu</span> `;
        }
        if (odds.home && odds.draw && odds.away) {
            const margin = Statistics.calculateMargin(odds.home, odds.draw, odds.away);
            if (margin < 8) badges += '<span class="badge badge-value">💎 Düşük Margin</span>';
        }

        // Biten maç skoru rozeti
        let scoreHtml = '';
        if (match.liveScore && (match.liveScore.isFinished || match.liveScore.minute === 'MS' || match.status === 'FINISHED')) {
            const h = typeof match.liveScore.home === 'number' ? match.liveScore.home : 0;
            const a = typeof match.liveScore.away === 'number' ? match.liveScore.away : 0;
            scoreHtml = `<div class="match-finished-pill" style="margin-top:4px;display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,0.18);border:1px solid rgba(34,197,94,0.4);color:#4ade80;font-weight:800;font-size:0.82rem;padding:2px 8px;border-radius:6px;">🏁 BİTTİ (MS: ${h} - ${a})</div>`;
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
                    ${this.renderOddsBtn('1', odds.home)}
                    ${match.sportType === 'football' ? this.renderOddsBtn('X', odds.draw) : ''}
                    ${this.renderOddsBtn('2', odds.away)}
                </div>
            </div>
        `;
    },

    renderOddsBtn(label, value) {
        return `
            <div class="odds-btn">
                <div class="odds-label">${label}</div>
                <div class="odds-value">${value ? value.toFixed(2) : '—'}</div>
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
