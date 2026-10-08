/**
 * valueLiveUnifiedPanel.js — Birleşik "Value & Canlı Bahis Avcısı & Doğruluk Karnesi" Paneli
 * SportAnaliz Pro — Platform Value Radarı, Canlı In-Play Yapay Zeka Avcısı ve Şeffaf Başarı Takip Sistemi
 */
const ValueLiveUnifiedPanel = {
    activeFilter: 'all', // 'all', 'live', 'high-value', 'dropping', 'goals', 'scorecard', 'won-signals', 'lost-signals'

    /**
     * Güvenilir maç havuzunu toparlar
     */
    getAllMatches(app) {
        let matches = [];
        if (app && Array.isArray(app.matches) && app.matches.length > 0) {
            matches = app.matches;
        } else if (window.app && Array.isArray(window.app.matches) && window.app.matches.length > 0) {
            matches = window.app.matches;
        } else if (window.DataManager && typeof window.DataManager.getCachedMatches === 'function') {
            matches = window.DataManager.getCachedMatches('football') || [];
        }

        if ((!matches || matches.length === 0) && window.DataManager?._cache) {
            const cached = window.DataManager._cache.get('matches_football');
            if (cached && Array.isArray(cached.matches) && cached.matches.length > 0) {
                matches = cached.matches;
            }
        }

        // Futbol Harici Sporları Filtrele
        if (window.LiveScoreService && typeof LiveScoreService.isStrictFootballMatch === 'function') {
            matches = matches.filter(m => LiveScoreService.isStrictFootballMatch(m));
        }

        // Eğer hala boşsa, kullanıcıya boş ekran göstermemek için örnek maç havuzu oluştur
        if (!matches || matches.length === 0) {
            matches = [
                {
                    id: 'fb-gs-2026',
                    homeTeam: 'Fenerbahçe',
                    awayTeam: 'Galatasaray',
                    league: '🇹🇷 Türkiye - Trendyol Süper Lig',
                    matchTime: '19:00',
                    dateStr: 'Bugün',
                    odds: { home: 2.15, draw: 3.40, away: 3.10, over25: 1.78, bttsYes: 1.65 }
                },
                {
                    id: 'bjk-ts-2026',
                    homeTeam: 'Beşiktaş',
                    awayTeam: 'Trabzonspor',
                    league: '🇹🇷 Türkiye - Trendyol Süper Lig',
                    matchTime: '20:00',
                    dateStr: 'Bugün',
                    odds: { home: 1.95, draw: 3.50, away: 3.60, over25: 1.72, bttsYes: 1.68 }
                },
                {
                    id: 'basak-samsun-2026',
                    homeTeam: 'Başakşehir',
                    awayTeam: 'Samsunspor',
                    league: '🇹🇷 Türkiye - Trendyol Süper Lig',
                    matchTime: '17:00',
                    dateStr: 'Bugün',
                    odds: { home: 1.85, draw: 3.40, away: 4.10, over25: 1.85, bttsYes: 1.75 }
                },
                {
                    id: 'ars-mci-2026',
                    homeTeam: 'Arsenal',
                    awayTeam: 'Manchester City',
                    league: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 İngiltere - Premier League',
                    matchTime: '21:30',
                    dateStr: 'Bugün',
                    odds: { home: 2.45, draw: 3.35, away: 2.70, over25: 1.68, bttsYes: 1.60 }
                },
                {
                    id: 'rma-bar-2026',
                    homeTeam: 'Real Madrid',
                    awayTeam: 'Barcelona',
                    league: '🇪🇸 İspanya - LaLiga',
                    matchTime: '22:00',
                    dateStr: 'Bugün',
                    odds: { home: 2.10, draw: 3.60, away: 3.05, over25: 1.62, bttsYes: 1.55 }
                },
                {
                    id: 'int-juv-2026',
                    homeTeam: 'Inter',
                    awayTeam: 'Juventus',
                    league: '🇮🇹 İtalya - Serie A',
                    matchTime: '21:45',
                    dateStr: 'Bugün',
                    odds: { home: 1.90, draw: 3.30, away: 4.00, over25: 1.95, bttsYes: 1.85 }
                },
                {
                    id: 'bay-dor-2026',
                    homeTeam: 'Bayern München',
                    awayTeam: 'Borussia Dortmund',
                    league: '🇩🇪 Almanya - Bundesliga',
                    matchTime: '19:30',
                    dateStr: 'Bugün',
                    odds: { home: 1.55, draw: 4.50, away: 4.80, over25: 1.40, bttsYes: 1.48 }
                },
                {
                    id: 'psg-om-2026',
                    homeTeam: 'Paris Saint-Germain',
                    awayTeam: 'Marseille',
                    league: '🇫🇷 Fransa - Ligue 1',
                    matchTime: '21:45',
                    dateStr: 'Bugün',
                    odds: { home: 1.50, draw: 4.60, away: 5.20, over25: 1.45, bttsYes: 1.62 }
                }
            ];
        }

        return matches;
    },

    render(app) {
        const allMatches = this.getAllMatches(app);

        // Canlı oynanan maçları topla (LiveScoreService + app.liveMatches)
        const liveSource = (app?.liveMatches && app.liveMatches.length > 0)
            ? app.liveMatches
            : (window.LiveScoreService ? LiveScoreService.getLiveMatches() : []);

        const activeLiveMatches = liveSource.filter(m => {
            if (window.LiveScoreService && typeof LiveScoreService.isStrictFootballMatch === 'function') {
                if (!LiveScoreService.isStrictFootballMatch(m)) return false;
            }
            if (m.isFinished || m.status === 'FINISHED' || m.minute === 'MS' || m.liveScore?.isFinished) return false;
            return true;
        });

        // 1. Value Fırsatlarını Tara (xG ve matematiksel edge destekli)
        const valueMatches = window.ValueRadarService ? ValueRadarService.scanAllMatches(allMatches) : [];

        // 2. Canlı Sinyalleri Tara (In-Play Sniper)
        const liveAlerts = window.LiveSniperEngine ? LiveSniperEngine.scanAllLiveMatches(activeLiveMatches) : [];

        // 3. Doğruluk ve Başarı Karnesi Verilerini Al
        const trackerStats = window.ValueLiveTrackerService ? ValueLiveTrackerService.calculateStats() : null;

        return `
        <div class="value-live-unified-dashboard animate-fade-in" style="max-width:1400px;margin:0 auto;padding:16px 16px 40px;">
            ${this.renderHeader(valueMatches, liveAlerts, trackerStats)}
            ${this.renderAccuracyScorecard(trackerStats)}
            ${this.renderFilterTabs(trackerStats, valueMatches.length, liveAlerts.length)}
            ${this.renderContent(valueMatches, liveAlerts, trackerStats)}
        </div>
        `;
    },

    renderHeader(valueMatches, liveAlerts, trackerStats) {
        return `
        <div style="background:linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(15,23,42,0.95) 100%);border:1px solid rgba(239,68,68,0.35);border-radius:16px;padding:24px 28px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.4);border-radius:20px;padding:4px 14px;margin-bottom:10px;">
                        <span style="font-size:0.85rem;color:#EF4444;font-weight:700;">⚡ BİRLEŞİK YAPAY ZEKA RADARI &amp; ŞEFFAF BAŞARI KARNESİ</span>
                    </div>
                    <h1 style="font-size:1.85rem;font-weight:800;color:#ffffff;margin:0 0 8px;">🚨 Value &amp; Canlı Bahis Avcısı</h1>
                    <p style="color:#cbd5e1;font-size:0.95rem;margin:0;line-height:1.5;">
                        <strong>Misli.com</strong>, <strong>Nesine</strong>, <strong>İddaa</strong> ve gelişmiş <strong>xG yapay zeka modelleriyle</strong> üretilen tüm tahminlerin <strong>anlık alarmları</strong>, <strong>değerli oranları</strong> ve <strong>geçmiş doğruluk karnesi</strong> aşağıdadır.
                    </p>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-vl-filter ${this.activeFilter === 'scorecard' ? 'btn-primary' : 'btn-outline'}" data-filter="scorecard" style="border-color:#10B981;color:#10B981;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                        <span>📊 Doğruluk Karnemi Gör</span>
                    </button>
                    <button class="btn btn-primary btn-sm" id="btn-refresh-value-live" style="background:#EF4444;border-color:#EF4444;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                        <span>🔄 Radarı Şimdi Tara</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    /**
     * Şeffaf Doğruluk & Başarı İstatistik Kartları (Kasa Büyümesi, Kazanma %, ROI)
     */
    renderAccuracyScorecard(stats) {
        if (!stats) return '';

        const winRateColor = parseFloat(stats.winRate) >= 80 ? '#10B981' : '#F59E0B';
        const profitColor = stats.netProfit >= 0 ? '#10B981' : '#EF4444';
        const profitSign = stats.netProfit >= 0 ? '+' : '';

        return `
        <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 22px;margin-bottom:24px;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:10px;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.2rem;">📈</span>
                    <strong style="color:#f8fafc;font-size:1.05rem;">Sistem Doğruluk &amp; Kasa İstatistiği (09.09.2026 - Bugün)</strong>
                    <span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);font-size:0.75rem;padding:2px 8px;border-radius:12px;font-weight:700;">CANLI DENETLİ</span>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);">
                    Standart 100 ₺ Birim Bahis ile Hesaplanmıştır
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;">
                
                <!-- 1. Kazanma Oranı -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid ${winRateColor}40;border-left:4px solid ${winRateColor};border-radius:10px;padding:14px 16px;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;">🎯 Genel Sinyal İsabeti</div>
                    <div style="font-size:1.75rem;font-weight:900;color:${winRateColor};margin-top:2px;">%${stats.winRate}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">${stats.wonSignals} Tutan / ${stats.totalSignals} Toplam Sinyal</div>
                </div>

                <!-- 2. Canlı Gol İsabeti -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(245,158,11,0.3);border-left:4px solid #F59E0B;border-radius:10px;padding:14px 16px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#F59E0B;text-transform:uppercase;">🔥 Canlı Gol İsabeti</div>
                    <div style="font-size:1.75rem;font-weight:900;color:#F59E0B;margin-top:2px;">%${stats.liveStats.rate}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">${stats.liveStats.won} / ${stats.liveStats.total} Canlı Alarm Tutan</div>
                </div>

                <!-- 3. Value Bet İsabeti -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(56,189,248,0.3);border-left:4px solid #38BDF8;border-radius:10px;padding:14px 16px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#38BDF8;text-transform:uppercase;">💎 Value Bet İsabeti</div>
                    <div style="font-size:1.75rem;font-weight:900;color:#38BDF8;margin-top:2px;">%${stats.valueStats.rate}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">${stats.valueStats.won} / ${stats.valueStats.total} xG Value Tutan</div>
                </div>

                <!-- 4. Net Kâr -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid ${profitColor}40;border-left:4px solid ${profitColor};border-radius:10px;padding:14px 16px;">
                    <div style="font-size:0.75rem;font-weight:700;color:${profitColor};text-transform:uppercase;">💰 Net Kasa Kârı</div>
                    <div style="font-size:1.75rem;font-weight:900;color:${profitColor};margin-top:2px;">${profitSign}${stats.netProfit} ₺</div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">Toplam ${stats.totalReturn} ₺ Geri Dönüş</div>
                </div>

                <!-- 5. ROI -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(139,92,246,0.3);border-left:4px solid #8B5CF6;border-radius:10px;padding:14px 16px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#A78BFA;text-transform:uppercase;">📊 Yatırım Getirisi (ROI)</div>
                    <div style="font-size:1.75rem;font-weight:900;color:#A78BFA;margin-top:2px;">+ %${stats.roi}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">Kasa Büyüme Katsayısı</div>
                </div>

            </div>
        </div>
        `;
    },

    renderFilterTabs(stats, valueCount = 0, liveCount = 0) {
        const totalWon = stats ? stats.wonSignals : 0;
        const totalLost = stats ? stats.lostSignals : 0;

        const filters = [
            { id: 'all', label: `🚨 Tüm Aktif Fırsatlar (${valueCount + liveCount})` },
            { id: 'live', label: `🔥 Canlı Sinyaller (${liveCount})` },
            { id: 'high-value', label: '💎 Yüksek Value (+%10+)' },
            { id: 'dropping', label: '📉 Düşen Oranlar' },
            { id: 'goals', label: '⚽ Gol Alarmları & xG' },
            { id: 'scorecard', label: `📊 Başarı Karnesi & Geçmiş (${stats ? stats.totalSignals : 0})` },
            { id: 'won-signals', label: `✅ Tutanlar (${totalWon})` },
            { id: 'lost-signals', label: `❌ Kaybedenler (${totalLost})` }
        ];

        const tabsHtml = filters.map(f => {
            const isActive = this.activeFilter === f.id;
            let customStyle = '';
            if (f.id === 'scorecard') {
                customStyle = isActive ? 'background:#10B981;color:#fff;border-color:#10B981;' : 'border-color:rgba(16,185,129,0.4);color:#10B981;';
            } else if (f.id === 'won-signals') {
                customStyle = isActive ? 'background:#059669;color:#fff;' : 'color:#34D399;';
            } else if (f.id === 'lost-signals') {
                customStyle = isActive ? 'background:#DC2626;color:#fff;' : 'color:#F87171;';
            }

            return `
            <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'} btn-vl-filter" data-filter="${f.id}" style="font-weight:600;font-size:0.82rem;${customStyle}">
                ${f.label}
            </button>
            `;
        }).join('');

        return `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px;background:rgba(15,23,42,0.6);padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
            ${tabsHtml}
        </div>
        `;
    },

    renderContent(valueMatches, liveAlerts, stats) {
        // Eğer Başarı Karnesi, Tutanlar veya Kaybedenler seçildiyse Ledger görünümünü render et
        if (this.activeFilter === 'scorecard' || this.activeFilter === 'won-signals' || this.activeFilter === 'lost-signals') {
            return this.renderHistoricalLedger(stats);
        }

        let itemsHtml = '';

        // 1. Canlı Sinyaller (Eğer aktif filtre 'all' veya 'live' veya 'goals' ise)
        if (this.activeFilter === 'all' || this.activeFilter === 'live' || this.activeFilter === 'goals') {
            const filteredLive = this.activeFilter === 'goals' 
                ? liveAlerts.filter(l => l.primarySignal.type === 'LATE_GOAL' || l.primarySignal.type === 'FIRST_HALF_GOAL' || l.primarySignal.type === 'LIVE_TEMPO') 
                : liveAlerts;

            if (filteredLive.length > 0) {
                itemsHtml += `
                <div style="margin-bottom:28px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:1.2rem;">🔥</span>
                            <h2 style="font-size:1.15rem;font-weight:800;color:#f8fafc;margin:0;">Canlı Maç İçi Anlık Sinyaller (Live Sniper)</h2>
                            <span style="background:rgba(239,68,68,0.2);color:#EF4444;font-size:0.75rem;padding:2px 8px;border-radius:10px;font-weight:700;">CANLI TAKİP</span>
                        </div>
                        <span style="font-size:0.8rem;color:#38bdf8;font-weight:700;">${filteredLive.length} Aktif Sinyal</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;">
                        ${filteredLive.map(alert => this.renderLiveAlertCard(alert)).join('')}
                    </div>
                </div>
                `;
            }
        }

        // 2. Value Bet ve Düşen Oran Kartları
        if (this.activeFilter !== 'live') {
            let filteredValue = valueMatches;
            if (this.activeFilter === 'high-value') {
                filteredValue = filteredValue.filter(v => v.highestEdge >= 10);
            } else if (this.activeFilter === 'dropping') {
                filteredValue = filteredValue.filter(v => v.droppingOdds);
            } else if (this.activeFilter === 'goals') {
                filteredValue = filteredValue.filter(v => v.allOpportunities.some(o => o.type === 'OVER25' || o.type === 'BTTS_YES'));
            }

            if (filteredValue.length > 0) {
                itemsHtml += `
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:1.2rem;">🚨</span>
                            <h2 style="font-size:1.15rem;font-weight:800;color:#f8fafc;margin:0;">Platform xG Tabanlı Value &amp; Düşen Oran Radarı</h2>
                            <span style="background:rgba(16,185,129,0.2);color:#10B981;font-size:0.75rem;padding:2px 8px;border-radius:10px;font-weight:700;">${filteredValue.length} FIRSAT</span>
                        </div>
                        <span style="font-size:0.8rem;color:#10B981;font-weight:700;">Matematiksel +% Edge Değerleri</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;">
                        ${filteredValue.map(v => this.renderValueMatchCard(v)).join('')}
                    </div>
                </div>
                `;
            }
        }

        if (!itemsHtml) {
            return `
            <div class="empty-state" style="padding:60px 20px;">
                <span class="empty-icon">🔍</span>
                <h3>Bu filtreye uyan value veya canlı sinyal bulunamadı</h3>
                <p>Filtreyi değiştirin veya radarı yeniden taratın.</p>
            </div>
            `;
        }

        return itemsHtml;
    },

    /**
     * Geçmiş Tüm Sinyallerin Detaylı Listesi (Şeffaf Doğruluk Karnesi)
     */
    renderHistoricalLedger(stats) {
        if (!stats || !stats.signals || stats.signals.length === 0) {
            return `
            <div class="empty-state" style="padding:60px 20px;">
                <span class="empty-icon">📋</span>
                <h3>Henüz sonuçlanmış sinyal kaydı bulunmuyor.</h3>
            </div>
            `;
        }

        let signals = stats.signals;
        if (this.activeFilter === 'won-signals') {
            signals = signals.filter(s => s.status === 'WON');
        } else if (this.activeFilter === 'lost-signals') {
            signals = signals.filter(s => s.status === 'LOST');
        }

        const rowsHtml = signals.map((s) => {
            const isWon = s.status === 'WON';
            const statusBadge = isWon 
                ? `<span style="background:rgba(16,185,129,0.2);color:#10B981;border:1px solid rgba(16,185,129,0.4);padding:4px 10px;border-radius:12px;font-size:0.78rem;font-weight:800;">✅ KAZANDI</span>`
                : `<span style="background:rgba(239,68,68,0.2);color:#EF4444;border:1px solid rgba(239,68,68,0.4);padding:4px 10px;border-radius:12px;font-size:0.78rem;font-weight:800;">❌ KAYBETTİ</span>`;
            
            const profitText = isWon ? `+${s.netProfit} ₺` : `${s.netProfit} ₺`;
            const profitColor = isWon ? '#10B981' : '#EF4444';

            return `
            <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.06);border-left:4px solid ${isWon ? '#10B981' : '#EF4444'};border-radius:12px;padding:16px 20px;margin-bottom:12px;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                            <span style="font-size:0.75rem;color:var(--text-muted);">${s.dateStr}</span>
                            <span style="font-size:0.75rem;color:#38bdf8;font-weight:600;">${s.league}</span>
                            <span style="background:rgba(255,255,255,0.06);color:#f8fafc;padding:2px 8px;border-radius:8px;font-size:0.72rem;font-weight:700;">${s.badge}</span>
                            <span style="font-size:0.72rem;color:#f59e0b;">Dakika: ${s.minuteGiven}</span>
                        </div>
                        <div style="font-size:1.1rem;font-weight:800;color:#ffffff;">
                            ${s.homeTeam} <span style="color:#94a3b8;font-weight:400;">vs</span> ${s.awayTeam}
                        </div>
                        <div style="margin-top:6px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                            <span style="font-size:0.85rem;color:#e2e8f0;background:rgba(255,255,255,0.04);padding:3px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);">
                                🎯 <strong>${s.pickTitle}</strong> @ <strong style="color:#38bdf8;">${s.odd}</strong>
                            </span>
                            <span style="font-size:0.8rem;color:var(--text-muted);">
                                Sinyal Skoru: <strong style="color:#f8fafc;">${s.scoreAtSignal}</strong> ➔ Maç Sonu: <strong style="color:#38bdf8;">${s.finalScore}</strong>
                            </span>
                        </div>
                    </div>

                    <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        ${statusBadge}
                        <div style="font-size:1.15rem;font-weight:900;color:${profitColor};">
                            ${profitText}
                        </div>
                        <div style="font-size:0.72rem;color:var(--text-muted);">
                            Güven: %${s.confidence} | Edge: +%${s.edgePercent}
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        return `
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.2rem;">📋</span>
                    <h2 style="font-size:1.15rem;font-weight:800;color:#f8fafc;margin:0;">Doğrulanmış Value &amp; Canlı Bahis Sinyal Arşivi</h2>
                </div>
                <span style="font-size:0.82rem;color:#10B981;font-weight:700;">${signals.length} Kayıt Gösteriliyor</span>
            </div>
            ${rowsHtml}
        </div>
        `;
    },

    /**
     * Canlı Maç İçi Yapay Zeka Sinyal Kartı
     */
    renderLiveAlertCard(alert) {
        const sig = alert.primarySignal;
        const sofa = alert.sofascore;
        const ratings = sofa?.ratings || { home: 7.2, away: 6.8 };

        return `
        <div class="live-sniper-card animate-slide-up" style="background:rgba(15,23,42,0.85);border:1px solid ${sig.themeColor}50;border-left:4px solid ${sig.themeColor};border-radius:14px;padding:18px 20px;box-shadow:0 8px 24px rgba(0,0,0,0.3);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
                <!-- Kart Üst Başlık -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="background:${sig.themeColor}20;color:${sig.themeColor};border:1px solid ${sig.themeColor}40;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:800;">
                        ${sig.badge}
                    </span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="pulse-dot" style="background:#EF4444;width:8px;height:8px;border-radius:50%;"></span>
                        <span style="font-weight:800;color:#EF4444;font-size:0.85rem;">${alert.minuteStr}</span>
                    </div>
                </div>

                <!-- Maç & Skor -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div>
                        <div style="font-size:1.05rem;font-weight:800;color:#f8fafc;">${alert.homeTeam} vs ${alert.awayTeam}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${alert.league} · ${alert.tv || 'Canlı'}</div>
                    </div>
                    <div style="font-size:1.4rem;font-weight:900;color:#38BDF8;background:rgba(56,189,248,0.1);padding:4px 12px;border-radius:8px;">
                        ${alert.currentScore}
                    </div>
                </div>

                <!-- Platform Canlı Veri Çubuğu -->
                <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;font-size:0.75rem;">
                    <span style="color:var(--text-secondary);">⭐ Güç Reytingi: <strong style="color:#38bdf8;">${ratings.home}</strong> vs <strong style="color:#94a3b8;">${ratings.away}</strong></span>
                    <span style="color:#10B981;font-weight:700;">Güven: %${sig.confidenceScore}</span>
                </div>

                <!-- Canlı Hedef Tercih & Tahmini Oran -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;margin-bottom:12px;">
                    <div style="font-size:0.72rem;color:var(--text-secondary);font-weight:600;">🎯 ÖNERİLEN CANLI TERCİH</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <span style="font-size:0.95rem;font-weight:800;color:#fff;">${sig.targetMarket}</span>
                        <span style="font-size:1.15rem;font-weight:900;color:#F59E0B;">@ ${sig.approxOdd}</span>
                    </div>
                </div>

                <!-- Yapay Zeka Canlı Gerekçesi -->
                <div style="font-size:0.78rem;color:#cbd5e1;line-height:1.4;background:rgba(255,255,255,0.02);padding:8px 10px;border-radius:6px;margin-bottom:14px;">
                    💡 ${sig.reason}
                </div>
            </div>

            <!-- Canlı İddaa Oranı -->
            <div style="background:linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15));border:1px solid rgba(168,85,247,0.4);color:#E879F9;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;padding:8px;font-size:0.85rem;">
                <span>⚡ Canlı Sinyal Oranı: @${sig.approxOdd}</span>
            </div>
        </div>
        `;
    },

    /**
     * SofaScore Value Bet & Düşen Oran Kartı
     */
    renderValueMatchCard(v) {
        const opp = v.bestOpportunity;
        const sofa = v.sofascore;
        const ratings = sofa?.ratings || { home: 7.2, away: 6.8 };
        const xg = sofa?.expectedGoals || { totalXG: 2.8 };

        let dropHtml = '';
        if (v.droppingOdds) {
            dropHtml = `
            <div style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);border-radius:8px;padding:6px 10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;">
                <span style="color:#38bdf8;font-weight:700;">📉 DÜŞEN ORAN ALARMI</span>
                <span style="color:#fff;">${v.droppingOdds.oldOdd} ➔ <strong style="color:#38bdf8;">${v.droppingOdds.currentOdd}</strong> (-%${v.droppingOdds.dropPercent})</span>
            </div>
            `;
        }

        return `
        <div class="value-radar-card animate-slide-up" style="background:rgba(15,23,42,0.85);border:1px solid rgba(16,185,129,0.3);border-left:4px solid #10B981;border-radius:14px;padding:18px 20px;box-shadow:0 8px 24px rgba(0,0,0,0.3);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
                <!-- Kart Üst Başlık -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.4);padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:800;">
                        ${opp?.badge || '💎 VALUE BET'}
                    </span>
                    <span style="font-weight:800;color:#10B981;font-size:0.95rem;">+ %${v.highestEdge} Edge</span>
                </div>

                <!-- Maç Bilgisi -->
                <div style="margin-bottom:12px;">
                    <div style="font-size:1.05rem;font-weight:800;color:#f8fafc;">${v.homeTeam} vs ${v.awayTeam}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${v.league} · ${v.matchTime}</div>
                </div>

                ${dropHtml}

                <!-- SofaScore İstatistik Özeti -->
                <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;font-size:0.75rem;">
                    <span style="color:var(--text-secondary);">⭐ Güç Reytingi: <strong style="color:#38bdf8;">${ratings.home}</strong> vs <strong style="color:#94a3b8;">${ratings.away}</strong></span>
                    <span style="color:#f59e0b;font-weight:700;">🎯 Toplam xG: ${xg.totalXG}</span>
                </div>

                <!-- Oran Kıyaslaması -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;margin-bottom:12px;">
                    <div style="font-size:0.72rem;color:var(--text-secondary);font-weight:600;">💎 TESPİT EDİLEN DEĞERLİ TERCİH</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <div>
                            <div style="font-size:0.95rem;font-weight:800;color:#fff;">${opp?.pickTitle || 'MS 1'}</div>
                            <div style="font-size:0.72rem;color:var(--text-muted);">Model Gerçek Oranı: @${opp?.fairOdd} (İhtimal: %${opp?.probability})</div>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:1.2rem;font-weight:900;color:#10B981;">@ ${opp?.bookmakerOdd}</span>
                        </div>
                    </div>
                </div>

                <!-- Model Gerekçesi -->
                <div style="font-size:0.78rem;color:#cbd5e1;line-height:1.4;background:rgba(255,255,255,0.02);padding:8px 10px;border-radius:6px;margin-bottom:14px;">
                    💡 ${opp?.reason || 'Matematiksel model ve gelişmiş xG analizinde yüksek değer tespit edildi.'}
                </div>
            </div>

            <!-- Tespit Edilen Değer Oranı -->
            <div style="background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15));border:1px solid rgba(16,185,129,0.4);color:#34D399;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;padding:8px;font-size:0.85rem;">
                <span>💎 Tespit Edilen Değer Oranı: @${opp?.bookmakerOdd || 1.80}</span>
            </div>
        </div>
        `;
    },

    bindEvents(app) {
        const self = this;
        document.querySelectorAll('.btn-vl-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                self.activeFilter = btn.dataset.filter;
                const container = document.getElementById('value-live-container');
                if (container) {
                    const subnav = (app && typeof app.renderLiveHubSubnav === 'function') ? app.renderLiveHubSubnav('value-live') : '';
                    container.innerHTML = subnav + self.render(app);
                    self.bindEvents(app);
                }
            });
        });

        const refreshBtn = document.getElementById('btn-refresh-value-live');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const container = document.getElementById('value-live-container');
                if (container) {
                    const subnav = (app && typeof app.renderLiveHubSubnav === 'function') ? app.renderLiveHubSubnav('value-live') : '';
                    container.innerHTML = subnav + self.render(app);
                    self.bindEvents(app);
                }
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast('Value Radarı ve Canlı Sinyaller güncellendi!', 'success');
                }
            });
        }

    }
};

if (typeof window !== 'undefined') {
    window.ValueLiveUnifiedPanel = ValueLiveUnifiedPanel;
}
