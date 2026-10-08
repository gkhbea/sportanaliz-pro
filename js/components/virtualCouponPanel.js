/**
 * SPORTANALIZ PRO - Sanal Kupon & Günlük Kupon Arşivi Sistemi
 * Oynanan kuponların gün gün tutulması, canlı ve resmi maç sonuçlarıyla otomatik takibi
 */

const VirtualCouponManager = {
    STORAGE_KEY_WALLET: 'sa_virtual_wallet_v2',
    STORAGE_KEY_COUPONS: 'sa_virtual_coupons_v2',
    STORAGE_KEY_SLIP: 'sa_virtual_slip_v2',

    getLocalDateString(d = new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    // Kasa / Cüzdan Bilgisini Getir
    getWallet() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_WALLET);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Sanal cüzdan okuma hatası:', e);
        }
        const defaultWallet = {
            initialBalance: 10000,
            currentBalance: 14547, // 09 - 19 Eylül tüm kümülatif kazançları dahil
            createdAt: new Date().toISOString()
        };
        this.saveWallet(defaultWallet);
        return defaultWallet;
    },

    saveWallet(wallet) {
        try {
            localStorage.setItem(this.STORAGE_KEY_WALLET, JSON.stringify(wallet));
        } catch (e) {
            console.error('Sanal cüzdan kaydetme hatası:', e);
        }
        // Supabase Cloud Senkronizasyonu (Arka Planda)
        if (typeof window !== 'undefined' && window.DbService && typeof DbService.saveWallet === 'function') {
            DbService.saveWallet(wallet).catch(err => {
                console.warn('Supabase cüzdan senkronizasyon uyarısı:', err);
            });
        }
    },

    resetWallet(newBalance = 10000) {
        const val = Math.max(100, parseFloat(newBalance) || 10000);
        const wallet = {
            initialBalance: val,
            currentBalance: val,
            createdAt: new Date().toISOString()
        };
        this.saveWallet(wallet);
        return wallet;
    },

    // Oynanan Kuponları Getir (Geçmiş kuponları otomatik senkronize eder)
    getCoupons() {
        let stored = [];
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_COUPONS);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) stored = list;
            }
        } catch (e) {
            console.error('Sanal kuponlar okuma hatası:', e);
        }

        // Tarihsel kuponları al (09 - 19 Eylül tüm arşivi)
        const seedList = this.seedHistoricalArchivedCoupons();

        // Eğer localStorage'da tarihsel kuponlar eksikse (örn. eski kuponlar henüz yüklenmemişse), bunları güvenle birleştir
        const existingIds = new Set(stored.map(c => c.id));
        let added = false;
        seedList.forEach(seedCoupon => {
            if (!existingIds.has(seedCoupon.id)) {
                stored.push(seedCoupon);
                existingIds.add(seedCoupon.id);
                added = true;
            }
        });

        // Tarihe göre yeniden eskiye sırala
        stored.sort((a, b) => {
            const dateA = a.archiveDate || (a.createdAt ? a.createdAt.slice(0, 10) : '');
            const dateB = b.archiveDate || (b.createdAt ? b.createdAt.slice(0, 10) : '');
            return dateB.localeCompare(dateA);
        });

        if (added || stored.length === 0) {
            this.saveCoupons(stored);
        }

        return stored;
    },

    saveCoupons(coupons) {
        try {
            localStorage.setItem(this.STORAGE_KEY_COUPONS, JSON.stringify(coupons));
        } catch (e) {
            console.error('Sanal kuponlar kaydetme hatası:', e);
        }
        // Supabase Cloud Senkronizasyonu (Arka Planda)
        if (typeof window !== 'undefined' && window.DbService && typeof DbService.saveDailyCoupons === 'function') {
            DbService.saveDailyCoupons(coupons).catch(err => {
                console.warn('Supabase kupon senkronizasyon uyarısı:', err);
            });
        }
    },

    // Supabase Cloud'dan Kupon ve Kasa Senkronizasyonu (Telefon & PC Eşitleme)
    async syncFromSupabase() {
        if (typeof window === 'undefined' || !window.DbService) return;
        try {
            // 1. Cüzdanı eşitle
            if (typeof DbService.getWallet === 'function') {
                const cloudWallet = await DbService.getWallet();
                if (cloudWallet && cloudWallet.currentBalance) {
                    localStorage.setItem(this.STORAGE_KEY_WALLET, JSON.stringify(cloudWallet));
                }
            }

            // 2. Kuponları eşitle
            if (typeof DbService.getDailyCoupons === 'function') {
                const cloudCoupons = await DbService.getDailyCoupons(null);
                if (Array.isArray(cloudCoupons) && cloudCoupons.length > 0) {
                    let localCoupons = [];
                    try {
                        const raw = localStorage.getItem(this.STORAGE_KEY_COUPONS);
                        if (raw) localCoupons = JSON.parse(raw) || [];
                    } catch (e) {}

                    const localMap = new Map(localCoupons.map(c => [c.id, c]));
                    let updated = false;

                    cloudCoupons.forEach(cc => {
                        if (!localMap.has(cc.id)) {
                            localCoupons.push(cc);
                            localMap.set(cc.id, cc);
                            updated = true;
                        } else {
                            const existing = localMap.get(cc.id);
                            if (existing && existing.status !== cc.status && cc.status !== 'pending') {
                                existing.status = cc.status;
                                existing.payout = cc.payout;
                                existing.matches = cc.matches;
                                updated = true;
                            }
                        }
                    });

                    if (updated) {
                        localCoupons.sort((a, b) => {
                            const dateA = a.archiveDate || (a.createdAt ? a.createdAt.slice(0, 10) : '');
                            const dateB = b.archiveDate || (b.createdAt ? b.createdAt.slice(0, 10) : '');
                            return dateB.localeCompare(dateA);
                        });
                        localStorage.setItem(this.STORAGE_KEY_COUPONS, JSON.stringify(localCoupons));
                    }
                }
            }
        } catch (err) {
            console.warn('VirtualCouponManager.syncFromSupabase hatası:', err);
        }
    },

    // Teyitli Dünün ve Geçmiş Tüm Günlerin (09-19 Eylül) Oynanan Kupon Arşivini Oluştur
    seedHistoricalArchivedCoupons() {
        const seedList = [];
        if (typeof window !== 'undefined' && window.HistoricalCouponsService && typeof HistoricalCouponsService.getAllCouponSets === 'function') {
            const sets = HistoricalCouponsService.getAllCouponSets('2026-09-09');
            sets.forEach(set => {
                (set.coupons || []).forEach((c, idx) => {
                    const allWon = (c.matches || []).length > 0 && (c.matches || []).every(m => m.resultStatus === 'won');
                    const anyLost = (c.matches || []).some(m => m.resultStatus === 'lost');
                    const hasLive = (c.matches || []).some(m => m.resultStatus === 'live' || m.scoreData?.status === 'LIVE');

                    let status = 'pending';
                    if (allWon) status = 'won';
                    else if (anyLost) status = 'lost';
                    else if (hasLive) status = 'live';
                    else status = 'pending';

                    const isWon = status === 'won';
                    const isLost = status === 'lost';
                    const stake = c.recommendedStake || 100;
                    const totalOdds = parseFloat(c.totalOdd) || 2.0;
                    const potentialReturn = Math.round(stake * totalOdds * 100) / 100;
                    const payout = isWon ? potentialReturn : 0;
                    const netProfit = isWon ? (potentialReturn - stake) : (isLost ? -stake : 0);

                    const dateParts = set.date.split('-');
                    const dateFormatted = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;

                    seedList.push({
                        id: 'arch_vk_' + set.date + '_' + (idx + 1),
                        name: c.title || ('Kupon #' + (idx + 1)),
                        createdAt: `${set.date}T18:00:00.000Z`,
                        archiveDate: set.date,
                        dateStr: dateFormatted,
                        timeStr: '18:30',
                        stake: stake,
                        totalOdds: totalOdds,
                        potentialReturn: potentialReturn,
                        status: status,
                        payout: payout,
                        netProfit: netProfit,
                        isArchived: true,
                        matches: (c.matches || []).map(m => {
                            const h = m.homeTeam || (m.match && m.match.homeTeam) || '';
                            const a = m.awayTeam || (m.match && m.match.awayTeam) || '';
                            const hs = m.homeScore !== undefined ? m.homeScore : 0;
                            const as = m.awayScore !== undefined ? m.awayScore : 0;

                            let matchStatus = 'pending';
                            if (m.resultStatus === 'won') matchStatus = 'won';
                            else if (m.resultStatus === 'lost') matchStatus = 'lost';
                            else if (m.resultStatus === 'live' || m.scoreData?.status === 'LIVE') matchStatus = 'live';
                            else matchStatus = 'pending';

                            return {
                                matchId: m.iddaaCode || m.id || `${h}_${a}`,
                                homeTeam: h,
                                awayTeam: a,
                                league: m.league || 'Futbol Ligi',
                                matchTime: m.timeStr || '20:00',
                                betType: m.pickTitle || m.pick || 'MS 1',
                                odds: String(m.odd || 1.50),
                                status: matchStatus,
                                score: matchStatus === 'pending' ? 'v' : `${hs} - ${as}`
                            };
                        })
                    });
                });
            });
        }

        return seedList;
    },

    // Günlük Arşiv Tarihlerini ve O Günün İstatistik Özetlerini Döner
    getArchiveDates() {
        const coupons = this.getCoupons();
        const dateMap = new Map();
        const now = new Date();
        const todayStr = this.getLocalDateString(now);
        
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = this.getLocalDateString(yest);

        coupons.forEach(c => {
            const d = c.archiveDate || (c.createdAt ? c.createdAt.slice(0, 10) : todayStr);
            if (!dateMap.has(d)) {
                dateMap.set(d, {
                    date: d,
                    totalCoupons: 0,
                    wonCount: 0,
                    lostCount: 0,
                    pendingCount: 0,
                    totalStake: 0,
                    totalReturn: 0,
                    netProfit: 0
                });
            }
            const item = dateMap.get(d);
            item.totalCoupons++;
            item.totalStake += (c.stake || 0);
            if (c.status === 'won') {
                item.wonCount++;
                item.totalReturn += (c.payout || 0);
                item.netProfit += (c.netProfit || 0);
            } else if (c.status === 'lost') {
                item.lostCount++;
                item.netProfit += (c.netProfit || -c.stake);
            } else {
                item.pendingCount++;
            }
        });

        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

        const result = Array.from(dateMap.values()).map(d => {
            const isToday = d.date === todayStr;
            const isYesterday = d.date === yestStr;
            const dateParts = d.date.split('-');
            const dd = dateParts[2] || '';
            const mm = dateParts[1] || '';
            const mName = months[parseInt(mm, 10) - 1] || mm;

            const dateObj = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
            const dayName = dayNames[dateObj.getDay()] || '';

            let label = `${dd} ${mName} (${dayName})`;
            if (isToday) label = `Bugün (${dd}.${mm})`;
            else if (isYesterday) label = `Dün (${dd}.${mm})`;

            const winRate = d.totalCoupons > 0 ? Math.round((d.wonCount / d.totalCoupons) * 100) : 0;

            return {
                ...d,
                shortLabel: label,
                label: label,
                count: d.totalCoupons,
                won: d.wonCount,
                lost: d.lostCount,
                dateFormatted: `${dd} ${mName} 2026${isToday ? ' (Bugün)' : (isYesterday ? ' (Dün - ' + dayName + ')' : ' (' + dayName + ')')}`,
                isToday,
                isYesterday,
                winRate
            };
        });

        result.sort((a, b) => b.date.localeCompare(a.date));
        return result;
    },

    // Belirli bir arşiv tarihine ve durumuna göre kuponları filtrele
    getCouponsForArchive(archiveDate = 'all', statusFilter = 'all') {
        const coupons = this.getCoupons();
        const todayStr = this.getLocalDateString();

        return coupons.filter(c => {
            // Tarih kontrolü
            if (archiveDate && archiveDate !== 'all') {
                const cDate = c.archiveDate || (c.createdAt ? c.createdAt.slice(0, 10) : todayStr);
                if (cDate !== archiveDate) return false;
            }
            // Durum kontrolü
            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'pending' && c.status !== 'pending' && c.status !== 'live') return false;
                if (statusFilter === 'won' && c.status !== 'won') return false;
                if (statusFilter === 'lost' && c.status !== 'lost') return false;
            }
            return true;
        });
    },

    // Aktif Kupon Sepeti (Slip)
    getSlip() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_SLIP);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Sanal kupon sepeti okuma hatası:', e);
        }
        return {
            items: [],
            stake: 100,
            name: 'Günün Kuponu'
        };
    },

    saveSlip(slip) {
        try {
            localStorage.setItem(this.STORAGE_KEY_SLIP, JSON.stringify(slip));
        } catch (e) {
            console.error('Sanal kupon sepeti kaydetme hatası:', e);
        }
    },

    addSlipItem(item) {
        const slip = this.getSlip();
        if (!slip.items) slip.items = [];

        const existingIndex = slip.items.findIndex(i => i.matchId === item.matchId);
        if (existingIndex >= 0) {
            slip.items[existingIndex] = item;
        } else {
            slip.items.push(item);
        }

        this.saveSlip(slip);
        this.updateBadge();
    },

    removeFromSlip(matchId) {
        const slip = this.getSlip();
        if (!slip.items) return;
        slip.items = slip.items.filter(i => i.matchId !== matchId);
        this.saveSlip(slip);
        this.updateBadge();
    },

    /**
     * Günlük 5 Hazır Kuponu Kullanıcıya Sormadan Otomatik Oyna & Kasada Tut
     * "günlük kuponları kendin bana sormadan tut"
     */
    autoTrackDailyCoupons(dailyCoupons = []) {
        try {
            if (!Array.isArray(dailyCoupons) || dailyCoupons.length === 0) {
                if (window.CouponEngine && window.app?.matches && window.app.matches.length > 0) {
                    dailyCoupons = window.CouponEngine.generateDailyCoupons(window.app.matches);
                }
            }
            if (!Array.isArray(dailyCoupons) || dailyCoupons.length === 0) return;

            const todayIso = this.getLocalDateString();
            const stored = this.getCoupons();
            const wallet = this.getWallet();
            let changed = false;

            dailyCoupons.forEach((coupon, idx) => {
                if (!coupon) return;
                const autoId = 'auto_vk_' + todayIso + '_' + (coupon.id || (idx + 1));
                const existing = stored.find(c => c.id === autoId || (c.archiveDate === todayIso && c.name === coupon.title));

                const stake = parseFloat(coupon.recommendedStake) || 100;
                const totalOdds = parseFloat(coupon.totalOdd) || 2.0;
                const potentialReturn = Math.round(stake * totalOdds * 100) / 100;

                const matchesList = (coupon.matches || coupon.picks || []).map(m => {
                    const rawMatch = m.match || m;
                    const h = m.homeTeam || rawMatch.homeTeam || '';
                    const a = m.awayTeam || rawMatch.awayTeam || '';
                    const sc = window.MatchTracker ? window.MatchTracker.getMatchScore({ homeTeam: h, awayTeam: a, id: m.iddaaCode || m.id }) : null;
                    const hs = sc?.homeScore !== undefined ? sc.homeScore : (m.scoreData?.homeScore !== undefined ? m.scoreData.homeScore : 0);
                    const as = sc?.awayScore !== undefined ? sc.awayScore : (m.scoreData?.awayScore !== undefined ? m.scoreData.awayScore : 0);
                    const isFin = sc?.status === 'FINISHED' || m.scoreData?.status === 'FINISHED' || sc?.minute === 'MS';

                    let status = m.resultStatus || 'pending';
                    if (isFin) {
                        const bt = (m.pickTitle || m.pick || '').toUpperCase();
                        const fhH = sc?.firstHalfHome !== undefined ? sc.firstHalfHome : (m.scoreData?.firstHalfHome !== undefined ? m.scoreData.firstHalfHome : 0);
                        const fhA = sc?.firstHalfAway !== undefined ? sc.firstHalfAway : (m.scoreData?.firstHalfAway !== undefined ? m.scoreData.firstHalfAway : 0);

                        let won = false;
                        if (bt.includes('1/1')) won = (fhH > fhA) && (hs > as);
                        else if (bt.includes('X/1')) won = (fhH === fhA) && (hs > as);
                        else if (bt.includes('2/2')) won = (fhH < fhA) && (as > hs);
                        else if (bt.includes('X/2')) won = (fhH === fhA) && (as > hs);
                        else if (bt.includes('X/X')) won = (fhH === fhA) && (hs === as);
                        else if (bt.includes('MS 1') || bt === '1') won = hs > as;
                        else if (bt.includes('MS 2') || bt === '2') won = as > hs;
                        else if (bt.includes('MS X') || bt === 'X') won = hs === as;
                        else if (bt.includes('2.5 ÜST') || bt.includes('OVER25')) won = (hs + as) > 2;
                        else if (bt.includes('2.5 ALT') || bt.includes('UNDER25')) won = (hs + as) < 3;
                        else if (bt.includes('KG VAR') || bt.includes('BTTS')) won = hs > 0 && as > 0;
                        else if (bt.includes('1X')) won = hs >= as;
                        else if (bt.includes('X2')) won = as >= hs;
                        else won = true;
                        status = won ? 'won' : 'lost';
                    }

                    return {
                        matchId: m.iddaaCode || m.id || (h + '_vs_' + a),
                        homeTeam: h,
                        awayTeam: a,
                        league: m.league || 'Futbol',
                        matchTime: m.timeStr || '20:00',
                        betType: m.pickTitle || m.pick || 'MS 1',
                        odds: String(m.odd || 1.50),
                        status: status,
                        score: isFin ? (hs + ' - ' + as + ' (MS)') : (hs + ' - ' + as + ' (' + (sc?.minute || 'Başlamadı') + ')')
                    };
                });

                const allWon = matchesList.length > 0 && matchesList.every(m => m.status === 'won');
                const anyLost = matchesList.some(m => m.status === 'lost');
                const status = allWon ? 'won' : (anyLost ? 'lost' : 'pending');

                if (!existing) {
                    const autoCoupon = {
                        id: autoId,
                        name: coupon.title || ('Günün Kuponu #' + (idx + 1)),
                        createdAt: new Date().toISOString(),
                        archiveDate: todayIso,
                        dateStr: new Date().toLocaleDateString('tr-TR'),
                        timeStr: coupon.timeStr || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                        stake: stake,
                        totalOdds: totalOdds,
                        potentialReturn: potentialReturn,
                        status: status,
                        payout: status === 'won' ? potentialReturn : 0,
                        netProfit: status === 'won' ? (potentialReturn - stake) : -stake,
                        autoPlayed: true,
                        isArchived: true,
                        badge: coupon.badge || 'GÜNÜN KUPONU',
                        badgeType: coupon.badgeType || 'safe',
                        icon: coupon.icon || '🎯',
                        themeColor: coupon.themeColor || '#00F0FF',
                        matches: matchesList
                    };
                    stored.unshift(autoCoupon);
                    changed = true;
                } else {
                    // Durum değişimini senkronize et
                    if (existing.status !== status && status !== 'pending') {
                        existing.status = status;
                        existing.payout = status === 'won' ? potentialReturn : 0;
                        existing.netProfit = status === 'won' ? (potentialReturn - stake) : -stake;
                        existing.matches = matchesList;
                        changed = true;
                    }
                }
            });

            if (changed) {
                this.saveCoupons(stored);
                // Günün bülten kuponlarını da yerel hafızada mühürle
                try {
                    localStorage.setItem('sportanaliz_coupons_by_date_' + todayIso, JSON.stringify(dailyCoupons));
                } catch (e) {}
            }
        } catch (err) {
            console.warn('autoTrackDailyCoupons hatası:', err);
        }
    },

    addAiCouponToSlip(coupon) {
        if (!coupon) return;
        const slip = this.getSlip();
        (coupon.matches || coupon.picks || []).forEach(m => {
            const h = m.homeTeam || (m.match && m.match.homeTeam) || '';
            const a = m.awayTeam || (m.match && m.match.awayTeam) || '';
            this.addSlipItem({
                matchId: m.iddaaCode || m.id || (h + '_vs_' + a),
                homeTeam: h,
                awayTeam: a,
                league: m.league || 'Futbol',
                matchTime: m.timeStr || '20:00',
                betType: m.pickTitle || m.pick || 'MS 1',
                odds: m.odd || 1.50
            });
        });
        if (coupon.recommendedStake) {
            slip.stake = coupon.recommendedStake;
            this.saveSlip(slip);
        }
    },

    clearSlip() {
        const slip = this.getSlip();
        slip.items = [];
        this.saveSlip(slip);
        this.updateBadge();
    },

    // Kuponu Oyna / Bahsi Yatır ve Günlük Arşive Ekle
    placeBet(customName = null) {
        const slip = this.getSlip();
        if (!slip.items || slip.items.length === 0) {
            throw new Error('Kuponunuzda maç bulunmuyor!');
        }

        const stakeNum = parseFloat(slip.stake) || 100;
        if (stakeNum <= 0) {
            throw new Error('Lütfen geçerli bir bahis tutarı girin.');
        }

        const wallet = this.getWallet();
        if (wallet.currentBalance < stakeNum) {
            throw new Error(`Yetersiz bakiye! Mevcut: ${wallet.currentBalance.toLocaleString('tr-TR')} TL`);
        }

        let totalOdds = 1.0;
        slip.items.forEach(item => {
            totalOdds *= (parseFloat(item.odds) || 1.0);
        });
        totalOdds = Math.round(totalOdds * 100) / 100;
        const potentialReturn = Math.round(stakeNum * totalOdds * 100) / 100;

        const todayIso = this.getLocalDateString();
        const newCoupon = {
            id: 'vk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: customName || slip.name || `Kupon #${this.getCoupons().length + 1}`,
            createdAt: new Date().toISOString(),
            archiveDate: todayIso, // Günlük Kupon Arşiv Tarihi
            dateStr: new Date().toLocaleDateString('tr-TR'),
            timeStr: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            stake: stakeNum,
            totalOdds: totalOdds,
            potentialReturn: potentialReturn,
            status: 'pending', // pending, won, lost, live
            payout: 0,
            netProfit: -stakeNum,
            matches: slip.items.map(i => ({
                matchId: i.matchId,
                homeTeam: i.homeTeam,
                awayTeam: i.awayTeam,
                league: i.league,
                matchTime: i.matchTime,
                betType: i.betType,
                odds: i.odds,
                status: 'pending',
                score: null
            }))
        };

        // Bakiyeden düş
        wallet.currentBalance = Math.round((wallet.currentBalance - stakeNum) * 100) / 100;
        this.saveWallet(wallet);

        const coupons = this.getCoupons();
        coupons.unshift(newCoupon);
        this.saveCoupons(coupons);

        this.clearSlip();
        return newCoupon;
    },

    // Tekil Maç Tercihini Değerlendir
    evaluateSingleMatch(matchItem) {
        const home = matchItem.homeTeam || '';
        const away = matchItem.awayTeam || '';
        const betType = (matchItem.betType || '').toUpperCase().trim();

        let scoreData = null;
        if (window.MatchTracker) {
            scoreData = window.MatchTracker.getMatchScore({ homeTeam: home, awayTeam: away, id: matchItem.matchId });
        }

        if (!scoreData || scoreData.status === 'NOT_STARTED') {
            return {
                status: 'PENDING',
                isLive: false,
                isFinished: false,
                scoreStr: '0 - 0 (Başlamadı)'
            };
        }

        const hs = parseInt(scoreData.homeScore) || 0;
        const as = parseInt(scoreData.awayScore) || 0;
        const scoreStr = `${hs} - ${as} (${scoreData.minute || 'MS'})`;
        const isFin = scoreData.status === 'FINISHED';
        const isLive = scoreData.status === 'LIVE';

        let isWon = false;
        let isLost = false;

        if (betType === 'MS 1' || betType === '1' || betType.includes('EV SAHİBİ')) {
            if (isFin) isWon = hs > as;
            else if (isLive) isWon = hs > as;
        } else if (betType === 'MS 2' || betType === '2' || betType.includes('DEPLASMAN')) {
            if (isFin) isWon = as > hs;
            else if (isLive) isWon = as > hs;
        } else if (betType === 'MS X' || betType === 'BERABERLİK' || betType === 'X') {
            if (isFin) isWon = hs === as;
        } else if (betType === '1X ÇŞ' || betType.includes('1X')) {
            if (isFin) isWon = hs >= as;
        } else if (betType === 'X2 ÇŞ' || betType.includes('X2')) {
            if (isFin) isWon = as >= hs;
        } else if (betType.includes('2.5 ÜST') || betType.includes('2.5 OVER') || betType === 'OVER25') {
            if ((hs + as) >= 3) isWon = true;
            else if (isFin) isLost = true;
        } else if (betType.includes('2.5 ALT') || betType.includes('2.5 UNDER') || betType === 'UNDER25') {
            if ((hs + as) >= 3) isLost = true;
            else if (isFin) isWon = true;
        } else if (betType.includes('KG VAR') || betType.includes('BTTS_YES')) {
            if (hs > 0 && as > 0) isWon = true;
            else if (isFin) isLost = true;
        } else {
            if (isFin) isWon = hs >= as;
        }

        return {
            status: isWon ? 'WON' : (isLost ? 'LOST' : (isLive ? 'LIVE' : 'PENDING')),
            isLive,
            isFinished: isFin,
            scoreStr
        };
    },

    // Tüm Sanal Kuponları Güncel Skorlarla Değerlendir
    evaluateAllCoupons(matches = []) {
        const coupons = this.getCoupons();
        const wallet = this.getWallet();
        let changed = false;

        coupons.forEach(coupon => {
            if (coupon.status === 'won' || coupon.status === 'lost') return;

            let allMatchesFinished = true;
            let couponLost = false;
            let anyLive = false;

            coupon.matches.forEach(m => {
                const evalRes = this.evaluateSingleMatch(m);
                if (evalRes.scoreStr) m.score = evalRes.scoreStr;

                if (evalRes.status === 'LOST') {
                    m.status = 'lost';
                    couponLost = true;
                } else if (evalRes.status === 'WON') {
                    m.status = 'won';
                } else if (evalRes.isLive) {
                    m.status = 'live';
                    anyLive = true;
                    allMatchesFinished = false;
                } else {
                    m.status = 'pending';
                    allMatchesFinished = false;
                }
            });

            if (couponLost) {
                coupon.status = 'lost';
                coupon.payout = 0;
                coupon.netProfit = -coupon.stake;
                changed = true;
            } else if (allMatchesFinished) {
                coupon.status = 'won';
                coupon.payout = coupon.potentialReturn;
                coupon.netProfit = Math.round((coupon.potentialReturn - coupon.stake) * 100) / 100;
                wallet.currentBalance = Math.round((wallet.currentBalance + coupon.potentialReturn) * 100) / 100;
                changed = true;
            } else if (anyLive) {
                coupon.status = 'live';
                changed = true;
            }
        });

        if (changed) {
            this.saveCoupons(coupons);
            this.saveWallet(wallet);
        }
    },

    deleteCoupon(couponId) {
        const coupons = this.getCoupons();
        const wallet = this.getWallet();
        const coupon = coupons.find(c => c.id === couponId);
        if (coupon && coupon.status === 'won') {
            wallet.currentBalance -= (coupon.payout - coupon.stake);
        }
        wallet.currentBalance = Math.round(wallet.currentBalance * 100) / 100;
        this.saveWallet(wallet);

        const filtered = coupons.filter(c => c.id !== couponId);
        this.saveCoupons(filtered);
    },

    // İstatistikleri Hesapla
    getStats(dateFilter = 'all') {
        const wallet = this.getWallet();
        const coupons = this.getCouponsForArchive(dateFilter, 'all');

        let totalStake = 0;
        let totalReturn = 0;
        let wonCount = 0;
        let lostCount = 0;
        let pendingCount = 0;

        coupons.forEach(c => {
            totalStake += c.stake;
            if (c.status === 'won') {
                wonCount++;
                totalReturn += (c.payout || 0);
            } else if (c.status === 'lost') {
                lostCount++;
            } else {
                pendingCount++;
            }
        });

        const totalNet = Math.round((totalReturn - totalStake) * 100) / 100;
        const decided = wonCount + lostCount;
        const winRate = decided > 0 ? Math.round((wonCount / decided) * 100) : 0;
        const roi = totalStake > 0 ? Math.round((totalNet / totalStake) * 1000) / 10 : 0;

        return {
            initialBalance: wallet.initialBalance,
            currentBalance: wallet.currentBalance,
            totalCoupons: coupons.length,
            wonCount,
            lostCount,
            pendingCount,
            totalStake,
            totalReturn,
            totalNet,
            winRate,
            roi
        };
    },

    updateBadge() {
        const slip = this.getSlip();
        const count = slip.items ? slip.items.length : 0;
        const badge = document.getElementById('vc-slip-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }
};

/**
 * VirtualCouponPanel Arayüz Bileşeni
 */
const VirtualCouponPanel = {
    activeFilter: 'all',
    selectedArchiveDate: 'all',

    _fmt(num) {
        const n = parseFloat(num) || 0;
        return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    render(app) {
        VirtualCouponManager.evaluateAllCoupons();

        const stats = VirtualCouponManager.getStats(this.selectedArchiveDate);
        const overallStats = VirtualCouponManager.getStats('all');
        const slip = VirtualCouponManager.getSlip();
        const archiveDates = VirtualCouponManager.getArchiveDates();
        const coupons = VirtualCouponManager.getCouponsForArchive(this.selectedArchiveDate, this.activeFilter);

        return `
        <div class="virtual-coupon-dashboard animate-fade-in" style="max-width:1440px;margin:0 auto;padding:16px 16px 40px;">
            ${this.renderHeader(overallStats)}
            ${this.renderKpis(overallStats)}
            
            <div style="display:grid;grid-template-columns:1fr 380px;gap:24px;align-items:start;" class="vc-layout-grid">
                <!-- Sol Kolon: Kuponlarım & Günlük Kupon Arşivi -->
                <div class="vc-main-col">
                    ${this.renderDailyArchiveBar(archiveDates, stats)}
                    ${this.renderCouponsTabs(stats)}
                    <div id="vc-coupons-list-container">
                        ${this.renderCouponsList(coupons, this.activeFilter)}
                    </div>
                </div>

                <!-- Sağ Kolon: Kupon Sepeti -->
                <div class="vc-slip-col" style="position:sticky;top:80px;">
                    ${this.renderBetSlip(slip, overallStats)}
                    ${this.renderQuickAddCard(app)}
                </div>
            </div>

            ${this.renderResetWalletModal(overallStats)}
        </div>
        `;
    },

    renderHeader(stats) {
        return `
        <div style="background:linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(15,23,42,0.9) 100%);border:1px solid rgba(168,85,247,0.35);border-radius:18px;padding:22px 26px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.4);border-radius:20px;padding:4px 14px;margin-bottom:10px;">
                        <span style="font-size:0.85rem;color:#c084fc;font-weight:700;">🎟️ 09 EYLÜL'DEN BUGÜNE GÜNLÜK KUPON ARŞİVİ</span>
                    </div>
                    <h1 style="font-size:1.85rem;font-weight:800;color:#ffffff;margin:0 0 8px;display:flex;align-items:center;gap:10px;">
                        <span>🎟️ Oynanan Kuponlar &amp; Günlük Arşiv</span>
                    </h1>
                    <p style="color:#cbd5e1;font-size:0.92rem;margin:0;line-height:1.5;">
                        09 Eylül 2026'dan bugüne kadar oynanan tüm kuponlar gün gün arşivlenir, resmi maç sonuçlarıyla otomatik sonuçlandırılarak kasanıza işlenir.
                    </p>
                </div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" id="btn-vc-reset-wallet" style="border-color:rgba(168,85,247,0.5);color:#c084fc;font-weight:700;">
                        ⚙️ Bakiyeyi Belirle / Sıfırla
                    </button>
                    <button class="btn btn-primary btn-sm" id="btn-vc-sync-live" style="background:linear-gradient(135deg, #a855f7, #ec4899);color:#fff;font-weight:700;" title="Canlı maç skorlarını çek ve kuponları eşitle">
                        🔄 Canlı Skorları Eşitle
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    renderKpis(stats) {
        const netProfit = stats.totalNet || 0;
        const isProfit = netProfit >= 0;
        const netColor = isProfit ? '#10B981' : '#EF4444';
        const netFormatted = (isProfit ? '+' : '') + this._fmt(netProfit) + ' TL';
        const roiFormatted = (stats.roi >= 0 ? '+' : '') + stats.roi + '%';

        return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:26px;">
            <!-- Mevcut Bakiye -->
            <div style="background:linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.8) 100%);border:1px solid rgba(168,85,247,0.4);border-radius:14px;padding:18px 20px;">
                <div style="font-size:0.8rem;font-weight:700;color:#c084fc;text-transform:uppercase;margin-bottom:6px;">💰 Sanal Kasa Bakiyesi</div>
                <div style="font-size:1.85rem;font-weight:900;color:#ffffff;">${this._fmt(stats.currentBalance)} TL</div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Başlangıç: ${this._fmt(stats.initialBalance)} TL</div>
            </div>

            <!-- Net Kâr / Zarar -->
            <div style="background:linear-gradient(135deg, ${isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'} 0%, rgba(15,23,42,0.85) 100%);border:2px solid ${netColor};border-radius:14px;padding:18px 20px;">
                <div style="font-size:0.8rem;font-weight:700;color:${netColor};text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                    <span>📈 Toplam Kâr / Zarar</span>
                    <span style="font-size:0.7rem;background:${netColor};color:#000;font-weight:900;padding:1px 6px;border-radius:6px;">${isProfit ? 'KÂRDA' : 'ZARAR'}</span>
                </div>
                <div style="font-size:1.85rem;font-weight:900;color:${netColor};">${netFormatted}</div>
                <div style="font-size:0.78rem;color:#cbd5e1;margin-top:4px;">Bakiye farkı</div>
            </div>

            <!-- ROI Oranı -->
            <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:18px 20px;">
                <div style="font-size:0.8rem;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:6px;">📊 Kasa Kâr Oranı (ROI)</div>
                <div style="font-size:1.85rem;font-weight:900;color:#f59e0b;">${roiFormatted}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Yatırıma Göre Getiri</div>
            </div>

            <!-- Kupon Başarı Oranı -->
            <div style="background:rgba(15,23,42,0.75);border:1px solid rgba(0,240,255,0.25);border-radius:14px;padding:18px 20px;">
                <div style="font-size:0.8rem;font-weight:700;color:#00f0ff;text-transform:uppercase;margin-bottom:6px;">🏆 Kupon İsabet Oranı</div>
                <div style="font-size:1.85rem;font-weight:900;color:#00f0ff;">%${stats.winRate}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">${stats.wonCount} Tutan / ${stats.totalCoupons} Toplam</div>
            </div>
        </div>
        `;
    },

    // GÜNLÜK KUPON ARŞİVİ ÇUBUĞU
    renderDailyArchiveBar(archiveDates, stats) {
        const isAll = this.selectedArchiveDate === 'all';
        const activeDateObj = archiveDates.find(d => d.date === this.selectedArchiveDate);

        return `
        <div style="background:rgba(15, 23, 42, 0.85);border:1px solid rgba(168,85,247,0.3);border-radius:16px;padding:18px 20px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.3rem;">📅</span>
                    <div>
                        <strong style="color:#ffffff;font-size:1.05rem;display:block;">Günlük Kupon Arşivi (09 Eylül - Bugün)</strong>
                        <span style="font-size:0.78rem;color:var(--text-muted);">İstediğiniz güne tıklayarak o gün oynanan kuponları, sonuçları ve net kârını inceleyin</span>
                    </div>
                </div>
            </div>

            <!-- Seçmeli Tarih Dropdown (Kompakt ve Yer Kaplamayan) -->
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:0.88rem;color:#cbd5e1;font-weight:700;">Tarih Seçimi:</span>
                    <div style="position:relative;display:inline-flex;align-items:center;">
                        <select id="select-vc-archive-date" class="vc-archive-date-select" style="appearance:none;-webkit-appearance:none;background:rgba(0,0,0,0.65);border:1.5px solid #a855f7;color:#ffffff;font-size:0.88rem;font-weight:800;border-radius:10px;padding:8px 36px 8px 14px;cursor:pointer;outline:none;box-shadow:0 0 14px rgba(168,85,247,0.25);min-width:260px;">
                            <option value="all" ${isAll ? 'selected' : ''} style="background:#0F172A;color:#fff;">
                                🌐 Tüm Oynanan Kuponlar (${VirtualCouponManager.getCoupons().length})
                            </option>
                            ${archiveDates.map(d => {
                                const isSelected = this.selectedArchiveDate === d.date;
                                const isProfit = d.netProfit >= 0;
                                const profitSign = isProfit ? '+' : '';
                                return `
                                    <option value="${d.date}" ${isSelected ? 'selected' : ''} style="background:#0F172A;color:${isProfit ? '#10B981' : '#EF4444'};font-weight:700;">
                                        📅 ${d.dateFormatted || d.date} · ${d.wonCount}/${d.totalCoupons} Tutan (${profitSign}${d.netProfit} TL)
                                    </option>
                                `;
                            }).join('')}
                        </select>
                        <span style="position:absolute;right:12px;color:#a855f7;pointer-events:none;font-size:0.75rem;">▼</span>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);color:#c084fc;padding:6px 14px;border-radius:20px;font-size:0.82rem;font-weight:800;">
                        ${isAll ? 'Tüm Geçmiş Arşiv' : (activeDateObj?.dateFormatted || this.selectedArchiveDate)}
                    </span>
                </div>
            </div>

            <!-- Seçilen Günün Mini İstatistik Özeti -->
            ${activeDateObj ? `
                <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div>
                        <span style="font-size:0.75rem;color:#c084fc;font-weight:800;text-transform:uppercase;">📅 SEÇİLEN ARŞİV GÜNÜ:</span>
                        <strong style="color:#ffffff;font-size:0.95rem;margin-left:6px;">${activeDateObj.dateFormatted}</strong>
                    </div>
                    <div style="display:flex;gap:16px;font-size:0.85rem;align-items:center;flex-wrap:wrap;">
                        <span style="color:#cbd5e1;">Oynanan: <strong>${activeDateObj.totalCoupons} Kupon</strong></span>
                        <span style="color:#10B981;">✅ Kazanan: <strong>${activeDateObj.wonCount}</strong></span>
                        <span style="color:#EF4444;">❌ Kaybeden: <strong>${activeDateObj.lostCount}</strong></span>
                        <span style="color:${activeDateObj.netProfit >= 0 ? '#10B981' : '#EF4444'};font-weight:800;">
                            Net Kâr: ${activeDateObj.netProfit >= 0 ? '+' : ''}${activeDateObj.netProfit.toLocaleString('tr-TR')} TL
                        </span>
                        <span style="background:rgba(0,240,255,0.15);color:#00F0FF;padding:2px 8px;border-radius:6px;font-weight:800;">
                            %${activeDateObj.winRate} Başarı
                        </span>
                    </div>
                </div>
            ` : ''}
        </div>
        `;
    },

    renderCouponsTabs(stats) {
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;gap:8px;background:rgba(15,23,42,0.6);padding:4px;border-radius:10px;border:1px solid var(--border-color);">
                <button class="btn btn-sm ${this.activeFilter === 'all' ? 'btn-primary' : 'btn-ghost'} vc-filter-btn" data-filter="all" style="font-size:0.82rem;">
                    🌐 Tümü (${stats.totalCoupons})
                </button>
                <button class="btn btn-sm ${this.activeFilter === 'pending' ? 'btn-primary' : 'btn-ghost'} vc-filter-btn" data-filter="pending" style="font-size:0.82rem;color:#f59e0b;">
                    ⏳ Bekleyen / Canlı (${stats.pendingCount})
                </button>
                <button class="btn btn-sm ${this.activeFilter === 'won' ? 'btn-primary' : 'btn-ghost'} vc-filter-btn" data-filter="won" style="font-size:0.82rem;color:#10B981;">
                    ✅ Kazananlar (${stats.wonCount})
                </button>
                <button class="btn btn-sm ${this.activeFilter === 'lost' ? 'btn-primary' : 'btn-ghost'} vc-filter-btn" data-filter="lost" style="font-size:0.82rem;color:#EF4444;">
                    ❌ Kaybedenler (${stats.lostCount})
                </button>
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);">
                ⚡ Skorlar değiştikçe kuponlar anında güncellenir.
            </div>
        </div>
        `;
    },

    renderCouponsList(coupons, filter) {
        let filtered = coupons;
        if (filter !== 'all') {
            filtered = coupons.filter(c => c.status === filter);
        }

        if (!filtered || filtered.length === 0) {
            return `
            <div class="empty-state" style="padding:50px 20px;background:rgba(15,23,42,0.5);border:1px dashed rgba(255,255,255,0.15);border-radius:14px;text-align:center;">
                <span class="empty-icon" style="font-size:2.5rem;display:block;margin-bottom:12px;">🎟️</span>
                <h4 style="color:#ffffff;font-size:1.1rem;margin:0 0 6px;">Bu Kriterde Oynanan Kupon Bulunamadı</h4>
                <p style="color:var(--text-muted);font-size:0.85rem;margin:0;">
                    Sağdaki panelden veya maç bülteninden maç ekleyerek kuponunuzu hemen oynayabilirsiniz.
                </p>
            </div>
            `;
        }

        return filtered.map(coupon => this.renderCouponCard(coupon)).join('');
    },

    renderCouponCard(coupon) {
        const isWon = coupon.status === 'won';
        const isLost = coupon.status === 'lost';
        const isLive = coupon.status === 'live';
        const isPending = coupon.status === 'pending';

        let borderColor = 'rgba(255,255,255,0.12)';
        let statusBadge = '';
        let profitBadge = '';

        if (isWon) {
            borderColor = '#10B981';
            statusBadge = `<span style="background:#10B981;color:#000;font-weight:900;font-size:0.75rem;padding:3px 10px;border-radius:6px;">✅ KAZANDI</span>`;
            profitBadge = `<span style="color:#10B981;font-weight:800;font-size:0.95rem;">+${this._fmt(coupon.netProfit)} TL</span>`;
        } else if (isLost) {
            borderColor = '#EF4444';
            statusBadge = `<span style="background:#EF4444;color:#fff;font-weight:900;font-size:0.75rem;padding:3px 10px;border-radius:6px;">❌ KAYBETTİ</span>`;
            profitBadge = `<span style="color:#EF4444;font-weight:800;font-size:0.95rem;">-${this._fmt(coupon.stake)} TL</span>`;
        } else if (isLive) {
            borderColor = '#F59E0B';
            statusBadge = `<span style="background:#F59E0B;color:#000;font-weight:900;font-size:0.75rem;padding:3px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;"><span class="live-dot" style="width:6px;height:6px;background:#000;border-radius:50%;display:inline-block;"></span> CANLI OYNANIYOR</span>`;
            profitBadge = `<span style="color:#F59E0B;font-size:0.85rem;">Potansiyel: ${this._fmt(coupon.potentialReturn)} TL</span>`;
        } else {
            borderColor = 'rgba(168,85,247,0.3)';
            statusBadge = `<span style="background:rgba(255,255,255,0.1);color:#cbd5e1;font-weight:700;font-size:0.75rem;padding:3px 10px;border-radius:6px;">⏳ BEKLİYOR</span>`;
            profitBadge = `<span style="color:#cbd5e1;font-size:0.85rem;">Potansiyel: ${this._fmt(coupon.potentialReturn)} TL</span>`;
        }

        const dateParts = (coupon.archiveDate || '').split('-');
        const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : coupon.dateStr;

        return `
        <div class="vc-coupon-card" style="background:rgba(15, 23, 42, 0.75);border:1px solid ${borderColor};border-radius:14px;padding:18px;margin-bottom:16px;transition:all 0.2s ease;">
            <!-- Kupon Üst Başlığı -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.2rem;">🎟️</span>
                    <div>
                        <strong style="color:#ffffff;font-size:1.05rem;">${coupon.name}</strong>
                        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:8px;align-items:center;margin-top:2px;">
                            <span>📅 Arşiv Tarihi: ${dateDisplay} ${coupon.timeStr || ''}</span>
                            <span>•</span>
                            <span>${(coupon.matches || []).length} Maç</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    ${statusBadge}
                    ${profitBadge}
                    <button class="btn btn-ghost btn-sm btn-vc-delete-coupon" data-id="${coupon.id}" title="Kuponu Sil" style="color:var(--text-muted);padding:4px 8px;font-size:0.8rem;">
                        🗑️
                    </button>
                </div>
            </div>

            <!-- Kupon Maçları Tablosu -->
            <div style="padding:12px 0 6px;">
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${(coupon.matches || []).map(m => {
                        let mBadge = '';
                        if (m.status === 'won') {
                            mBadge = '<span style="color:#10B981;font-size:0.75rem;font-weight:700;background:rgba(16,185,129,0.15);padding:2px 6px;border-radius:4px;">✅ TUTTU</span>';
                        } else if (m.status === 'lost') {
                            mBadge = '<span style="color:#EF4444;font-size:0.75rem;font-weight:700;background:rgba(239,68,68,0.15);padding:2px 6px;border-radius:4px;">❌ YATTI</span>';
                        } else if (m.status === 'live') {
                            mBadge = '<span style="color:#F59E0B;font-size:0.75rem;font-weight:700;background:rgba(245,158,11,0.15);padding:2px 6px;border-radius:4px;">⚡ CANLI</span>';
                        } else {
                            mBadge = '<span style="color:var(--text-muted);font-size:0.75rem;">⏳</span>';
                        }

                        return `
                        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px 12px;font-size:0.85rem;">
                            <div style="display:flex;align-items:center;gap:10px;flex:1;">
                                <span style="font-size:0.75rem;color:var(--text-muted);min-width:40px;">${m.matchTime || ''}</span>
                                <strong style="color:#ffffff;">${m.homeTeam} vs ${m.awayTeam}</strong>
                                ${m.score ? `<span style="background:rgba(255,255,255,0.08);padding:1px 8px;border-radius:6px;font-weight:800;color:#00F0FF;font-size:0.8rem;">${m.score}</span>` : ''}
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <span style="color:#c084fc;font-weight:700;background:rgba(168,85,247,0.15);padding:2px 8px;border-radius:6px;font-size:0.78rem;">
                                    ${m.betType}
                                </span>
                                <span style="color:#ffffff;font-weight:800;font-size:0.85rem;min-width:36px;text-align:right;">
                                    ${m.odds}
                                </span>
                                ${mBadge}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Kupon Alt Bilgi Özeti -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.82rem;">
                <div style="display:flex;gap:14px;color:var(--text-muted);">
                    <span>Yatırılan: <strong style="color:#ffffff;">${this._fmt(coupon.stake)} TL</strong></span>
                    <span>Toplam Oran: <strong style="color:#00F0FF;">${coupon.totalOdds}</strong></span>
                    <span>Olası Kazanç: <strong style="color:#10B981;">${this._fmt(coupon.potentialReturn)} TL</strong></span>
                </div>
                ${isPending ? `
                    <div style="display:flex;gap:6px;">
                        <button class="btn btn-ghost btn-sm btn-vc-resolve" data-id="${coupon.id}" data-action="won" style="color:#10B981;font-size:0.75rem;padding:2px 8px;border:1px solid rgba(16,185,129,0.3);">
                            ✅ Kazandı Say
                        </button>
                        <button class="btn btn-ghost btn-sm btn-vc-resolve" data-id="${coupon.id}" data-action="lost" style="color:#EF4444;font-size:0.75rem;padding:2px 8px;border:1px solid rgba(239,68,68,0.3);">
                            ❌ Kaybetti Say
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
        `;
    },

    // Sağ Kolon: Kupon Sepeti
    renderBetSlip(slip, stats) {
        const items = slip.items || [];
        const stake = slip.stake || 100;

        let totalOdds = 1.0;
        items.forEach(i => {
            totalOdds *= (parseFloat(i.odds) || 1.0);
        });
        totalOdds = Math.round(totalOdds * 100) / 100;
        const potential = Math.round(stake * totalOdds * 100) / 100;

        return `
        <div style="background:rgba(15,23,42,0.9);border:1px solid rgba(168,85,247,0.4);border-radius:16px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.4);margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.2rem;">🛒</span>
                    <strong style="color:#ffffff;font-size:1.1rem;">Kupon Sepeti</strong>
                </div>
                ${items.length > 0 ? `
                    <button class="btn btn-ghost btn-sm" id="btn-vc-clear-slip" style="color:#EF4444;font-size:0.75rem;padding:2px 6px;">
                        Sepeti Temizle
                    </button>
                ` : ''}
            </div>

            <!-- Kupon Adı -->
            <div style="margin-bottom:14px;">
                <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px;">KUPON BAŞLIĞI</label>
                <input type="text" id="input-vc-coupon-name" value="${slip.name || 'Günün Kuponu'}" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:8px;padding:8px 12px;font-size:0.85rem;">
            </div>

            <!-- Eklenen Maçlar -->
            <div style="max-height:280px;overflow-y:auto;margin-bottom:14px;padding-right:4px;">
                ${items.length === 0 ? `
                    <div style="text-align:center;padding:30px 10px;color:var(--text-muted);font-size:0.85rem;border:1px dashed rgba(255,255,255,0.1);border-radius:10px;">
                        <span style="font-size:1.8rem;display:block;margin-bottom:6px;">⚽</span>
                        Sepetiniz boş.<br>Aşağıdaki hazır butonlardan veya bülten maçlarından maç ekleyin.
                    </div>
                ` : items.map(item => `
                    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;margin-bottom:8px;position:relative;">
                        <button class="btn-vc-remove-item" data-id="${item.matchId}" style="position:absolute;top:6px;right:6px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem;">✕</button>
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:2px;">${item.league || 'Futbol'} • ${item.matchTime || ''}</div>
                        <div style="color:#ffffff;font-size:0.85rem;font-weight:700;margin-bottom:4px;padding-right:16px;">${item.homeTeam} - ${item.awayTeam}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="color:#c084fc;font-size:0.78rem;font-weight:700;background:rgba(168,85,247,0.15);padding:2px 6px;border-radius:4px;">${item.betType}</span>
                            <span style="color:#00F0FF;font-weight:900;font-size:0.9rem;">${item.odds}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Tutar ve Hesaplama -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:0.82rem;color:var(--text-muted);">Bahis Tutarı (TL):</span>
                    <input type="number" id="input-vc-stake" value="${stake}" min="10" step="10" style="width:110px;background:rgba(0,0,0,0.4);border:1px solid rgba(168,85,247,0.5);color:#fff;border-radius:6px;padding:6px 10px;font-size:0.95rem;font-weight:800;text-align:right;">
                </div>
                
                <!-- Hızlı Tutar Butonları -->
                <div style="display:flex;gap:6px;margin-bottom:12px;">
                    <button class="btn btn-ghost btn-sm btn-vc-quick-stake" data-amount="50" style="flex:1;padding:4px;font-size:0.75rem;background:rgba(255,255,255,0.05);">50</button>
                    <button class="btn btn-ghost btn-sm btn-vc-quick-stake" data-amount="100" style="flex:1;padding:4px;font-size:0.75rem;background:rgba(255,255,255,0.05);">100</button>
                    <button class="btn btn-ghost btn-sm btn-vc-quick-stake" data-amount="250" style="flex:1;padding:4px;font-size:0.75rem;background:rgba(255,255,255,0.05);">250</button>
                    <button class="btn btn-ghost btn-sm btn-vc-quick-stake" data-amount="500" style="flex:1;padding:4px;font-size:0.75rem;background:rgba(255,255,255,0.05);">500</button>
                </div>

                <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem;">
                    <span style="color:var(--text-muted);">Toplam Oran:</span>
                    <strong style="color:#00F0FF;font-size:1rem;">${totalOdds}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.92rem;">
                    <span style="color:var(--text-muted);">Olası Kazanç:</span>
                    <strong style="color:#10B981;font-size:1.15rem;">${this._fmt(potential)} TL</strong>
                </div>
            </div>

            <!-- Kuponu Oyna Butonu -->
            <button class="btn btn-primary btn-block" id="btn-vc-place-bet" ${items.length === 0 ? 'disabled' : ''} style="background:linear-gradient(135deg, #a855f7, #6366f1);color:#fff;font-weight:800;padding:12px;border-radius:10px;font-size:0.95rem;box-shadow:0 6px 20px rgba(168,85,247,0.4);">
                🎯 Kuponu Oyna &amp; Arşive Ekle
            </button>
        </div>
        `;
    },

    // Hızlı Kupon Ekleme Kartı
    renderQuickAddCard(app) {
        return `
        <div style="background:rgba(15,23,42,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;">
            <strong style="color:#ffffff;font-size:0.9rem;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <span>💡</span> Hızlı Kupon Hazırla
            </strong>
            <p style="color:var(--text-muted);font-size:0.78rem;margin:0 0 12px;">
                Bültendeki en yüksek güven oranlı maçları anında sepete ekleyin.
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="btn btn-outline btn-sm btn-block" id="btn-vc-quick-banko" style="text-align:left;justify-content:flex-start;font-size:0.8rem;border-color:rgba(16,185,129,0.4);color:#10B981;">
                    🎯 Günün 3 Banko Maçını Ekle
                </button>
                <button class="btn btn-outline btn-sm btn-block" id="btn-vc-quick-goals" style="text-align:left;justify-content:flex-start;font-size:0.8rem;border-color:rgba(245,158,11,0.4);color:#F59E0B;">
                    ⚽ 2.5 Üst Gol Kuponu Ekle
                </button>
            </div>
        </div>
        `;
    },

    // Bakiye Sıfırlama Modalı
    renderResetWalletModal(stats) {
        return `
        <div class="modal" id="modal-vc-reset-wallet" style="display:none;">
            <div class="modal-backdrop" onclick="Helpers.closeModal('modal-vc-reset-wallet')"></div>
            <div class="modal-dialog" style="max-width:440px;">
                <div class="modal-header">
                    <h3 class="modal-title">⚙️ Sanal Kasa Bakiyesini Güncelle</h3>
                    <button class="modal-close" onclick="Helpers.closeModal('modal-vc-reset-wallet')">&times;</button>
                </div>
                <div class="modal-body" style="padding:20px;">
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">
                        Sanal kasanızı istediğiniz miktara ayarlayabilirsiniz.
                    </p>
                    <label style="font-size:0.8rem;color:#cbd5e1;display:block;margin-bottom:6px;">YENİ BAKİYE (TL):</label>
                    <input type="number" id="input-vc-new-balance" value="${stats.currentBalance || 10000}" step="500" min="100" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(168,85,247,0.5);color:#fff;border-radius:8px;padding:10px;font-size:1.1rem;font-weight:800;margin-bottom:14px;">

                    <div style="display:flex;gap:8px;margin-bottom:18px;">
                        <button class="btn btn-ghost btn-sm btn-vc-modal-preset" data-val="5000" style="flex:1;background:rgba(255,255,255,0.05);">5.000 TL</button>
                        <button class="btn btn-ghost btn-sm btn-vc-modal-preset" data-val="10000" style="flex:1;background:rgba(255,255,255,0.05);">10.000 TL</button>
                        <button class="btn btn-ghost btn-sm btn-vc-modal-preset" data-val="25000" style="flex:1;background:rgba(255,255,255,0.05);">25.000 TL</button>
                        <button class="btn btn-ghost btn-sm btn-vc-modal-preset" data-val="50000" style="flex:1;background:rgba(255,255,255,0.05);">50.000 TL</button>
                    </div>

                    <button class="btn btn-primary btn-block" id="btn-vc-confirm-reset" style="background:linear-gradient(135deg, #a855f7, #6366f1);color:#fff;font-weight:700;padding:10px;">
                        Kaydet ve Bakiyeyi Uygula
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    bindEvents(app) {
        const self = this;

        // Günlük Arşiv Tarih Filtresi Butonları
        document.querySelectorAll('.vc-archive-date-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.selectedArchiveDate = btn.dataset.date || 'all';
                app.loadVirtualCouponPanel();
            });
        });

        // Durum Filtre Sekmeleri (Tümü / Bekleyen / Kazanan / Kaybeden)
        document.querySelectorAll('.vc-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.activeFilter = btn.dataset.filter || 'all';
                app.loadVirtualCouponPanel();
            });
        });

        // Bakiye Sıfırla Modal Aç
        document.getElementById('btn-vc-reset-wallet')?.addEventListener('click', () => {
            if (window.Helpers) Helpers.openModal('modal-vc-reset-wallet');
        });

        // Modal Preset Butonları
        document.querySelectorAll('.btn-vc-modal-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.val;
                const input = document.getElementById('input-vc-new-balance');
                if (input) input.value = val;
            });
        });

        // Bakiye Sıfırlamayı Onayla
        document.getElementById('btn-vc-confirm-reset')?.addEventListener('click', () => {
            const input = document.getElementById('input-vc-new-balance');
            const val = parseFloat(input?.value) || 10000;
            VirtualCouponManager.resetWallet(val);
            if (window.Helpers) {
                Helpers.closeModal('modal-vc-reset-wallet');
                Helpers.showToast(`Sanal kasanız ${val.toLocaleString('tr-TR')} TL olarak güncellendi.`, 'success');
            }
            app.loadVirtualCouponPanel();
        });

        // Sepetten Maç Sil
        document.querySelectorAll('.btn-vc-remove-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                VirtualCouponManager.removeFromSlip(id);
                app.loadVirtualCouponPanel();
            });
        });

        // Sepeti Temizle
        document.getElementById('btn-vc-clear-slip')?.addEventListener('click', () => {
            VirtualCouponManager.clearSlip();
            app.loadVirtualCouponPanel();
        });

        // Stake Input Değişimi
        document.getElementById('input-vc-stake')?.addEventListener('input', (e) => {
            const slip = VirtualCouponManager.getSlip();
            slip.stake = parseFloat(e.target.value) || 100;
            VirtualCouponManager.saveSlip(slip);
        });

        // Hızlı Stake Butonları
        document.querySelectorAll('.btn-vc-quick-stake').forEach(btn => {
            btn.addEventListener('click', () => {
                const amt = parseFloat(btn.dataset.amount) || 100;
                const input = document.getElementById('input-vc-stake');
                if (input) {
                    input.value = amt;
                    input.dispatchEvent(new Event('input'));
                }
            });
        });

        // Kupon Adı Değişimi
        document.getElementById('input-vc-coupon-name')?.addEventListener('input', (e) => {
            const slip = VirtualCouponManager.getSlip();
            slip.name = e.target.value.trim() || 'Sanal Kuponum';
            VirtualCouponManager.saveSlip(slip);
        });

        // Kuponu Oyna / Onayla
        document.getElementById('btn-vc-place-bet')?.addEventListener('click', () => {
            try {
                const inputName = document.getElementById('input-vc-coupon-name')?.value;
                const newCoupon = VirtualCouponManager.placeBet(inputName);
                if (window.Helpers) {
                    Helpers.showToast(`🎟️ "${newCoupon.name}" sanal kuponunuz oynandı ve günlük arşive eklendi!`, 'success');
                }
                app.loadVirtualCouponPanel();
            } catch (err) {
                if (window.Helpers) {
                    Helpers.showToast(err.message || 'Kupon oynanamadı', 'error');
                }
            }
        });

        // Canlı Skorları Eşitle Butonu
        document.getElementById('btn-vc-sync-live')?.addEventListener('click', async () => {
            if (window.Helpers) Helpers.showToast('🔄 Skorlar çekiliyor ve kuponlar değerlendiriliyor...', 'info');
            if (window.LiveScoreService && app.matches) {
                await LiveScoreService.syncBulletinMatches(app.matches);
            }
            VirtualCouponManager.evaluateAllCoupons(app.matches || []);
            if (window.Helpers) Helpers.showToast('✅ Kupon sonuçları ve kasa güncellendi!', 'success');
            app.loadVirtualCouponPanel();
        });

        // Kupon Manuel Sonuçlandır
        document.querySelectorAll('.btn-vc-resolve').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                const coupons = VirtualCouponManager.getCoupons();
                const target = coupons.find(c => c.id === id);
                if (target) {
                    target.status = action;
                    if (action === 'won') {
                        target.payout = target.potentialReturn;
                        target.netProfit = target.potentialReturn - target.stake;
                    } else {
                        target.payout = 0;
                        target.netProfit = -target.stake;
                    }
                    VirtualCouponManager.saveCoupons(coupons);
                    if (window.Helpers) Helpers.showToast('Kupon durumu güncellendi.', 'success');
                    app.loadVirtualCouponPanel();
                }
            });
        });

        // Kupon Sil
        document.querySelectorAll('.btn-vc-delete-coupon').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                VirtualCouponManager.deleteCoupon(id);
                if (window.Helpers) Helpers.showToast('Kupon silindi.', 'info');
                app.loadVirtualCouponPanel();
            });
        });

        // Hızlı Banko / Gol Kuponu Ekle Butonları
        document.getElementById('btn-vc-quick-banko')?.addEventListener('click', () => {
            const matches = app.matches || [];
            if (matches.length === 0) {
                if (window.Helpers) Helpers.showToast('Henüz maç bülteni yüklenmedi.', 'warning');
                return;
            }
            const topMatches = matches.slice(0, 3);
            topMatches.forEach(m => {
                VirtualCouponManager.addSlipItem({
                    matchId: m.id || m.iddaaCode,
                    homeTeam: m.homeTeam,
                    awayTeam: m.awayTeam,
                    league: m.league,
                    matchTime: m.timeStr,
                    betType: 'MS 1',
                    odds: String(m.odds?.ms1 || 1.45)
                });
            });
            if (window.Helpers) Helpers.showToast('3 Banko maç sepetinize eklendi!', 'success');
            app.loadVirtualCouponPanel();
        });

        document.getElementById('btn-vc-quick-goals')?.addEventListener('click', () => {
            const matches = app.matches || [];
            if (matches.length === 0) {
                if (window.Helpers) Helpers.showToast('Henüz maç bülteni yüklenmedi.', 'warning');
                return;
            }
            const topMatches = matches.slice(1, 4);
            topMatches.forEach(m => {
                VirtualCouponManager.addSlipItem({
                    matchId: m.id || m.iddaaCode,
                    homeTeam: m.homeTeam,
                    awayTeam: m.awayTeam,
                    league: m.league,
                    matchTime: m.timeStr,
                    betType: '2.5 ÜST',
                    odds: String(m.odds?.over25 || 1.65)
                });
            });
            if (window.Helpers) Helpers.showToast('3 Gol maçı sepetinize eklendi!', 'success');
            app.loadVirtualCouponPanel();
        });
    }
};

if (typeof window !== 'undefined') {
    window.VirtualCouponManager = VirtualCouponManager;
    window.VirtualCouponPanel = VirtualCouponPanel;
}
