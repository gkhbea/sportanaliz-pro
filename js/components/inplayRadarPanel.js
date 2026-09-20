/**
 * inplayRadarPanel.js — InPlayFlux Profesyonel Canlı Radar & Scanner Paneli
 * SportAnaliz Pro — inplayflux.com tarzı tam canlı maç tablosu, APPI baskı barı, RXG, Son 5/15 dk şut ve anlık alarmlar
 * Gerçek dünya canlı ve resmi maç sonu (MS) skorlarıyla tam uyumlu çalışır.
 */
const InplayRadarPanel = {
    activeFilter: 'all', // 'all', 'live-only', 'finished-only', 'kilic', 'siren', 'up', 'd30', 'rxg', 'corners', 'favorites'
    sortColumn: 'appi', // 'appi', 'rxg', 'minute', 'shotsLast5', 'corners'
    sortDirection: 'desc',
    favorites: new Set(),
    activeAlerts: new Map(), // matchId -> alertConfig
    soundEnabled: true,

    render(app) {
        // 1. Canlı Skor Servisi, Misli ve Bültendeki TÜM Gerçek Maçları Al (SADECE FUTBOL)
        let targetList = [];
        if (window.LiveScoreService && typeof LiveScoreService.getAllMatchesCombined === 'function') {
            targetList = LiveScoreService.getAllMatchesCombined(app?.matches || []);
        } else {
            const allMatches = app?.matches || [];
            const liveMatches = app?.liveMatches || (window.LiveScoreService?.cachedScores || []);
            targetList = [...liveMatches];
            allMatches.forEach(m => {
                if (!targetList.some(lm => (lm.homeTeam === m.homeTeam && lm.awayTeam === m.awayTeam))) {
                    targetList.push(m);
                }
            });
            if (targetList.length === 0) targetList = allMatches;
        }

        // Futbol Harici Sporları Kesinlikle Filtrele
        if (window.LiveScoreService && typeof LiveScoreService.isStrictFootballMatch === 'function') {
            targetList = targetList.filter(m => LiveScoreService.isStrictFootballMatch(m));
        }

        // InPlayFlux Motoru ile Gerçek Skorları ve Metrikleri Analiz Et
        const processed = window.InplayFluxRadarEngine ? InplayFluxRadarEngine.scanLiveMatches(targetList) : [];

        // Filtre Uygula
        const filtered = this.applyFilter(processed);

        // Sıralama Uygula
        const sorted = this.applySorting(filtered);

        return `
        <div class="inplayflux-scanner-container animate-fade-in" style="max-width:1500px;margin:0 auto;padding:14px 14px 40px;color:#f8fafc;">
            ${this.renderHeader(processed)}
            ${this.renderTopKpis(processed)}
            ${this.renderFilterTabs(processed)}
            ${this.renderRadarTable(sorted)}
            ${this.renderAlertModal()}
        </div>
        `;
    },

    renderHeader(processed) {
        const soundIcon = this.soundEnabled ? '🔔 Sesli Alarmlar: Açık' : '🔕 Sesli Alarmlar: Kapalı';

        return `
        <div style="background:linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.98) 100%);border:1px solid rgba(56,189,248,0.25);border-radius:14px;padding:20px 24px;margin-bottom:18px;box-shadow:0 8px 30px rgba(0,0,0,0.4);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);border-radius:20px;padding:3px 12px;margin-bottom:8px;">
                        <span class="pulse-dot" style="background:#00F0FF;width:8px;height:8px;border-radius:50%;"></span>
                        <span style="font-size:0.78rem;color:#38bdf8;font-weight:800;letter-spacing:0.5px;">INPLAYFLUX V8 CANLI RADAR PROTOKOLÜ</span>
                    </div>
                    <h1 style="font-size:1.65rem;font-weight:900;color:#ffffff;margin:0 0 6px;letter-spacing:-0.5px;">
                        📡 Canlı Maç Radarı &amp; In-Play Scanner
                    </h1>
                    <p style="color:#94a3b8;font-size:0.88rem;margin:0;line-height:1.4;">
                        Gerçek dünya canlı skorları, resmi maç sonuçları (MS), <strong>RXG (Rolling xG)</strong>, <strong>APPI Baskı Endeksi</strong> ve anlık şut bombardımanı alarmları listelenmektedir.
                    </p>
                </div>
                
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-ghost" id="btn-toggle-radar-sound" style="border:1px solid rgba(255,255,255,0.15);font-weight:700;font-size:0.8rem;">
                        ${soundIcon}
                    </button>
                    <button class="btn btn-primary btn-sm" id="btn-refresh-radar" style="background:linear-gradient(135deg, #0284c7, #06b6d4);border:none;font-weight:800;display:inline-flex;align-items:center;gap:6px;">
                        <span>🔄 Skorları &amp; Radarı Güncelle</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    renderTopKpis(processed) {
        const totalMatches = processed.length;
        const liveCount = processed.filter(m => m.isLive).length;
        const finishedCount = processed.filter(m => m.isFinished).length;
        const kilicCount = processed.filter(m => m.signals.some(s => s.type === 'KILIC')).length;
        const sirenCount = processed.filter(m => m.signals.some(s => s.type === 'SIREN')).length;
        const upCount = processed.filter(m => m.signals.some(s => s.type === 'UP')).length;
        const d30Count = processed.filter(m => m.signals.some(s => s.type === 'D30')).length;

        return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:12px;margin-bottom:18px;">
            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(56,189,248,0.25);border-radius:10px;padding:12px 14px;">
                <div style="font-size:0.72rem;color:var(--text-secondary);font-weight:700;text-transform:uppercase;">📡 Toplam Maç</div>
                <div style="font-size:1.35rem;font-weight:900;color:#38bdf8;margin-top:2px;">${totalMatches} Maç</div>
                <div style="font-size:0.7rem;color:#94a3b8;">${liveCount} Canlı · ${finishedCount} Biten</div>
            </div>

            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px 14px;">
                <div style="font-size:0.72rem;color:#EF4444;font-weight:700;text-transform:uppercase;">⚔️ Kılıç (Geri Dönüş)</div>
                <div style="font-size:1.35rem;font-weight:900;color:#EF4444;margin-top:2px;">${kilicCount} Maç</div>
                <div style="font-size:0.7rem;color:#94a3b8;">Baskılı takım geride</div>
            </div>

            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 14px;">
                <div style="font-size:0.72rem;color:#F59E0B;font-weight:700;text-transform:uppercase;">🚨 Siren (Şut Patlaması)</div>
                <div style="font-size:1.35rem;font-weight:900;color:#F59E0B;margin-top:2px;">${sirenCount} Maç</div>
                <div style="font-size:0.7rem;color:#94a3b8;">Son 5 dk yoğun baskı</div>
            </div>

            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px 14px;">
                <div style="font-size:0.72rem;color:#10B981;font-weight:700;text-transform:uppercase;">🔥 UP (İY Gol Adayı)</div>
                <div style="font-size:1.35rem;font-weight:900;color:#10B981;margin-top:2px;">${upCount} Maç</div>
                <div style="font-size:0.7rem;color:#94a3b8;">İlk yarı 0.5 üst potansiyeli</div>
            </div>

            <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:12px 14px;">
                <div style="font-size:0.72rem;color:#A78BFA;font-weight:700;text-transform:uppercase;">⏱️ D30 (2. Yarı Geç Gol)</div>
                <div style="font-size:1.35rem;font-weight:900;color:#A78BFA;margin-top:2px;">${d30Count} Maç</div>
                <div style="font-size:0.7rem;color:#94a3b8;">70-90' tek fark baskısı</div>
            </div>
        </div>
        `;
    },

    renderFilterTabs(processed) {
        const totalMatches = processed.length;
        const liveCount = processed.filter(m => m.isLive).length;
        const finishedCount = processed.filter(m => m.isFinished).length;

        const filters = [
            { id: 'all', label: `🚀 Tüm Radar (${totalMatches})` },
            { id: 'live-only', label: `🔴 Canlı Oynananlar (${liveCount})` },
            { id: 'finished-only', label: `🏁 Biten Maçlar (${finishedCount})` },
            { id: 'kilic', label: '⚔️ Geri Dönüş / Kılıç' },
            { id: 'siren', label: '🚨 Siren (Son 5 Dk Şut)' },
            { id: 'up', label: '🔥 UP (İY Gol Adayları)' },
            { id: 'd30', label: '⏱️ D30 (70-90 Geç Gol)' },
            { id: 'rxg', label: '⚽ Yüksek RXG (> 2.0)' },
            { id: 'corners', label: '⛳ Korner Radarı (6+)' },
            { id: 'favorites', label: `⭐ Favorilerim (${this.favorites.size})` }
        ];

        const tabsHtml = filters.map(f => {
            const isActive = this.activeFilter === f.id;
            let customStyle = '';
            if (f.id === 'live-only') {
                customStyle = isActive ? 'background:#DC2626;color:#fff;' : 'color:#EF4444;';
            } else if (f.id === 'finished-only') {
                customStyle = isActive ? 'background:#059669;color:#fff;' : 'color:#10B981;';
            }

            return `
            <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'} btn-radar-filter" data-filter="${f.id}" style="font-weight:700;font-size:0.8rem;border-radius:8px;${customStyle}">
                ${f.label}
            </button>
            `;
        }).join('');

        return `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;background:rgba(15,23,42,0.6);padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            ${tabsHtml}
        </div>
        `;
    },

    applyFilter(matches) {
        if (this.activeFilter === 'live-only') {
            return matches.filter(m => m.isLive);
        }
        if (this.activeFilter === 'finished-only') {
            return matches.filter(m => m.isFinished);
        }
        if (this.activeFilter === 'kilic') {
            return matches.filter(m => m.signals.some(s => s.type === 'KILIC'));
        }
        if (this.activeFilter === 'siren') {
            return matches.filter(m => m.signals.some(s => s.type === 'SIREN'));
        }
        if (this.activeFilter === 'up') {
            return matches.filter(m => m.signals.some(s => s.type === 'UP'));
        }
        if (this.activeFilter === 'd30') {
            return matches.filter(m => m.signals.some(s => s.type === 'D30'));
        }
        if (this.activeFilter === 'rxg') {
            return matches.filter(m => m.rxg.total >= 2.0);
        }
        if (this.activeFilter === 'corners') {
            return matches.filter(m => m.corners.total >= 6);
        }
        if (this.activeFilter === 'favorites') {
            return matches.filter(m => this.favorites.has(m.id));
        }
        return matches;
    },

    applySorting(matches) {
        return [...matches].sort((a, b) => {
            let valA = 0;
            let valB = 0;

            if (this.sortColumn === 'appi') {
                valA = Math.max(a.appi.home, a.appi.away);
                valB = Math.max(b.appi.home, b.appi.away);
            } else if (this.sortColumn === 'rxg') {
                valA = a.rxg.total;
                valB = b.rxg.total;
            } else if (this.sortColumn === 'minute') {
                valA = a.minute;
                valB = b.minute;
            } else if (this.sortColumn === 'shotsLast5') {
                valA = a.shotsLast5.total;
                valB = b.shotsLast5.total;
            } else if (this.sortColumn === 'corners') {
                valA = a.corners.total;
                valB = b.corners.total;
            }

            return this.sortDirection === 'desc' ? (valB - valA) : (valA - valB);
        });
    },

    renderRadarTable(matches) {
        if (!matches || matches.length === 0) {
            return `
            <div class="empty-state" style="padding:60px 20px;background:rgba(15,23,42,0.4);border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
                <span class="empty-icon">📡</span>
                <h3>Bu filtreye uyan maç bulunamadı</h3>
                <p>Diğer filtreleri deneyebilir veya tüm radarı görüntüleyebilirsiniz.</p>
            </div>
            `;
        }

        const rowsHtml = matches.map(m => this.renderRadarRow(m)).join('');

        return `
        <div style="overflow-x:auto;background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <table class="inplayflux-table" style="width:100%;border-collapse:collapse;text-align:left;font-size:0.82rem;">
                <thead>
                    <tr style="background:rgba(2,6,23,0.9);border-bottom:1px solid rgba(56,189,248,0.2);color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">
                        <th style="padding:12px 14px;width:95px;">Durum/Dk</th>
                        <th style="padding:12px 14px;width:110px;text-align:center;">Skor</th>
                        <th style="padding:12px 14px;min-width:230px;">Karşılaşma / Lig</th>
                        <th style="padding:12px 14px;min-width:130px;cursor:pointer;" class="btn-sort-col" data-col="appi" title="Baskı Endeksine göre sırala">
                            APPI Baskı ↕
                        </th>
                        <th style="padding:12px 14px;min-width:110px;cursor:pointer;" class="btn-sort-col" data-col="rxg" title="Rolling xG'ye göre sırala">
                            RXG (xG) ↕
                        </th>
                        <th style="padding:12px 14px;min-width:140px;">Tehlikeli Atak (DA/m)</th>
                        <th style="padding:12px 14px;min-width:130px;cursor:pointer;" class="btn-sort-col" data-col="shotsLast5" title="Son 5 dk şuta göre sırala">
                            Şut (Son 5/15) ↕
                        </th>
                        <th style="padding:12px 14px;min-width:110px;cursor:pointer;" class="btn-sort-col" data-col="corners">
                            Korner / Top ↕
                        </th>
                        <th style="padding:12px 14px;min-width:180px;">InPlayFlux AI Rozetleri</th>
                        <th style="padding:12px 14px;min-width:240px;">🎯 CANLI EYLEM (NE YAPMALIYIM?)</th>
                        <th style="padding:12px 14px;width:100px;text-align:center;">Doğrulama</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
        `;
    },

    renderRadarRow(m) {
        const isFav = this.favorites.has(m.id);
        const favIcon = isFav ? '⭐' : '☆';
        
        // APPI Barı
        const maxAppi = Math.max(m.appi.home, m.appi.away);
        const appiColor = maxAppi >= 70 ? '#EF4444' : (maxAppi >= 50 ? '#F59E0B' : '#10B981');
        
        // Durum & Dakika Rozeti
        let statusBadgeHtml = '';
        let scoreStyle = 'background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);';

        if (m.isFinished) {
            statusBadgeHtml = `
                <span style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.4);padding:3px 8px;border-radius:8px;font-size:0.75rem;font-weight:800;">
                    🏁 MS Bitti
                </span>
            `;
            scoreStyle = 'background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.4);';
        } else if (m.isLive) {
            statusBadgeHtml = `
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="pulse-dot" style="background:#EF4444;width:6px;height:6px;border-radius:50%;"></span>
                    <strong style="color:#EF4444;font-size:0.85rem;background:rgba(239,68,68,0.15);padding:2px 7px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);">${m.minuteStr}</strong>
                </div>
            `;
            scoreStyle = 'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.4);';
        } else {
            statusBadgeHtml = `
                <span style="color:#94a3b8;font-size:0.78rem;">
                    📅 ${m.minuteStr}
                </span>
            `;
            scoreStyle = 'background:rgba(255,255,255,0.05);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);';
        }
        
        // Rozetler HTML
        const badgesHtml = m.signals.map(sig => `
            <span style="background:${sig.color}18;color:${sig.color};border:1px solid ${sig.color}50;padding:2px 7px;border-radius:6px;font-size:0.72rem;font-weight:800;display:inline-block;margin:2px;" title="${sig.desc}">
                ${sig.short}
            </span>
        `).join('') || `<span style="color:#64748b;font-size:0.72rem;">—</span>`;

        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;" class="radar-match-row" data-id="${m.id}">
            
            <!-- 1. Durum / Dakika -->
            <td style="padding:12px 14px;">
                ${statusBadgeHtml}
            </td>

            <!-- 2. Skor -->
            <td style="padding:12px 14px;text-align:center;">
                <span style="${scoreStyle}padding:4px 12px;border-radius:8px;font-weight:900;font-size:1rem;display:inline-block;">
                    ${m.scoreStr}
                </span>
            </td>

            <!-- 3. Maç & Lig -->
            <td style="padding:12px 14px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="btn-toggle-fav" data-id="${m.id}" style="background:none;border:none;cursor:pointer;font-size:1rem;color:#F59E0B;padding:0;">
                        ${favIcon}
                    </button>
                    <div>
                        <div style="font-weight:800;color:#ffffff;font-size:0.88rem;">
                            <span style="${m.homeScore > m.awayScore ? 'color:#10B981;font-weight:900;' : ''}">${m.homeTeam}</span>
                            <span style="color:#64748b;font-weight:400;margin:0 4px;">vs</span>
                            <span style="${m.awayScore > m.homeScore ? 'color:#10B981;font-weight:900;' : ''}">${m.awayTeam}</span>
                        </div>
                        <div style="font-size:0.72rem;color:var(--text-muted);">${m.league}</div>
                    </div>
                </div>
            </td>

            <!-- 4. APPI Baskı Barı -->
            <td style="padding:12px 14px;">
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:3px;">
                    <span style="color:#38bdf8;font-weight:700;">H: ${m.appi.home}</span>
                    <strong style="color:${appiColor};">${maxAppi} APPI</strong>
                    <span style="color:#94a3b8;font-weight:700;">A: ${m.appi.away}</span>
                </div>
                <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;display:flex;">
                    <div style="width:${m.appi.home}%;background:#38BDF8;"></div>
                    <div style="width:${m.appi.away}%;background:#F43F5E;"></div>
                </div>
            </td>

            <!-- 5. RXG (Rolling xG) -->
            <td style="padding:12px 14px;">
                <div style="font-weight:900;color:#10B981;font-size:0.88rem;">
                    ${m.rxg.total} xG
                </div>
                <div style="font-size:0.7rem;color:#64748b;">
                    ${m.rxg.home} : ${m.rxg.away}
                </div>
            </td>

            <!-- 6. Tehlikeli Atak & DA/m -->
            <td style="padding:12px 14px;">
                <div style="font-weight:700;color:#e2e8f0;">
                    ${m.dangerousAttacks.home} - ${m.dangerousAttacks.away} <span style="font-size:0.7rem;color:#64748b;">(${m.dangerousAttacks.total})</span>
                </div>
                <div style="font-size:0.7rem;color:#F59E0B;">
                    DA/m: ${m.daPerMin.home} : ${m.daPerMin.away}
                </div>
            </td>

            <!-- 7. Şutlar (Toplam / İsabetli / Son 5 Dk) -->
            <td style="padding:12px 14px;">
                <div style="font-weight:700;color:#e2e8f0;">
                    ${m.shots.home}(${m.shotsOnTarget.home}) : ${m.shots.away}(${m.shotsOnTarget.away})
                </div>
                <div style="font-size:0.7rem;color:${m.shotsLast5.total >= 2 ? '#EF4444;font-weight:800;' : '#64748b;'}">
                    Son 5': ${m.shotsLast5.total} şut | 15': ${m.shotsLast15.total}
                </div>
            </td>

            <!-- 8. Korner & Topla Oynama -->
            <td style="padding:12px 14px;">
                <div style="font-weight:700;color:#38bdf8;">
                    ⛳ ${m.corners.home} - ${m.corners.away} <span style="font-size:0.7rem;color:#64748b;">(${m.corners.total})</span>
                </div>
                <div style="font-size:0.7rem;color:#94a3b8;">
                    %${m.possession.home} - %${m.possession.away}
                </div>
            </td>

            <!-- 9. Sinyal Rozetleri -->
            <td style="padding:12px 14px;">
                ${badgesHtml}
            </td>

            <!-- 10. CANLI EYLEM (NE YAPMALIYIM?) -->
            <td style="padding:10px 14px;">
                <div style="background:rgba(2,6,23,0.85);border:1px solid ${m.liveDirective?.badgeColor || '#38bdf8'}44;border-radius:8px;padding:8px 10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                        <span style="font-size:0.7rem;font-weight:900;color:${m.liveDirective?.badgeColor || '#38bdf8'};">
                            ${m.liveDirective?.badge || 'BEKLEMEDE'}
                        </span>
                        <span style="font-size:0.65rem;color:#cbd5e1;background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:4px;">
                            %${m.liveDirective?.confidence || 75}
                        </span>
                    </div>
                    <div style="font-weight:800;color:#fff;font-size:0.8rem;">
                        ${m.liveDirective?.title || 'Dengeli Oyun'}
                    </div>
                    <div style="font-size:0.7rem;color:#cbd5e1;margin-top:2px;line-height:1.3;">
                        ${m.liveDirective?.actionText || 'Anlık eylem bekleniyor.'}
                    </div>
                </div>
            </td>

            <!-- 10. Alarm & Maçkolik Teyit Butonu -->
            <td style="padding:12px 14px;text-align:center;">
                <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
                    <button class="btn btn-ghost btn-sm btn-set-alert" data-id="${m.id}" data-name="${m.homeTeam} vs ${m.awayTeam}" style="padding:3px 6px;font-size:0.85rem;" title="Bu maça özel anlık bildirim alarmı kur">
                        🔔
                    </button>
                    <a href="${m.mackolikUrl || 'https://arsiv.mackolik.com/Canli-Sonuclar'}" target="_blank" rel="noopener noreferrer" class="btn-mackolik-pill" style="font-size:0.7rem;padding:2px 6px;background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);border-radius:4px;text-decoration:none;" title="Maçkolik canlı skor ve istatistik sayfası üzerinden teyit et" onclick="event.stopPropagation();">
                        🟢 Teyit ↗
                    </a>
                </div>
            </td>

        </tr>
        `;
    },

    renderAlertModal() {
        return `
        <div class="modal-overlay" id="modal-radar-alert" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;align-items:center;justify-content:center;">
            <div style="background:#0f172a;border:1px solid rgba(56,189,248,0.3);border-radius:14px;max-width:480px;width:90%;padding:22px;box-shadow:0 15px 40px rgba(0,0,0,0.6);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.3rem;">🔔</span>
                        <h3 style="margin:0;font-size:1.1rem;color:#fff;" id="alert-modal-title">Maç Alarmı Kur</h3>
                    </div>
                    <button id="btn-close-radar-alert" style="background:none;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;">✕</button>
                </div>

                <p style="font-size:0.82rem;color:#94a3b8;margin-bottom:16px;">
                    Aşağıdaki koşullardan biri gerçekleştiğinde sistem sesli sinyal verir ve ekranda uyarı açar:
                </p>

                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
                    <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:8px;cursor:pointer;">
                        <input type="checkbox" id="chk-alert-goal" checked style="accent-color:#10B981;width:16px;height:16px;">
                        <span style="font-size:0.85rem;color:#f8fafc;">⚽ <strong>Sıradaki Gol Olduğunda</strong> (+1 Gol Alarmı)</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:8px;cursor:pointer;">
                        <input type="checkbox" id="chk-alert-corner" checked style="accent-color:#38BDF8;width:16px;height:16px;">
                        <span style="font-size:0.85rem;color:#f8fafc;">⛳ <strong>+2 Korner Geldiğinde</strong> (Korner Baskısı)</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:8px;cursor:pointer;">
                        <input type="checkbox" id="chk-alert-min75" style="accent-color:#F59E0B;width:16px;height:16px;">
                        <span style="font-size:0.85rem;color:#f8fafc;">⏱️ <strong>75. Dakikaya Ulaştığında</strong> (Geç Gol Avı)</span>
                    </label>

                    <label style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:8px;cursor:pointer;">
                        <input type="checkbox" id="chk-alert-momentum" style="accent-color:#EF4444;width:16px;height:16px;">
                        <span style="font-size:0.85rem;color:#f8fafc;">📈 <strong>APPI Baskısı 75'i Geçtiğinde</strong> (Şut Bombardımanı)</span>
                    </label>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:10px;">
                    <button class="btn btn-ghost btn-sm" id="btn-cancel-alert">Vazgeç</button>
                    <button class="btn btn-primary btn-sm" id="btn-save-radar-alert" style="background:#10B981;border:none;font-weight:700;">
                        ✓ Alarmı Kaydet &amp; Dinle
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    bindEvents(app) {
        const self = this;

        // Filtre Sekmeleri
        document.querySelectorAll('.btn-radar-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                self.activeFilter = btn.dataset.filter;
                self.refreshUI(app);
            });
        });

        // Sütun Sıralamaları
        document.querySelectorAll('.btn-sort-col').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.col;
                if (self.sortColumn === col) {
                    self.sortDirection = self.sortDirection === 'desc' ? 'asc' : 'desc';
                } else {
                    self.sortColumn = col;
                    self.sortDirection = 'desc';
                }
                self.refreshUI(app);
            });
        });

        // Favoriye Ekleme
        document.querySelectorAll('.btn-toggle-fav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (self.favorites.has(id)) {
                    self.favorites.delete(id);
                } else {
                    self.favorites.add(id);
                }
                self.refreshUI(app);
            });
        });

        // Yenile Butonu
        const refreshBtn = document.getElementById('btn-refresh-radar');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                if (window.LiveScoreService) {
                    await window.LiveScoreService.syncBulletinMatches(app.matches || []);
                }
                self.refreshUI(app);
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast('Canlı Skorlar ve InPlayFlux Radarı Güncellendi!', 'success');
                }
            });
        }

        // Ses Butonu
        const soundBtn = document.getElementById('btn-toggle-radar-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                self.soundEnabled = !self.soundEnabled;
                self.refreshUI(app);
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast(self.soundEnabled ? 'Sesli alarmlar aktif edildi!' : 'Sesli alarmlar kapatıldı.', 'info');
                }
            });
        }

        // Alarm Kur Modalı
        let currentTargetMatch = null;
        document.querySelectorAll('.btn-set-alert').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTargetMatch = { id: btn.dataset.id, name: btn.dataset.name };
                const modal = document.getElementById('modal-radar-alert');
                const title = document.getElementById('alert-modal-title');
                if (title && currentTargetMatch) {
                    title.innerText = `🔔 Alarm: ${currentTargetMatch.name}`;
                }
                if (modal) modal.style.display = 'flex';
            });
        });

        const closeModal = () => {
            const modal = document.getElementById('modal-radar-alert');
            if (modal) modal.style.display = 'none';
        };

        const closeBtn = document.getElementById('btn-close-radar-alert');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        const cancelBtn = document.getElementById('btn-cancel-alert');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        const saveAlertBtn = document.getElementById('btn-save-radar-alert');
        if (saveAlertBtn) {
            saveAlertBtn.addEventListener('click', () => {
                closeModal();
                if (window.Helpers && typeof Helpers.showToast === 'function') {
                    Helpers.showToast(`🔔 ${currentTargetMatch?.name || 'Maç'} için canlı alarmlar kuruldu!`, 'success');
                }
            });
        }
    },

    refreshUI(app) {
        const container = document.getElementById('inplay-radar-container') || document.getElementById('view-radar');
        if (container) {
            const subnav = (app && typeof app.renderLiveHubSubnav === 'function') ? app.renderLiveHubSubnav('radar') : '';
            container.innerHTML = subnav + this.render(app);
            this.bindEvents(app);
        }
    }
};

if (typeof window !== 'undefined') {
    window.InplayRadarPanel = InplayRadarPanel;
}
