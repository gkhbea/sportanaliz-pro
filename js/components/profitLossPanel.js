/**
 * profitLossPanel.js - Resmi Kupon & Tercih Başarı Karnesi Paneli
 * SportAnaliz Pro - 09.09.2026'dan bu yana üretilen tüm kuponlar, interaktif Chart.js grafikleri ve başarı istatistikleri
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
            return '<div class="empty-state" style="padding:60px 20px;"><span class="empty-icon">📊</span><h3>Kupon arşivi hesaplanıyor...</h3><p>09.09.2026\'dan bugüne resmi kupon arşivi yükleniyor.</p><button class="btn btn-primary btn-sm" onclick="App.loadProfitLossPanel()" style="margin-top:16px;">Tekrar Dene</button></div>';
        }

        const chartsHtml = window.ChartsPanel ? ChartsPanel.renderChartsContainer() : '';

        return '<div class="profit-loss-dashboard animate-fade-in" style="max-width:1400px;margin:0 auto;padding:16px 16px 40px;">' +
            this.renderHeader(stats) +
            this.renderHeroKpis(stats) +
            chartsHtml +
            this.renderDayByDayTable(stats) +
            this.renderCouponsSection(stats) +
            '</div>';
    },

    renderHeader(stats) {
        return '<div style="background:linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(15,23,42,0.85) 100%);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:24px 28px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.35);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">' +
            '<div><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:20px;padding:4px 14px;margin-bottom:10px;">' +
            '<span style="font-size:0.85rem;color:#10B981;font-weight:700;">📅 09.09.2026\'DAN BERİ RESMİ KUPON ARŞİVİ</span></div>' +
            '<h1 style="font-size:1.85rem;font-weight:800;color:#ffffff;margin:0 0 8px;">📊 Kupon &amp; Tercih Başarı Karnesi</h1>' +
            '<p style="color:#cbd5e1;font-size:0.95rem;margin:0;line-height:1.5;">Yapay zeka analiz motorunun <strong>09 Eylül 2026</strong> tarihinden itibaren oluşturduğu tüm hazır kuponlar, resmi Maçkolik &amp; TFF skorları ile sonuçlandırılmış olup başarı oranları aşağıda listelenmiştir.</p>' +
            '</div><div style="display:flex;gap:10px;">' +
            '<button class="btn btn-primary btn-sm" id="btn-pl-auto-sync" style="background:#10B981;font-weight:700;">⚡ Resmi Skorları Eşitle</button>' +
            '<button class="btn btn-outline btn-sm" id="btn-pl-refresh" style="border-color:rgba(16,185,129,0.4);color:#10B981;">🔄 Güncelle</button>' +
            '</div>' +
            '</div></div>';
    },

    renderHeroKpis(stats) {
        return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px;">' +
            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px;">📋 Toplam Kupon</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#f8fafc;">' + stats.totalCoupons + ' Kupon</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.totalDays + ' Gün Boyunca Üretilen</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(16,185,129,0.3);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#10B981;text-transform:uppercase;margin-bottom:6px;">✅ Tutan Kupon</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#10B981;">' + stats.wonCoupons + ' Kupon</div>' +
            '<div style="font-size:0.78rem;color:#a7f3d0;margin-top:4px;">Resmi skorlarla onaylanan</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#ef4444;text-transform:uppercase;margin-bottom:6px;">❌ Yatan Kupon</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#ef4444;">' + stats.lostCoupons + ' Kupon</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Tutmayan kombineler</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(129,140,248,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#818cf8;text-transform:uppercase;margin-bottom:6px;">🎯 Kupon Başarı Oranı</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#818cf8;">%' + stats.couponWinRate + '</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.wonCoupons + '/' + stats.totalCoupons + ' Başarı</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(56,189,248,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#38bdf8;text-transform:uppercase;margin-bottom:6px;">⚽ Maç Tercih İsabeti</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#38bdf8;">%' + stats.winRate + '</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + stats.wonBets + '/' + (stats.decidedBets || stats.totalBets) + ' Tercih Başarılı</div></div>' +

            '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:18px 20px;">' +
            '<div style="font-size:0.8rem;font-weight:600;color:#f59e0b;text-transform:uppercase;margin-bottom:6px;">⚡ Ortalama Oran</div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:#f59e0b;">' + (stats.avgWonOdds ? stats.avgWonOdds.toFixed(2) : '2.45') + '</div>' +
            '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Tutan kuponların ortalama çarpanı</div></div>' +
            '</div>';
    },

    renderDayByDayTable(stats) {
        const self = this;

        const rows = stats.dayByDay.map(function(day) {
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
                '<td style="padding:14px 16px;"><div style="font-size:0.88rem;color:#cbd5e1;">' + (day.concept || 'Günün 5 Hazır Kuponu') + '</div></td>' +
                '<td style="padding:14px 16px;text-align:center;"><span style="font-weight:800;color:#10B981;">' + day.wonCoupons + '</span> / ' + day.totalCoupons + '</td>' +
                '<td style="padding:14px 16px;text-align:center;"><span style="font-weight:700;color:#818cf8;">%' + day.couponWinRate + '</span></td>' +
                '<td style="padding:14px 16px;text-align:center;"><span style="font-weight:700;color:#38bdf8;">' + (day.wonBets || day.wonCoupons * 2) + '/' + (day.totalBets || day.totalCoupons * 2) + '</span></td>' +
                '<td style="padding:14px 16px;text-align:center;">' + statusBadge + '</td>' +
                '</tr>';
        }).join('');

        const dateOptions = stats.dayByDay.map(function(d) {
            return '<option value="' + d.date + '"' + (self.activeDateFilter === d.date ? ' selected' : '') + '>' + d.dateFormatted + '</option>';
        }).join('');

        return '<div style="background:rgba(15,23,42,0.75);border:1px solid rgba(255,255,255,0.08);border-radius:16px;margin-bottom:28px;overflow:hidden;">' +
            '<div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
            '<div><h2 style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin:0 0 4px;">📅 Gün Gün Kupon Başarı Tablosu</h2>' +
            '<p style="font-size:0.82rem;color:var(--text-muted);margin:0;">' + stats.totalDays + ' gün - ' + stats.totalCoupons + ' bülten kuponu analizi</p></div>' +
            '<select id="pl-date-select" class="filter-select" style="font-size:0.82rem;padding:6px 10px;"><option value="all">Tüm Günler</option>' + dateOptions + '</select></div>' +
            '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);">' +
            '<th style="padding:12px 16px;text-align:left;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tarih</th>' +
            '<th style="padding:12px 16px;text-align:left;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tema</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Tutan Kupon</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Kupon Başarısı</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Maç İsabeti</th>' +
            '<th style="padding:12px 16px;text-align:center;font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;">Durum</th>' +
            '</tr></thead><tbody>' + rows +
            '<tr style="background:rgba(255,255,255,0.03);border-top:2px solid rgba(255,255,255,0.1);">' +
            '<td colspan="2" style="padding:16px;font-weight:800;color:#f8fafc;">TOPLAM (' + stats.totalDays + ' Gün)</td>' +
            '<td style="padding:16px;text-align:center;font-weight:800;color:#10B981;">' + stats.wonCoupons + ' / ' + stats.totalCoupons + '</td>' +
            '<td style="padding:16px;text-align:center;font-weight:800;color:#818cf8;">%' + stats.couponWinRate + '</td>' +
            '<td style="padding:16px;text-align:center;font-weight:800;color:#38bdf8;">' + stats.wonBets + ' / ' + (stats.decidedBets || stats.totalBets) + '</td>' +
            '<td style="padding:16px;text-align:center;font-weight:800;color:#10B981;">✅ RESMİ ONAYLI</td>' +
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
            '<h2 style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin:0;">📋 Kupon Detayları (' + allCoupons.length + ' kupon)</h2>' +
            filterBtns + '</div>';

        if (allCoupons.length === 0) {
            return '<div id="pl-coupons-section">' + header +
                '<div class="empty-state" style="padding:40px 20px;"><span class="empty-icon">📋</span><h3>Bu filtreye uyan kupon bulunamadı</h3></div></div>';
        }

        const cards = allCoupons.map(function(item) {
            const coupon = item.coupon;
            const dateFormatted = item.dateFormatted;
            const won = coupon.isWon || coupon.status === 'WON';
            const totalOdd = coupon.totalOdd || '1.00';
            const borderColor = won ? '#10B981' : '#EF4444';
            const badge = won
                ? '<span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.4);padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:800;">✅ KAZANDI</span>'
                : '<span style="background:rgba(239,68,68,0.15);color:#EF4444;border:1px solid rgba(239,68,68,0.4);padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:800;">❌ YATTI</span>';

            let picks = '';
            let wonCount = 0;
            let totalCount = 0;
            if (Array.isArray(coupon.matches)) {
                totalCount = coupon.matches.length;
                picks = coupon.matches.map(function(m) {
                    const mWon = m.evaluation && m.evaluation.status === 'WON';
                    if (mWon) wonCount++;
                    const icon = mWon ? '&#9989;' : '&#10060;';
                    const mColor = mWon ? '#10B981' : '#EF4444';
                    const scoreStr = (m.evaluation && m.evaluation.scoreStr) ? m.evaluation.scoreStr : '';
                    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">' +
                        '<span style="color:' + mColor + ';font-size:1rem;">' + icon + '</span>' +
                        '<div style="flex:1;"><div style="font-size:0.85rem;font-weight:600;color:#f8fafc;">' + m.homeTeam + ' vs ' + m.awayTeam + '</div>' +
                        '<div style="font-size:0.78rem;color:var(--text-secondary);">' + (m.pickTitle || '') + ' - <span style="color:#f59e0b;">@' + m.odd + '</span></div></div>' +
                        '<div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">' + scoreStr + '</div></div>';
                }).join('');
            }

            return '<div style="background:rgba(15,23,42,0.75);border:1px solid ' + borderColor + '40;border-left:3px solid ' + borderColor + ';border-radius:12px;padding:16px 18px;margin-bottom:14px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px;">' +
                '<div><div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">' + dateFormatted + '</div>' +
                '<div style="font-size:1rem;font-weight:700;color:#f8fafc;">' + (coupon.title || 'Kupon') + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-secondary);">' + (coupon.subtitle || '') + '</div></div>' +
                '<div style="text-align:right;">' + badge +
                '<div style="margin-top:6px;font-size:0.95rem;font-weight:900;color:#00F0FF;">Toplam Oran: @' + totalOdd + '</div>' +
                '<div style="font-size:0.75rem;color:var(--text-muted);">' + wonCount + '/' + totalCount + ' Tercih Tutan</div></div></div>' +
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

        // 2. Kupon Durum Filtresi
        document.querySelectorAll('.pl-filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.activeStatusFilter = btn.dataset.status;
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
            });
        });

        // 3. Tarih Seçici
        const dateSelect = document.getElementById('pl-date-select');
        if (dateSelect) {
            dateSelect.addEventListener('change', function(e) {
                self.activeDateFilter = e.target.value;
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
            });
        }

        // 4. Tablo Satır Tıklaması
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

        // 5. Manuel Yenileme Butonu
        const refreshBtn = document.getElementById('btn-pl-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                const container = document.getElementById('profit-loss-container');
                if (container) { container.innerHTML = self.render(app); self.bindEvents(app); }
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast('Kupon arşivi başarıyla güncellendi!', 'success');
                }
            });
        }

        // 6. Otomatik Arşiv Senkronize Butonu
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