/**
 * oddsComparison.js — Oran Karşılaştırma Bileşeni (standalone)
 */
const OddsComparison = {
    render(allOdds) {
        if (!allOdds || allOdds.length === 0) return '';
        let rows = '';
        allOdds.forEach(s => {
            const o = s.odds;
            rows += `<tr>
                <td class="source-name">${s.source}</td>
                <td class="odds-val">${o.home ? o.home.toFixed(2) : '—'}</td>
                <td class="odds-val">${o.draw ? o.draw.toFixed(2) : '—'}</td>
                <td class="odds-val">${o.away ? o.away.toFixed(2) : '—'}</td>
            </tr>`;
        });
        return `<table class="odds-table"><thead><tr><th>Kaynak</th><th>1</th><th>X</th><th>2</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
};
window.OddsComparison = OddsComparison;
