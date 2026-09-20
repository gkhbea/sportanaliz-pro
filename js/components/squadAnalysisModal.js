/**
 * squadAnalysisModal.js — Oyuncu Kadrosu & 10 Maç Reyting Analiz Modalı
 * SportAnaliz Pro — İlk 11 oyuncularının son 10 maçlık bireysel SofaScore reytinglerini,
 * mevkisel düelloları ve harmanlanmış AI bahis tavsiyesini görsel olarak sunar.
 */
const SquadAnalysisModal = {
    activeTab: 'home', // 'home' | 'away' | 'duels'

    /**
     * Modalı aç ve analiz verisini oluşturup yerleştir
     */
    open(match) {
        if (!match) return;

        // Modal container'ı oluştur veya bul
        let modalEl = document.getElementById('squad-analysis-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'squad-analysis-modal';
            modalEl.className = 'modal-overlay animate-fade-in';
            document.body.appendChild(modalEl);
        }

        const data = window.SquadRatingEngine ? SquadRatingEngine.generateSquadAnalysis(match) : null;
        if (!data) {
            alert('Kadro analizi verisi yüklenemedi.');
            return;
        }

        modalEl.innerHTML = this.renderContent(data, match);
        modalEl.style.display = 'flex';

        this.bindEvents(modalEl, data, match);
    },

    /**
     * Modalı kapat
     */
    close() {
        const modalEl = document.getElementById('squad-analysis-modal');
        if (modalEl) modalEl.style.display = 'none';
    },

    /**
     * Modal HTML İçeriği
     */
    renderContent(data, match) {
        const h = data.homeSquad;
        const a = data.awaySquad;
        const duels = data.duels;
        const syn = data.synthesis;

        return `
        <div class="modal-content squad-modal-card" style="max-width:980px;width:95%;max-height:90vh;overflow-y:auto;background:linear-gradient(145deg, #0b1329 0%, #030712 100%);border:1px solid rgba(56,189,248,0.35);border-radius:18px;padding:0;box-shadow:0 25px 60px rgba(0,0,0,0.8);color:#f8fafc;">
            
            <!-- Modal Header -->
            <div style="background:linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9));padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;position:sticky;top:0;z-index:20;">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);border-radius:20px;padding:3px 10px;margin-bottom:6px;">
                        <span>👥</span>
                        <span style="font-size:0.75rem;color:#38bdf8;font-weight:800;letter-spacing:0.5px;">İLK 11 KADRO &amp; 10 MAÇ OYUNCU REYTİNG ANALİZİ</span>
                    </div>
                    <h2 style="font-size:1.4rem;font-weight:900;margin:0;color:#ffffff;">
                        ${data.homeTeam} <span style="color:#38bdf8;font-size:1rem;">(${h.averages.overall11})</span> 
                        <span style="color:#64748b;font-size:1rem;margin:0 4px;">vs</span> 
                        ${data.awayTeam} <span style="color:#a78bfa;font-size:1rem;">(${a.averages.overall11})</span>
                    </h2>
                    <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">
                        🏆 ${data.league} · Formasyonlar: <strong>${h.formation}</strong> vs <strong>${a.formation}</strong>
                    </div>
                </div>

                <button id="btn-close-squad-modal" style="background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.2rem;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:0.2s;" title="Kapat">✕</button>
            </div>

            <div style="padding:20px 24px;">

                <!-- 1. 🧠 HARMANLANMIŞ AI TAKTİK YORUMU & BAHİS TAVSİYESİ -->
                <div style="background:linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.12) 100%);border:1px solid rgba(56,189,248,0.4);border-radius:14px;padding:16px 20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:1.2rem;">🧠</span>
                            <span style="font-weight:800;color:#38bdf8;font-size:0.95rem;text-transform:uppercase;">Harmanlanmış Kadro &amp; Taktik Bahis Raporu</span>
                        </div>
                        <span style="background:linear-gradient(135deg, #10B981, #059669);color:#fff;font-weight:800;font-size:0.78rem;padding:3px 10px;border-radius:20px;">
                            ⭐ Güven: %${syn.confidenceRating}
                        </span>
                    </div>

                    <p style="color:#e2e8f0;font-size:0.88rem;line-height:1.55;margin:0 0 12px;">
                        ${syn.tacticalAnalysis}
                    </p>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;background:rgba(15,23,42,0.6);border-radius:10px;padding:12px 16px;border:1px solid rgba(255,255,255,0.08);">
                        <div>
                            <div style="font-size:0.72rem;color:#94a3b8;font-weight:700;text-transform:uppercase;">🎯 Önerilen Harmanlanmış Bahis</div>
                            <div style="font-size:1.05rem;font-weight:900;color:#38bdf8;margin-top:2px;">${syn.recommendedBet}</div>
                            <div style="font-size:0.74rem;color:#cbd5e1;margin-top:2px;">${syn.betReasoning}</div>
                        </div>
                        <div>
                            <div style="font-size:0.72rem;color:#94a3b8;font-weight:700;text-transform:uppercase;">⚡ Beklenen Gol Akışı</div>
                            <div style="font-size:1.05rem;font-weight:800;color:#34d399;margin-top:2px;">${syn.expectedGoalFlow}</div>
                            <div style="font-size:0.74rem;color:#94a3b8;margin-top:2px;">
                                Kilit İsimler: <strong style="color:#38bdf8;">${syn.homeKeyStar.name} (${syn.homeKeyStar.avgRating})</strong> vs <strong style="color:#a78bfa;">${syn.awayKeyStar.name} (${syn.awayKeyStar.avgRating})</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. ⚔️ MEVKİSEL DÜELLO & HAKİMİYET KARŞILAŞTIRMASI -->
                <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 20px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;font-weight:800;color:#f8fafc;margin:0 0 14px;display:flex;align-items:center;gap:8px;">
                        <span>⚔️</span> Mevkisel Kadro Düelloları &amp; Üstünlük Endeksleri
                    </h3>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        
                        <!-- Ev Sahibi Hücum vs Deplasman Savunma -->
                        <div style="background:rgba(2,6,23,0.6);border-radius:10px;padding:12px;border:1px solid rgba(56,189,248,0.2);">
                            <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:700;color:#cbd5e1;margin-bottom:6px;">
                                <span>${data.homeTeam} Hücum (${duels.homeAttackVsAwayDefense.homeFwdAvg})</span>
                                <span>${data.awayTeam} Savunma (${duels.homeAttackVsAwayDefense.awayDefAvg})</span>
                            </div>
                            <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;display:flex;">
                                <div style="width:${duels.homeAttackVsAwayDefense.dominancePercent}%;background:linear-gradient(90deg, #0284c7, #38bdf8);"></div>
                                <div style="width:${100 - duels.homeAttackVsAwayDefense.dominancePercent}%;background:#475569;"></div>
                            </div>
                            <div style="font-size:0.72rem;color:#38bdf8;margin-top:6px;font-weight:600;">
                                💬 ${duels.homeAttackVsAwayDefense.verdict}
                            </div>
                        </div>

                        <!-- Deplasman Hücum vs Ev Sahibi Savunma -->
                        <div style="background:rgba(2,6,23,0.6);border-radius:10px;padding:12px;border:1px solid rgba(167,139,250,0.2);">
                            <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:700;color:#cbd5e1;margin-bottom:6px;">
                                <span>${data.awayTeam} Hücum (${duels.awayAttackVsHomeDefense.awayFwdAvg})</span>
                                <span>${data.homeTeam} Savunma (${duels.awayAttackVsHomeDefense.homeDefAvg})</span>
                            </div>
                            <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;display:flex;">
                                <div style="width:${duels.awayAttackVsHomeDefense.dominancePercent}%;background:linear-gradient(90deg, #8b5cf6, #a78bfa);"></div>
                                <div style="width:${100 - duels.awayAttackVsHomeDefense.dominancePercent}%;background:#475569;"></div>
                            </div>
                            <div style="font-size:0.72rem;color:#a78bfa;margin-top:6px;font-weight:600;">
                                💬 ${duels.awayAttackVsHomeDefense.verdict}
                            </div>
                        </div>

                        <!-- Orta Saha Hakimiyet Savaşı -->
                        <div style="background:rgba(2,6,23,0.6);border-radius:10px;padding:12px;border:1px solid rgba(16,185,129,0.2);">
                            <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:700;color:#cbd5e1;margin-bottom:6px;">
                                <span>${data.homeTeam} Orta Saha (%${duels.midfieldBattle.homeControlPercent})</span>
                                <span>${data.awayTeam} Orta Saha (%${duels.midfieldBattle.awayControlPercent})</span>
                            </div>
                            <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;display:flex;">
                                <div style="width:${duels.midfieldBattle.homeControlPercent}%;background:#10b981;"></div>
                                <div style="width:${duels.midfieldBattle.awayControlPercent}%;background:#64748b;"></div>
                            </div>
                            <div style="font-size:0.72rem;color:#34d399;margin-top:6px;font-weight:600;">
                                💬 ${duels.midfieldBattle.verdict}
                            </div>
                        </div>

                        <!-- Kaleci Güveni -->
                        <div style="background:rgba(2,6,23,0.6);border-radius:10px;padding:12px;border:1px solid rgba(245,158,11,0.2);">
                            <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:700;color:#cbd5e1;margin-bottom:6px;">
                                <span>${data.homeTeam} Kaleci (${duels.goalkeeperDuel.homeGkAvg})</span>
                                <span>${data.awayTeam} Kaleci (${duels.goalkeeperDuel.awayGkAvg})</span>
                            </div>
                            <div style="font-size:0.75rem;color:#fcd34d;margin-top:4px;">
                                🛡️ Daha Güvenilir Kaleci: <strong>${duels.goalkeeperDuel.moreReliable}</strong>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- 3. 👥 İLK 11 OYUNCULARININ SON 10 MAÇ REYTİNG TABLOLARI -->
                <div style="margin-bottom:10px;">
                    <div style="display:flex;gap:10px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;margin-bottom:14px;">
                        <button class="squad-tab-btn active" id="tab-squad-home" style="background:rgba(56,189,248,0.2);border:1px solid #38bdf8;color:#38bdf8;padding:8px 16px;border-radius:8px;font-weight:800;font-size:0.85rem;cursor:pointer;">
                            🏠 ${data.homeTeam} İlk 11 (${h.averages.overall11})
                        </button>
                        <button class="squad-tab-btn" id="tab-squad-away" style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:#94a3b8;padding:8px 16px;border-radius:8px;font-weight:800;font-size:0.85rem;cursor:pointer;">
                            ✈️ ${data.awayTeam} İlk 11 (${a.averages.overall11})
                        </button>
                    </div>

                    <!-- Home Squad Panel -->
                    <div id="panel-squad-home">
                        ${this.renderSquadPlayerTable(h)}
                    </div>

                    <!-- Away Squad Panel -->
                    <div id="panel-squad-away" style="display:none;">
                        ${this.renderSquadPlayerTable(a)}
                    </div>
                </div>

            </div>
        </div>
        `;
    },

    /**
     * Takım oyuncularının 10 maçlık reyting tablosunu oluştur
     */
    renderSquadPlayerTable(squad) {
        return `
        <div style="overflow-x:auto;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:rgba(15,23,42,0.6);">
            <table style="width:100%;border-collapse:collapse;font-size:0.8rem;text-align:left;">
                <thead>
                    <tr style="background:rgba(30,41,59,0.8);color:#94a3b8;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.1);">
                        <th style="padding:10px 12px;">#</th>
                        <th style="padding:10px 12px;">Oyuncu &amp; Mevki</th>
                        <th style="padding:10px 12px;text-align:center;">Son 10 Maç Performans Reytingleri</th>
                        <th style="padding:10px 12px;text-align:center;">10 Maç Ort.</th>
                        <th style="padding:10px 12px;text-align:center;">Form Trendi</th>
                        <th style="padding:10px 12px;text-align:center;">İstatistik (G/A)</th>
                    </tr>
                </thead>
                <tbody>
                    ${squad.players.map(p => this.renderPlayerRow(p)).join('')}
                </tbody>
            </table>
        </div>
        `;
    },

    /**
     * Tek bir oyuncu satırı (10 maçlık renkli puan çubukları)
     */
    renderPlayerRow(p) {
        const starBadge = p.isStar ? '<span style="color:#f59e0b;font-size:0.85rem;" title="Yıldız Oyuncu">⭐</span>' : '';
        const capBadge = p.isCaptain ? '<span style="background:#e11d48;color:#fff;font-size:0.65rem;padding:1px 4px;border-radius:4px;font-weight:800;margin-left:4px;">C</span>' : '';
        
        // Puan Rengi
        let avgColor = '#94a3b8';
        if (p.avgRating >= 7.5) avgColor = '#34d399';
        else if (p.avgRating >= 7.0) avgColor = '#38bdf8';
        else if (p.avgRating < 6.7) avgColor = '#f87171';

        // 10 Maçlık Rozetler
        const ratingsBadges = p.last10Ratings.map(r => {
            let bg = 'rgba(148,163,184,0.15)';
            let col = '#cbd5e1';
            if (r >= 7.8) { bg = 'rgba(16,185,129,0.25)'; col = '#34d399'; }
            else if (r >= 7.2) { bg = 'rgba(56,189,248,0.25)'; col = '#38bdf8'; }
            else if (r < 6.7) { bg = 'rgba(239,68,68,0.25)'; col = '#f87171'; }

            return `<span style="display:inline-block;padding:2px 4px;min-width:24px;text-align:center;border-radius:4px;background:${bg};color:${col};font-weight:800;font-size:0.72rem;margin:0 1px;">${r.toFixed(1)}</span>`;
        }).join('');

        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;" onmouseover="this.style.background='rgba(56,189,248,0.05)'" onmouseout="this.style.background='transparent'">
            <td style="padding:8px 12px;font-weight:800;color:#64748b;">${p.number}</td>
            <td style="padding:8px 12px;">
                <div style="font-weight:800;color:#ffffff;display:flex;align-items:center;gap:4px;">
                    ${starBadge}
                    <span>${p.name}</span>
                    ${capBadge}
                </div>
                <div style="font-size:0.7rem;color:#94a3b8;">${p.positionRole} (${p.position})</div>
            </td>
            <td style="padding:8px 12px;text-align:center;">
                <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;">
                    ${ratingsBadges}
                </div>
            </td>
            <td style="padding:8px 12px;text-align:center;">
                <span style="font-size:0.92rem;font-weight:900;color:${avgColor};">${p.avgRating}</span>
            </td>
            <td style="padding:8px 12px;text-align:center;">
                <span style="font-size:0.78rem;font-weight:700;color:#cbd5e1;" title="${p.trendText}">
                    ${p.trendIcon} ${p.trendText}
                </span>
            </td>
            <td style="padding:8px 12px;text-align:center;font-size:0.75rem;color:#94a3b8;">
                <strong style="color:#fff;">${p.stats.goalsLast10}</strong> Gol · <strong style="color:#fff;">${p.stats.assistsLast10}</strong> Ast
            </td>
        </tr>
        `;
    },

    /**
     * Olay dinleyicilerini bağla
     */
    bindEvents(modalEl, data, match) {
        const btnClose = modalEl.querySelector('#btn-close-squad-modal');
        if (btnClose) btnClose.onclick = () => this.close();

        modalEl.onclick = (e) => {
            if (e.target === modalEl) this.close();
        };

        const tabHome = modalEl.querySelector('#tab-squad-home');
        const tabAway = modalEl.querySelector('#tab-squad-away');
        const panelHome = modalEl.querySelector('#panel-squad-home');
        const panelAway = modalEl.querySelector('#panel-squad-away');

        if (tabHome && tabAway && panelHome && panelAway) {
            tabHome.onclick = () => {
                tabHome.style.background = 'rgba(56,189,248,0.2)';
                tabHome.style.borderColor = '#38bdf8';
                tabHome.style.color = '#38bdf8';

                tabAway.style.background = 'transparent';
                tabAway.style.borderColor = 'rgba(255,255,255,0.15)';
                tabAway.style.color = '#94a3b8';

                panelHome.style.display = 'block';
                panelAway.style.display = 'none';
            };

            tabAway.onclick = () => {
                tabAway.style.background = 'rgba(167,139,250,0.2)';
                tabAway.style.borderColor = '#a78bfa';
                tabAway.style.color = '#a78bfa';

                tabHome.style.background = 'transparent';
                tabHome.style.borderColor = 'rgba(255,255,255,0.15)';
                tabHome.style.color = '#94a3b8';

                panelAway.style.display = 'block';
                panelHome.style.display = 'none';
            };
        }
    }
};

if (typeof window !== 'undefined') {
    window.SquadAnalysisModal = SquadAnalysisModal;
}
