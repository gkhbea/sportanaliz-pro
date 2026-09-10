/**
 * scoreDistribution.js — Skor Dağılımı Bileşeni (standalone)
 */
const ScoreDistribution = {
    render(poisson) {
        if (!poisson?.topScores) return '';
        return poisson.topScores.slice(0, 8).map(s =>
            `<span style="padding:4px 12px;background:var(--bg-tertiary);border-radius:var(--radius-full);font-family:var(--font-mono);font-size:0.85rem;font-weight:600;">${s.score} <span style="color:var(--text-muted);font-size:0.72rem;">${s.probability}%</span></span>`
        ).join(' ');
    }
};
window.ScoreDistribution = ScoreDistribution;
