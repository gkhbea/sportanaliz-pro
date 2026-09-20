/**
 * profitLossPanel.js - Kasa ve Kar/Zarar Raporu Paneli
 * SportAnaliz Pro - 09.09.2026'dan bu yana üretilen tüm kuponlar, interaktif Chart.js grafikleri ve kasa yönetimi
 */
const ProfitLossPanel = {
    activeStatusFilter: 'all',
    activeDateFilter: 'all',

    _fmt(num) {
        const n = parseFloat(num) || 0;
        return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    render(app) {
        let stats = null;
        try {
            stats = window.MatchTracker
                ? window.MatchTracker.calculateCumulativeCouponStats('2026-09-09')
                : null;
        } catch(e) {
            console.error('ProfitLossPanel render hatasi:', e);
        }

        if (!stats || !stats.dayByDay) {
            return '<div class="empty-state" style="padding:60px 20px;"><span class="empty-icon">&#128176;</span><h3>Kasa verileri hesaplanıyor...</h3><p>09.09.2026\'dan bugüne kupon arşivi yükleniyor.</p><button class="btn btn-primary btn-sm" onclick="App.loadProfitLossPanel()" style="margin-top:16px;">Tekrar Dene</button></div>';
        }

        const kasaCardHtml = window.KasaManager ? KasaManager.renderKasaCard(stats) : '';
        const kasaModalHtml = window.KasaManager ? KasaManager.renderKasaModal() : '';
        const chartsHtml = window.ChartsPanel ? ChartsPanel.renderChartsContainer() : '';

        return '<div class="profit-loss-dashboard animate-fade-in" style="max-width:1400px;margin:0 auto;padding:16px 16px 40px;">' +
            this.renderHeader(stats) +
            kasaCardHtml +
            this.renderHeroKpis(stats) +
            chartsHtml +
            this.renderDayByDayTable(stats) +
            this.renderCouponsSection(stats) +
            kasaModalHtml +
            '</div>';
    },

    renderHeader(stats) {
        return '<div style="background:linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(15,23,42,0.85) 100%);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:24px 28px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.35);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">' +
            '<div><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:20px;padding:4px 14px;margin-bottom:10px;">' +
            '<span style="font-size:0.85rem;color:#10B981;font-weight:700;">&#128197; 09.09.2026\'DAN BERİ RESMİ KASA RAPORU</span></div>' +
            '<h1 style="font-size:1.85rem;font-weight:800;color:#ffffff;margin:0 0 8px;">&#128176; Kasa &amp; Kâr / Zarar Merkezi</h1>' +
            '<p style="color:#cbd5e1;font-size:0.95rem;margin:0;line-height:1.5;">Yapay zeka analiz motorunun <strong>09 Eylül 2026</strong> tarihinden itibaren oluşturduğu tüm hazır kuponlar, resmi maç skorları ile sonuçlandırılmış olup net kâr, zarar ve ROI aşağıda listelenmiştir.</p>' +
            '</div><div style="display:flex;gap:10px;">' +
            '<button class="btn btn-primary btn-sm" id="btn-pl-auto-sync" style="background:#10B981;font-weight:700;">&#9889; Otomatik Arşiv Senkronize</button>' +
            '<button class="btn btn-outline btn-sm" id="btn-pl-refresh" style="border-color:rgba(16,185,129,0.4);color:#10B981;">&#128260; Güncelle</button>' +
            '</div>' +
            '</div></div>';
    },

    renderHeroKpis(stats) {
        const netProfit = stats.netProfit || 0;
        const isProfit = netProfit >= 0;
        const netColor = isProfit ? '#10B981' : '#EF4444';
        const netLabel = isProfit ? 'KÂRDA' : 'ZARAR';
        const netFormatted = (isProfit ? '+' : '') + this._fmt(netProfit) + ' TL';
        const roiFormatted = (stats.roi >= 0 ? '+' : '') + stats.roi + '%';
        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px;">' +
            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px;">&#128181; Toplam Yatırılan</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#f8fafc;">' + this._fmt(stats.totalStake) + ' TL</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.totalCoupons + ' Kupon x 100 TL</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(56,189,248,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#38bdf8;text-transform:uppercase;margin-bottom:6px;">&#127942; Toplam Kazanılan</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#38bdf8;">' + this._fmt(stats.totalReturn) + ' TL</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Tutan kuponların toplam getirisi</div></div>' +

            '<div style="background:linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(15,23,42,0.9) 100%);border:2px solid ' + netColor + ';border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:700;color:' + netColor + ';text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
            '<span>&#128200; Net Kâr</span><span style="font-size:0.7rem;background:' + netColor + ';color:#000;font-weight:900;padding:1px 6px;border-radius:6px;">' + netLabel + '</span></div>' +
            '<div style="font-size:1.85rem;font-weight:900;color:' + netColor + ';">' + netFormatted + '</div>' +
            '<div style="font-size:0.78rem;color:#cbd5e1;margin-top:4px;">Yatırılan düşüldükten sonra net</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#f59e0b;text-transform:uppercase;margin-bottom:6px;">&#128640; ROI</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#f59e0b;">' + roiFormatted + '</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Kasa getiri oranı</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(129,140,248,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#818cf8;text-transform:uppercase;margin-bottom:6px;">&#127967; Kupon Başarısı</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#818cf8;">' + stats.wonCoupons + '/' + stats.totalCoupons + ' (%' + stats.couponWinRate + ')</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.lostCoupons + ' yatan, ' + stats.wonCoupons + ' tutan</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(236,72,153,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#ec4899;text-transform:uppercase;margin-bottom:6px;">&#9917; Maç İsabeti</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#ec4899;">%' + stats.winRate + '</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.wonBets + '/' + (stats.decidedBets || stats.totalBets) + ' Tercih Başarılı</div></div>' +
            '</div>';
    },

    renderDayByDayTable(stats) {
        const self = this;
        const totalIsProfit = (stats.netProfit || 0) >= 0;
        const totalNetText = (totalIsProfit ? '+' : '') + this._fmt(stats.netProfit) + ' TL';

        const rows = stats.dayByDay.map(function(day) {
            const isProfit = (day.netProfit || 0) >= 0;
            const netText = (isProfit ? '+' : '') + self._fmt(day.netProfit) + ' TL';
            const netColor = isProfit ? '#10B981' : '#EF4444';
            let statusBadge = '';
            if (day.wonCoupons === day.totalCoupons) {
                statusBadge = '<span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">TÜMÜ TUTTU</span>';
            } else if (day.lostCoupons > 0) {
                statusBadge = '<span style="background:rgba(239,68,68,0.15);color:#EF4444;border:1px solid rgba(239,68,68,0.3);padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">' + day.lostCoupons + ' YATTI</span>';
            } else {
                statusBadge = '<span style="background:rgba(100,116,139,0.15);color:#94a3b8;padding:2px 8px;border-radius:6px;font-size:0.75rem;">BEKLİYOR</span>';
            }
            return '<tr class="pl-table-row" data-date="' + day.date + '" style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'">' +
                '<td style="padding:14px 16px;"><div style="font-weight:700;color:#f8fafc;">' + day.dateFormatted + '</div><div style="font-size:0.78rem;color:var(--text-muted);">' + (day.dayName || '') + '</div></td>' +
                '<td style="padding:14px 16px;"><div style="font-size:0.88rem;color:#cbd5e1;">' + (day.concept || '') + '</div></td>' +
                '<td style="padding:14px 16px;text-align:center;"><span style="font-weight:700;color:#818cf8;">' + day.wonCoupons + '/' + day.totalCoupons + '</span><div style="font-size:0.75rem;color:var(--text-muted);">%' + day.couponWinRate + '</div></td>' +
                '<td style="padding:14px 16px;text-align:center;">' + statusBadge + '</td>' +
                '<td style="padding:14px 16px;text-align:right;"><div style="font-weight:800;color:#f8fafc;">' + self._fmt(day.totalStake) + ' TL</div></td>' +
                '<td style="padding:14px 16px;text-align:right;"><div style="font-weight:800;color:#38bdf8;">' + self._fmt(day.totalReturn) + ' TL</div></td>' +
                '<td style="padding:14px 16px;text-align:right;"><div style="font-weight:900;color:' + netColor + ';font-size:1.05rem;">' + netText + '</div></td>' +
                '</tr>';
        }).join('');

        const dateOptions = stats.dayByDay.map(function(d) {
            return '<option value="' + d.date + '"' + (self.activeDateFilter === d.date ? ' selected' : '') + '>' + d.dateFormatted + '</option>';
        }).join('');

        return '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(255,255,255,0.08);border-radius:16px;margin-bottom:28px;overflow:hidden;">' +
            '<div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
            '<div><h2 style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin:0 0 4px;">&#128197; Gün Gün Kasa Tablosu</h2>' +
            '<p style="font-size:0.82rem;color:var(--text-muted);margin:0;">' + stats.totalDays + ' gün - ' + stats.totalCoupons + ' kupon analizi</p></div>' +
            '<select id="pl-date-select" class="filter-select" style="font-size:0.82rem;padding:6px 10px;"><option value="all">Tüm Günler</option>' + dateOptions + '</select></div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);">' +
            '<th style="padding:12px 16px;text-align:left;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tarih</th>' +
            '<th style="padding:12px 16px;text-align:left;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tema</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tutanlar</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Durum</th>' +
            '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Yatırılan</th>' +
            '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Kazanılan</th>' +
            '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Net</th>' +
            '</tr></thead><tbody>' + rows +
            '<tr style="background:rgba(255,255,255,0.03);border-top:2px solid rgba(255,255,255,0.1);">' +
            '<td colspan="4" style="padding:16px;font-weight:800;color:#f8fafc;">TOPLAM (' + stats.totalDays + ' Gün)</td>' +
            '<td style="padding:16px;text-align:right;font-weight:800;color:#ffffff;">' + this._fmt(stats.totalStake) + ' TL</td>' +
            '<td style="padding:16px;text-align:right;font-weight:800;color:#38bdf8;">' + this._fmt(stats.totalReturn) + ' TL</td>' +
            '<td style="padding:16px;text-align:right;font-weight:900;color:' + (totalIsProfit ? '#10B981' : '#EF4444') + ';font-size:1.1rem;">' + totalNetText + '</td>' +
            '</tr></tbody></table></div></div>';
    },

    renderCouponsSection(stats) {
        const self = this;
        let filteredDays = stats.dayByDay;
        if (this.activeDateFilter !== 'all') {
            filteredDays = filteredDays.filter(function(d) { return d.date === self.activeDateFilter; });
        }
        let allCoupons = [];
        filteredDays.forEach(function(day) {
            (day.coupons || []).forEach(function(coupon) {
                allCoupons.push({ coupon: coupon, date: day.date, dateFormatted: day.dateFormatted });
            });
        });
        if (this.activeStatusFilter === 'won') {
            allCoupons = allCoupons.filter(function(c) { return c.coupon.isWon || c.coupon.status === 'WON'; });
        } else if (this.activeStatusFilter === 'lost') {
            allCoupons = allCoupons.filter(function(c) { return !c.coupon.isWon && c.coupon.status !== 'WON'; });
        }

        const filterBtns = '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="pl-filter-btn btn btn-sm ' + (this.activeStatusFilter === 'all' ? 'btn-primary' : 'btn-ghost') + '" data-status="all">Tümü</button>' +
            '<button class="pl-filter-btn btn btn-sm ' + (this.activeStatusFilter === 'won' ? 'btn-primary' : 'btn-ghost') + '" data-status="won" style="color:#10B981;">Tutanlar</button>' +
            '<button class="pl-filter-btn btn btn-sm ' + (this.activeStatusFilter === 'lost' ? 'btn-primary' : 'btn-ghost') + '" data-status="lost" style="color:#EF4444;">Yatanlar</button>' +
            '</div>';

        const header = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
            '<h2 style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin:0;">&#127967; Kupon Detayları (' + allCoupons.length + ' kupon)</h2>' +
            filterBtns + '</div>';

        if (allCoupons.length === 0) {
            return '<div id="pl-coupons-section">' + header +
                '<div class="empty-state" style="padding:40px 20px;"><span class="empty-icon">&#128196;</span><h3>Bu filtreye uyan kupon bulunamadı</h3></div></div>';
        }

        const cards = allCoupons.map(function(item) {
            const coupon = item.coupon;
            const dateFormatted = item.dateFormatted;
            const won = coupon.isWon || coupon.status === 'WON';
            const totalOdd = coupon.totalOdd || '1.00';
            const stake = coupon.recommendedStake || coupon.stake || 100;
            const potWin = coupon.potentialWin || (stake * parseFloat(totalOdd));
            const net = won ? Math.round(potWin - stake) : -stake;
            const borderColor = won ? '#10B981' : '#EF4444';
            const badge = won
                ? '<span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.4);padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">KAZANDI</span>'
                : '<span style="background:rgba(239,68,68,0.15);color:#EF4444;border:1px solid rgba(239,68,68,0.4);padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">YATTI</span>';

            let picks = '';
            if (Array.isArray(coupon.matches)) {
                picks = coupon.matches.map(function(m) {
                    const mWon = m.evaluation && m.evaluation.status === 'WON';
                    const icon = mWon ? '&#9989;' : '&#10060;';
                    const mColor = mWon ? '#10B981' : '#EF4444';
                    const scoreStr = (m.evaluation && m.evaluation.scoreStr) ? m.evaluation.scoreStr : '';
                    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
                        '<span style="color:' + mColor + ';font-size:1rem;">' + icon + '</span>' +
                        '<div style="flex:1;"><div style="font-size:0.85rem;font-weight:600;color:#f8fafc;">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
                        '<div style="font-size:0.78rem;color:var(--text-secondary);">' + (m.pickTitle || '') + ' - <span style="color:#f59e0b;">@' + m.odd + '</span></div></div>' +
                        '<div style="font-size:0.78rem;color:var(--text-muted);">' + scoreStr + '</div></div>';
                }).join('');
            }

            return '<div style="background:rgba(15,23,42,0.75);border:1px solid ' + borderColor + '40;border-left:3px solid ' + borderColor + ';border-radius:12px;padding:16px 18px;margin-bottom:14px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">' +
                '<div><div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">' + dateFormatted + '</div>' +
                '<div style="font-size:1rem;font-weight:700;color:#f8fafc;">' + (coupon.title || 'Kupon') + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-secondary);">' + (coupon.subtitle || '') + '</div></div>' +
                '<div style="text-align:right;">' + badge +
                '<div style="margin-top:6px;font-size:0.9rem;font-weight:800;color:' + borderColor + ';">' + (won ? '+' : '') + self._fmt(net) + ' TL</div>' +
                '<div style="font-size:0.75rem;color:var(--text-muted);">Oran: @' + totalOdd + '</div></div></div>' +
                '<div>' + picks + '</div></div>';
        }).join('');

        return '<div id="pl-coupons-section">' + header + cards + '</div>';
    },

    bindEvents(app) {
        const self = this;
        let stats = null;
        try {
            stats = window.MatchTracker
                ? window.MatchTracker.calculateCumulativeCouponStats('2026-09-09')
                : null;
        } catch(e) {
            console.error(e);
        }

        // 1. Chart.js Grafiklerini Başlat
        if (window.ChartsPanel && stats) {
            setTimeout(() => {
                ChartsPanel.initCharts(stats);
            }, 50);
        }

        // 2. Kasa Manager Olaylarını Bağla
        if (window.KasaManager) {
            KasaManager.bindEvents(app);
        }

        // 3. Kupon Durum Filtresi
        document.querySelectorAll('.pl-filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.activeStatusFilter = btn.dataset.status;
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
            });
        });

        // 4. Tarih Seçici
        const dateSelect = document.getElementById('pl-date-select');
        if (dateSelect) {
            dateSelect.addEventListener('change', function(e) {
                self.activeDateFilter = e.target.value;
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
            });
        }

        // 5. Tablo Satır Tıklaması
        document.querySelectorAll('.pl-table-row').forEach(function(row) {
            row.addEventListener('click', function() {
                const date = row.dataset.date;
                if (date) {
                    self.activeDateFilter = date;
                    const container = document.getElementById('profit-loss-container');
                    if (container) {
                        container.innerHTML = self.render(app);
                        self.bindEvents(app);
                        setTimeout(function() {
                            const sec = document.getElementById('pl-coupons-section');
                            if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                }
            });
        });

        // 6. Manuel Yenileme Butonu
        const refreshBtn = document.getElementById('btn-pl-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast('Kasa bilançosu güncellendi!', 'success');
                }
            });
        }

        // 7. Otomatik Arşiv Senkronize Butonu
        const syncBtn = document.getElementById('btn-pl-auto-sync');
        if (syncBtn) {
            syncBtn.addEventListener('click', function() {
                if (window.AutoArchiveService) {
                    AutoArchiveService.forceSyncArchive();
                }
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.ProfitLossPanel = ProfitLossPanel;
}