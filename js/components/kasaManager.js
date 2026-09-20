/**
 * kasaManager.js - Kullanıcı Kasa Yönetimi UI Bileşeni
 * SportAnaliz Pro
 */
const KasaManager = {
    /**
     * Kasa Yönetim Kartını Render Eder
     */
    renderKasaCard(stats) {
        if (!window.UserProfileService) return '';

        const profile = UserProfileService.getProfile();
        const netProfit = (stats && stats.netProfit) ? stats.netProfit : 0;
        const summary = UserProfileService.getBankrollSummary(netProfit);
        const progress = UserProfileService.getGoalProgress(stats);

        const fmt = (num) => (parseFloat(num) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        const strategyNames = {
            'fixed': 'Sabit Tutar (' + profile.fixedStakeAmount + ' TL)',
            'percentage': 'Kasa Yüzdesi (%' + profile.percentageStakeRate + ')',
            'kelly': 'Yarım Kelly Kriteri (Dinamik Risk)'
        };

        return `
        <div class="kasa-manager-card" style="background:linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);border:1px solid rgba(16,185,129,0.35);border-radius:16px;padding:22px 24px;margin-bottom:28px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <!-- Kart Başlığı & Eylemler -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">
                        💼
                    </div>
                    <div>
                        <h3 style="font-size:1.15rem;font-weight:800;color:#f8fafc;margin:0;">Kişisel Kasa & Hedef Yönetimi</h3>
                        <p style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 0;">Strateji: <strong style="color:#10B981;">${strategyNames[profile.stakeStrategy] || 'Sabit Tutar'}</strong></p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="btn-open-kasa-modal" class="btn btn-primary btn-sm" style="font-size:0.8rem;padding:7px 14px;display:inline-flex;align-items:center;gap:6px;">
                        <span>⚙️ Kasa Ayarları</span>
                    </button>
                </div>
            </div>

            <!-- Kasa KPI Blokları -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;margin-bottom:20px;">
                
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px 16px;">
                    <div style="font-size:0.75rem;color:var(--text-secondary);font-weight:600;text-transform:uppercase;">🏁 Başlangıç Kasası</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#cbd5e1;margin-top:4px;">${fmt(summary.startingBankroll)} TL</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">09.09.2026 Giriş</div>
                </div>

                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:14px 16px;">
                    <div style="font-size:0.75rem;color:#10B981;font-weight:700;text-transform:uppercase;">💰 Güncel Kasa Bakiyesi</div>
                    <div style="font-size:1.55rem;font-weight:900;color:#10B981;margin-top:4px;">${fmt(summary.currentBankroll)} TL</div>
                    <div style="font-size:0.72rem;color:#a7f3d0;margin-top:2px;">Net Büyüme: +%${summary.growthPercent}</div>
                </div>

                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(56,189,248,0.2);border-radius:12px;padding:14px 16px;">
                    <div style="font-size:0.75rem;color:#38bdf8;font-weight:600;text-transform:uppercase;">🎯 Günlük Kâr Hedefi</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#f8fafc;margin-top:4px;">${fmt(progress.dailyNet)} / ${fmt(progress.dailyGoal)} TL</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${progress.dailyReached ? '✅ Günlük Hedef Aşıldı!' : 'İlerleme: %' + progress.dailyProgressPct}</div>
                </div>

                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 16px;">
                    <div style="font-size:0.75rem;color:#f59e0b;font-weight:600;text-transform:uppercase;">🏆 Haftalık Hedef</div>
                    <div style="font-size:1.4rem;font-weight:800;color:#f8fafc;margin-top:4px;">${fmt(progress.weeklyNet)} / ${fmt(progress.weeklyGoal)} TL</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${progress.weeklyReached ? '🎉 Haftalık Hedef Tamamlandı!' : 'İlerleme: %' + progress.weeklyProgressPct}</div>
                </div>

            </div>

            <!-- Hedef İlerleme Çubukları -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:rgba(15,23,42,0.4);border-radius:12px;padding:14px 18px;">
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:600;color:#cbd5e1;margin-bottom:6px;">
                        <span>📅 Bugün Kâr İlerlemesi</span>
                        <span style="color:${progress.dailyReached ? '#10B981' : '#38bdf8'};">%${progress.dailyProgressPct}</span>
                    </div>
                    <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;">
                        <div style="height:100%;width:${progress.dailyProgressPct}%;background:linear-gradient(90deg, #38bdf8, #10B981);border-radius:6px;transition:width 0.5s ease;"></div>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-weight:600;color:#cbd5e1;margin-bottom:6px;">
                        <span>📊 Haftalık Genel Kasa Hedefi</span>
                        <span style="color:${progress.weeklyReached ? '#10B981' : '#f59e0b'};">%${progress.weeklyProgressPct}</span>
                    </div>
                    <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;">
                        <div style="height:100%;width:${progress.weeklyProgressPct}%;background:linear-gradient(90deg, #f59e0b, #10B981);border-radius:6px;transition:width 0.5s ease;"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    /**
     * Kasa Ayarları Modal Penceresini Render Eder
     */
    renderKasaModal() {
        const profile = UserProfileService ? UserProfileService.getProfile() : {};
        return `
        <div id="modal-kasa-settings" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;padding:16px;">
            <div class="modal-content animate-slide-up" style="background:#0f172a;border:1px solid rgba(16,185,129,0.4);border-radius:16px;max-width:520px;width:100%;padding:26px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.4rem;">💼</span>
                        <h3 style="margin:0;font-size:1.2rem;font-weight:800;color:#fff;">Kasa & Bahis Stratejisi</h3>
                    </div>
                    <button id="btn-close-kasa-modal" style="background:none;border:none;color:#94a3b8;font-size:1.3rem;cursor:pointer;">✕</button>
                </div>

                <form id="form-kasa-settings">
                    <div style="margin-bottom:16px;">
                        <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">🏁 Başlangıç Kasa Bakiyesi (TL)</label>
                        <input type="number" id="input-starting-bank" value="${profile.startingBankroll || 1000}" min="100" step="50" style="width:100%;padding:10px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.95rem;font-weight:700;">
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">📈 Bahis & Stake Stratejisi</label>
                        <select id="select-stake-strategy" style="width:100%;padding:10px 14px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.9rem;">
                            <option value="fixed" ${profile.stakeStrategy === 'fixed' ? 'selected' : ''}>Sabit Tutar (Örn: Her Kupona 100 TL)</option>
                            <option value="percentage" ${profile.stakeStrategy === 'percentage' ? 'selected' : ''}>Kasa Yüzdesi (Örn: Kasaya göre %5)</option>
                            <option value="kelly" ${profile.stakeStrategy === 'kelly' ? 'selected' : ''}>Yarım Kelly Kriteri (Yapay Zeka Risk Odaklı)</option>
                        </select>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">Kupon Başı TL</label>
                            <input type="number" id="input-fixed-stake" value="${profile.fixedStakeAmount || 100}" min="10" step="10" style="width:100%;padding:10px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.9rem;">
                        </div>
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">Kasa Oranı (%)</label>
                            <input type="number" id="input-percentage-stake" value="${profile.percentageStakeRate || 5}" min="1" max="50" step="1" style="width:100%;padding:10px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.9rem;">
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">🎯 Günlük Kâr Hedefi (TL)</label>
                            <input type="number" id="input-daily-goal" value="${profile.dailyProfitGoal || 150}" min="50" step="50" style="width:100%;padding:10px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.9rem;">
                        </div>
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">🏆 Haftalık Kâr Hedefi (TL)</label>
                            <input type="number" id="input-weekly-goal" value="${profile.weeklyProfitGoal || 800}" min="100" step="100" style="width:100%;padding:10px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:0.9rem;">
                        </div>
                    </div>

                    <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
                        <button type="button" id="btn-cancel-kasa-modal" class="btn btn-ghost btn-sm">Vazgeç</button>
                        <button type="submit" class="btn btn-primary btn-sm" style="font-weight:700;">💾 Ayarları Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
        `;
    },

    /**
     * Modal ve Buton Olaylarını Bağlar
     */
    bindEvents(app) {
        const modal = document.getElementById('modal-kasa-settings');
        const openBtn = document.getElementById('btn-open-kasa-modal');
        const closeBtn = document.getElementById('btn-close-kasa-modal');
        const cancelBtn = document.getElementById('btn-cancel-kasa-modal');
        const form = document.getElementById('form-kasa-settings');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
            });
        }

        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const startingBank = parseFloat(document.getElementById('input-starting-bank').value) || 1000;
                const strategy = document.getElementById('select-stake-strategy').value || 'fixed';
                const fixedStake = parseFloat(document.getElementById('input-fixed-stake').value) || 100;
                const pctStake = parseFloat(document.getElementById('input-percentage-stake').value) || 5;
                const dailyGoal = parseFloat(document.getElementById('input-daily-goal').value) || 150;
                const weeklyGoal = parseFloat(document.getElementById('input-weekly-goal').value) || 800;

                UserProfileService.saveProfile({
                    startingBankroll: startingBank,
                    stakeStrategy: strategy,
                    fixedStakeAmount: fixedStake,
                    percentageStakeRate: pctStake,
                    dailyProfitGoal: dailyGoal,
                    weeklyProfitGoal: weeklyGoal
                });

                closeModal();

                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast('Kasa stratejisi ve hedefleri başarıyla kaydedildi!', 'success');
                }

                // Paneli yenile
                if (window.ProfitLossPanel && app) {
                    const container = document.getElementById('profit-loss-container');
                    if (container) {
                        container.innerHTML = ProfitLossPanel.render(app);
                        ProfitLossPanel.bindEvents(app);
                    }
                }
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.KasaManager = KasaManager;
}
