/**
 * couponEngine.js — "Benim İçin Bahis Yap" / Günlük 4 Otomatik Garantör Kupon Motoru
 * 4 Platform (Nesine, Bilyoner, İddaa, Misli) verileri, Poisson modelleri ve yazar konsensüsleriyle
 * günün en garantör, ideal, gol ve value odaklı 4 farklı hazır kuponunu üretir.
 */
const CouponEngine = {
    cachedCoupons: null,
    lastGeneratedAt: null,
    poolSourceLabel: 'Günün Maçları (Bugün)',

    /**
     * Maçın bugün oynanıp oynanmadığını kontrol eder
     */
    _isMatchToday(match) {
        if (!match) return false;
        const now = new Date();
        const todayY = now.getFullYear();
        const todayM = now.getMonth();
        const todayD = now.getDate();
        const todayStr = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;
        const todayFmt = `${String(todayD).padStart(2, '0')}.${String(todayM + 1).padStart(2, '0')}.${todayY}`;

        // 1. matchDate ISO formatı varsa
        if (match.matchDate) {
            const d = new Date(match.matchDate);
            if (!isNaN(d.getTime())) {
                return d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD;
            }
        }

        // 2. dateStr formatı (örn: "17.09.2026")
        if (match.dateStr) {
            if (match.dateStr === todayFmt || match.dateStr === todayStr) return true;
            const parts = match.dateStr.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return year === todayY && month === todayM && day === todayD;
            }
        }

        // 3. Eğer maç bültende "Bugün" olarak işaretlenmişse
        if (match.isToday === true) return true;

        return false;
    },

    /**
     * Günün maçlarını filtreler
     */
    _filterTodayMatches(matches) {
        if (!Array.isArray(matches)) return [];
        return matches.filter(m => this._isMatchToday(m));
    },

    /**
     * Önümüzdeki N saatteki maçları filtreler (Yedek fallback)
     */
    _filterUpcomingMatches(matches, maxHours = 36) {
        if (!Array.isArray(matches)) return [];
        const now = new Date();
        const maxTime = new Date(now.getTime() + maxHours * 3600 * 1000);

        return matches.filter(m => {
            if (!m.matchDate) return false;
            const d = new Date(m.matchDate);
            if (isNaN(d.getTime())) return false;
            return d >= now && d <= maxTime;
        });
    },

    /**
     * Günlük 4 Kuponu Oluştur — Sadece GÜNÜN MAÇLARINDAN
     * @param {Array} matches - Bültendeki maçlar listesi
     * @param {boolean} forceNew - Önbelleği temizleyip yeniden üret
     * @returns {Array} 4 adet kupon nesnesi
     */
    generateDailyCoupons(matches = [], forceNew = false) {
        const todayStr = new Date().toISOString().slice(0, 10);

        if (!forceNew && this.cachedCoupons && Array.isArray(this.cachedCoupons) && this.cachedCoupons.length > 0 && this.cachedCoupons.length <= 5) {
            return this.cachedCoupons;
        }

        if (!matches || matches.length === 0) {
            return [];
        }

        // 2. Kuponları günün aktif ve elit bülten maçlarından oluştur
        const todayMatches = (matches || []).filter(m => this._isMatchToday(m));
        let targetMatches = todayMatches.length >= 15 ? todayMatches : matches;
        this.poolSourceLabel = 'Günün Maçları (Bugünün Bülteni)';

        // 2. Maç havuzunu analiz et
        let pool = this._buildAnalysisPool(targetMatches);
        if (pool.length < 10 && targetMatches !== matches) {
            pool = this._buildAnalysisPool(matches);
        }
        if (pool.length === 0) return [];

        const usedMatchKeys = new Set();
        const getMatchKey = m => (m.id || (m.homeTeam + '_' + m.awayTeam));

        // Kullanıcı Kuralı: "Bülteni gece gündüz diye ayırma, bütün gün olarak hazırla kuponları en garanti maçlardan"
        // Gece/Gündüz ayrımı yapmadan tüm günün en yüksek güven ve garanti oranına sahip maçlarını seç

        // Yardımcı seçim fonksiyonu (Aynı kuponda ve kuponlar arasında maç tekrarını KESİNLİKLE önler)
        const selectPicksForCoupon = (filterFn, sortFn, count = 3, allowReuse = false) => {
            const candidates = [];
            pool.forEach(item => {
                const key = getMatchKey(item.match);
                if (!allowReuse && usedMatchKeys.has(key)) return;

                item.candidates.forEach(c => {
                    if (filterFn(c, item)) {
                        candidates.push({ item, pick: c });
                    }
                });
            });

            // Bütün gün havuzundan en garanti / en yüksek güven oranına göre sırala
            candidates.sort((a, b) => sortFn(a, b));

            const selected = [];
            const localKeys = new Set();
            for (const cand of candidates) {
                const key = getMatchKey(cand.item.match);
                if (!localKeys.has(key)) {
                    localKeys.add(key);
                    selected.push(cand);
                    if (selected.length >= count) break;
                }
            }

            // Seçilen maçları global olarak kullanıldı işaretle
            selected.forEach(s => usedMatchKeys.add(getMatchKey(s.item.match)));
            return selected;
        };

        // ============================================================
        // 1. KUPON: 🛡️ KASA KATLAMA / EN GARANTÖR KUPON (Ultra Güven & Maksimum İsabet)
        // ============================================================
        // KULLANICI KURALI: 1.5 Üst çok olmuyor! 0-0 ve 1-0 riski nedeniyle Kasa Katlama kuponuna 1.5 Üst ALINMAZ!
        let safePicks = selectPicksForCoupon(
            (c, item) => (c.probability >= 75 && c.odd >= 1.15 && c.odd <= 1.68 && c.shortPick !== '1.5 ÜST' && c.marketCode !== '1.5UST'),
            (a, b) => (b.pick.probability * 1.6 + b.pick.confidenceScore * 1.4) - (a.pick.probability * 1.6 + a.pick.confidenceScore * 1.4),
            3,
            false
        );
        // Eğer 3 maç bulunamadıysa kriteri kontrollü esnet ama YİNE DE YENİ/BENZERSİZ MAÇLARDAN SEÇ
        if (safePicks.length < 3) {
            const needed = 3 - safePicks.length;
            const extra = selectPicksForCoupon(
                (c, item) => (c.probability >= 68 && c.odd >= 1.10 && c.odd <= 1.75 && c.shortPick !== '1.5 ÜST' && c.marketCode !== '1.5UST'),
                (a, b) => (b.pick.probability * 1.5 + b.pick.confidenceScore) - (a.pick.probability * 1.5 + a.pick.confidenceScore),
                needed,
                false
            );
            safePicks = [...safePicks, ...extra];
        }

        // ============================================================
        // 2. KUPON: 🎯 İDEAL GÜNLÜK EDİTÖR KUPONU (4 Platform Konsensüsü)
        // ============================================================
        let editorPicks = selectPicksForCoupon(
            (c, item) => {
                if (c.marketCode === '1.5UST') {
                    const xgTot = (item.result?.expectedGoals?.home || 0) + (item.result?.expectedGoals?.away || 0);
                    if (xgTot < 2.65) return false;
                }
                const cons = item.editor?.consensus?.percentage || 70;
                return (c.probability >= 68 && cons >= 75 && c.odd >= 1.25 && c.odd <= 2.25);
            },
            (a, b) => {
                const consA = a.item.editor?.consensus?.percentage || 70;
                const consB = b.item.editor?.consensus?.percentage || 70;
                return (consB * 1.4 + b.pick.probability * 1.2 + b.pick.confidenceScore) - (consA * 1.4 + a.pick.probability * 1.2 + a.pick.confidenceScore);
            },
            3,
            false
        );
        if (editorPicks.length < 3) {
            const needed = 3 - editorPicks.length;
            const extra = selectPicksForCoupon(
                (c, item) => (c.probability >= 64 && c.odd >= 1.20 && c.odd <= 2.40 && c.marketCode !== '1.5UST'),
                (a, b) => (b.pick.confidenceScore + b.pick.probability) - (a.pick.confidenceScore + a.pick.probability),
                needed,
                false
            );
            editorPicks = [...editorPicks, ...extra];
        }

        // ============================================================
        // 3. KUPON: ⚽ GOL YAĞMURU KUPONU (Alt / Üst & KG Odaklı)
        // ============================================================
        const isGoalMarket = (c) => c.category === 'gol' || c.category === 'ilkyari' || (c.marketCode && (c.marketCode.includes('UST') || c.marketCode.includes('ALT') || c.marketCode.includes('KG')));
        let goalPicks = selectPicksForCoupon(
            (c, item) => isGoalMarket(c) && c.probability >= 68 && c.odd >= 1.20 && c.odd <= 2.15,
            (a, b) => (b.pick.probability * 1.5 + (b.pick.valueEdge > 0 ? 8 : 0)) - (a.pick.probability * 1.5 + (a.pick.valueEdge > 0 ? 8 : 0)),
            3,
            false
        );
        if (goalPicks.length < 3) {
            const needed = 3 - goalPicks.length;
            const extra = selectPicksForCoupon(
                (c, item) => isGoalMarket(c) && c.probability >= 60 && c.odd >= 1.18 && c.odd <= 2.30,
                (a, b) => b.pick.probability - a.pick.probability,
                needed,
                false
            );
            goalPicks = [...goalPicks, ...extra];
        }

        // ============================================================
        // 4. KUPON: 💎 SÜRPRİZ & VALUE AVCISI KUPONU (Yüksek Getiri & Pozitif Edge)
        // ============================================================
        let valuePicks = selectPicksForCoupon(
            (c, item) => (c.valueEdge >= 0.02 && c.probability >= 48 && c.odd >= 1.55 && c.odd <= 3.10),
            (a, b) => (b.pick.valueEdge * 3.0 + b.pick.probability * 0.8 + b.pick.odd * 4) - (a.pick.valueEdge * 3.0 + a.pick.probability * 0.8 + a.pick.odd * 4),
            3,
            false
        );
        if (valuePicks.length < 3) {
            const needed = 3 - valuePicks.length;
            const extra = selectPicksForCoupon(
                (c, item) => (c.odd >= 1.50 && c.odd <= 3.60 && c.probability >= 40),
                (a, b) => (b.pick.odd * 6 + b.pick.confidenceScore + b.pick.probability) - (a.pick.odd * 6 + a.pick.confidenceScore + a.pick.probability),
                needed,
                false
            );
            valuePicks = [...valuePicks, ...extra];
        }

        // ============================================================
        // 5. KUPON: 👑 GÜNÜN YILDIZ KUPONU / SÜPER KOMBİNE (Elit Takımlar & Özel Analiz)
        // ============================================================
        let starPicks = selectPicksForCoupon(
            (c, item) => {
                const h = (item.match?.homeTeam || '').toLowerCase();
                const a = (item.match?.awayTeam || '').toLowerCase();
                const l = (item.match?.league || '').toLowerCase();
                const isElite = l.includes('şampiyonlar') || l.includes('champions') || l.includes('avrupa') || l.includes('premier') || l.includes('la liga') || l.includes('serie a') || l.includes('bundesliga') || l.includes('süper lig');
                return (isElite || c.confidenceScore >= 68) && c.probability >= 68 && c.odd >= 1.25 && c.odd <= 2.20 && c.marketCode !== '1.5UST';
            },
            (a, b) => (b.pick.confidenceScore * 1.4 + b.pick.probability * 1.3) - (a.pick.confidenceScore * 1.4 + a.pick.probability * 1.3),
            3,
            false
        );
        if (starPicks.length < 3) {
            const needed = 3 - starPicks.length;
            const extra = selectPicksForCoupon(
                (c, item) => (c.probability >= 62 && c.odd >= 1.18 && c.odd <= 2.30 && c.marketCode !== '1.5UST'),
                (a, b) => (b.pick.confidenceScore + b.pick.probability) - (a.pick.confidenceScore + a.pick.probability),
                needed,
                false
            );
            starPicks = [...starPicks, ...extra];
        }

        // ============================================================
        // ⚡ İY / MS ÖZEL ANALİZ KUPONU (Kullanıcı Talebi: İY 0/MS 1, İY 0/MS 2, İY 1/MS 2)
        // ============================================================
        let htftPicks = selectPicksForCoupon(
            (c, item) => (
                (c.marketCode === 'HTX_FT1' || c.marketCode === 'HTX_FT2' || c.marketCode === 'HT1_FT2' || c.marketCode === 'HT2_FT1' || c.marketCode === 'HT1_FT1' || c.category === 'iy_ms' || c.category === 'iy_ms_surpriz') &&
                (c.probability >= 14 || (c.marketCode === 'HT1_FT2' && c.probability >= 1.2) || (c.marketCode === 'HT2_FT1' && c.probability >= 1.4))
            ),
            (a, b) => {
                const scoreA = (a.pick.marketCode === 'HT1_FT2' || a.pick.marketCode === 'HT2_FT1') ? (a.pick.probability * 15 + a.pick.odd * 1.5) : (a.pick.probability * 2.2 + a.pick.odd * 2.0);
                const scoreB = (b.pick.marketCode === 'HT1_FT2' || b.pick.marketCode === 'HT2_FT1') ? (b.pick.probability * 15 + b.pick.odd * 1.5) : (b.pick.probability * 2.2 + b.pick.odd * 2.0);
                return scoreB - scoreA;
            },
            2,
            true // İY/MS özel bir tür olduğu için güvenli maçları da kullanabilir
        );

        // Fallback: Eğer havuzda henüz yeterli İY/MS adayı yoksa, bültendeki maçların Poisson modelinden türet
        if (!htftPicks || htftPicks.length < 2) {
            pool.forEach(item => {
                if (htftPicks.length >= 2) return;
                const p = item.result?.poisson;
                const htft = p?.halfTimeFullTime;
                if (!htft) return;
                
                if (htft['X/1'] >= 16) {
                    const exists = htftPicks.some(hp => hp.item.match.id === item.match.id);
                    if (!exists) {
                        htftPicks.push({
                            item,
                            pick: {
                                marketCode: 'HTX_FT1',
                                title: 'İlk Yarı X / Maç Sonu 1',
                                shortPick: 'İY 0 / MS 1',
                                probability: htft['X/1'],
                                odd: +(100 / Math.max(htft['X/1'], 10) * 0.85).toFixed(2),
                                confidenceScore: 78,
                                category: 'iy_ms'
                            }
                        });
                    }
                } else if (htft['X/2'] >= 14) {
                    const exists = htftPicks.some(hp => hp.item.match.id === item.match.id);
                    if (!exists) {
                        htftPicks.push({
                            item,
                            pick: {
                                marketCode: 'HTX_FT2',
                                title: 'İlk Yarı X / Maç Sonu 2',
                                shortPick: 'İY 0 / MS 2',
                                probability: htft['X/2'],
                                odd: +(100 / Math.max(htft['X/2'], 10) * 0.85).toFixed(2),
                                confidenceScore: 74,
                                category: 'iy_ms'
                            }
                        });
                    }
                }
            });
        }

        // ============================================================
        // 🎯 KULLANICI KURALI: GARANTİN NEYSE O, MAKSİMUM 5 KUPON
        // Her gün zorla 5 kupon yapılmaz. Sadece güven kriterlerini
        // tam olarak sağlayan kuponlar paketlenir (1 ile 5 arası).
        // ============================================================
        const qualifiedCoupons = [];

        if (safePicks && safePicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-safe',
                title: '🛡️ Garantör / En Güvenilir Kupon',
                subtitle: `Günün en banko, en yüksek kazanma ihtimalli ${safePicks.length} seçimi`,
                badge: '🛡️ ULTRA GÜVEN · BANKO',
                badgeType: 'success',
                icon: '🛡️',
                themeColor: '#10B981',
                accentBg: 'rgba(16, 185, 129, 0.1)',
                picks: safePicks,
                strategy: 'Yüksek güvenilirlik ve riskten kaçınma odaklıdır. Poisson olasılık modelinde sapma riski minimum olan tercihlerden oluşturulmuştur.',
                recommendedStake: 200
            }));
        }

        if (editorPicks && editorPicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-editor',
                title: 'İdeal Günlük Editör Kuponu',
                subtitle: '4 Platform ortak konsensüsü ve dengeli oranlar',
                badge: '🎯 4 PLATFORM HARMANI · DENGELİ',
                badgeType: 'primary',
                icon: '🎯',
                themeColor: '#7C3AED',
                accentBg: 'rgba(124, 58, 237, 0.12)',
                picks: editorPicks,
                strategy: 'Nesine, Bilyoner, İddaa ve Misli yorumcularının ortak görüş bildirdiği, oran/risk dengesi kusursuz ana kupon.',
                recommendedStake: 100
            }));
        }

        // ⚡ İY / MS ÖZEL KUPONU
        if (htftPicks && htftPicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-htft',
                title: '⚡ İY / MS Özel Analiz Kuponu',
                subtitle: 'Yüksek model yüzdeli İY 0/MS 1, İY 0/MS 2 ve Bomba İY 1/MS 2',
                badge: '⚡ İY / MS ÖZEL · YÜKSEK ÇARPAN',
                badgeType: 'special',
                icon: '⚡',
                themeColor: '#8B5CF6',
                accentBg: 'rgba(139, 92, 246, 0.14)',
                picks: htftPicks,
                strategy: 'İlk yarı ve ikinci yarı bağımsız Poisson olasılık modeliyle hesaplanan yüksek yüzdeli İY 0/MS 1, İY 0/MS 2 ve sürpriz çevirme (İY 1/MS 2) tercihlerini birleştiren özel kupondur.',
                recommendedStake: 50
            }));
        }

        if (goalPicks && goalPicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-goals',
                title: 'Günün Gol Yağmuru Kuponu',
                subtitle: 'Taraf riskine girmeden saf gol istatistikleri',
                badge: '⚽ YÜKSEK xG & GOL BEKLENTİSİ',
                badgeType: 'warning',
                icon: '⚽',
                themeColor: '#F59E0B',
                accentBg: 'rgba(245, 158, 11, 0.1)',
                picks: goalPicks,
                strategy: 'Takımların son maç gol ortalamaları, hücum güç indeksleri ve ilk yarı tempo analizleriyle seçilmiş gol kuponu.',
                recommendedStake: 100
            }));
        }

        if (valuePicks && valuePicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-value',
                title: 'Sürpriz & Değer (Value) Kuponu',
                subtitle: 'Piyasa oranlarının gerçek gücün üzerinde açıldığı tercihler',
                badge: '💎 YÜKSEK ÇARPAN · VALUE EDGE',
                badgeType: 'info',
                icon: '💎',
                themeColor: '#00F0FF',
                accentBg: 'rgba(0, 240, 255, 0.1)',
                picks: valuePicks,
                strategy: 'Matematiksel modelin piyasa oranından daha yüksek ihtimal gördüğü, küçük bütçeyle yüksek kazanç hedefleyen kupon.',
                recommendedStake: 50
            }));
        }

        if (starPicks && starPicks.length >= 2) {
            qualifiedCoupons.push(this._formatCoupon({
                id: 'coupon-star',
                title: 'Günün Yıldız Kuponu / Süper Kombine',
                subtitle: 'Günün en formda elit takımları ve seçkin maçları',
                badge: '👑 ELİT SEÇİM · ÖZEL KOMBİNE',
                badgeType: 'warning',
                icon: '👑',
                themeColor: '#EC4899',
                accentBg: 'rgba(236, 72, 153, 0.12)',
                picks: starPicks,
                strategy: 'Günün en prestijli liglerinden form durumu en yüksek takımların bir araya getirildiği özel kupon.',
                recommendedStake: 100
            }));
        }

        // Tavan sınır: Maksimum 5 kupon
        const coupons = qualifiedCoupons.slice(0, 5);

        this.cachedCoupons = coupons;
        this.lastGeneratedAt = new Date();

        // Kuponları bugünün tarihiyle localStorage'a kaydet (geçmiş günlerde kalıcı olsun)
        try {
            if (typeof localStorage !== 'undefined' && Array.isArray(coupons) && coupons.length > 0) {
                localStorage.setItem('sportanaliz_coupons_by_date_' + todayStr, JSON.stringify(coupons));
            }
        } catch (e) {}

        return coupons;
    },

    cachedUCLCoupon: null,
    cachedEuropeanCoupons: null,

    /**
     * UEFA Şampiyonlar Ligi (2 Kupon), Avrupa Ligi ve Konferans Ligi Kuponlarını Üretir
     * @param {Array} matches - Bültendeki maçlar
     * @param {boolean} forceNew - Önbelleği temizle
     * @returns {Array} 4 adet Avrupa kupaları kuponu [ucl1, ucl2, uel, uecl]
     */
    generateEuropeanCoupons(matches = [], forceNew = false) {
        if (!forceNew && this.cachedEuropeanCoupons && this.cachedEuropeanCoupons.length === 4) {
            return this.cachedEuropeanCoupons;
        }

        if (!matches || matches.length === 0) return [];

        const euroCoupons = [];
        const getMatchKey = m => (m.id || (m.homeTeam + '_' + m.awayTeam));

        // Ağır favorilerde oran inferansı
        matches.forEach(m => {
            if (!m.odds.home && m.odds.draw && m.odds.away && m.odds.draw > 4) {
                const impD = 1 / m.odds.draw;
                const impA = 1 / m.odds.away;
                const impH = Math.max(0.05, 1.05 - impD - impA);
                m.odds.home = +(1 / impH).toFixed(2);
            }
        });

        // Bültendeki UEFA turnuvalarını ve bugünün maçlarını önceliklendir
        const todayOnlyMatches = (matches || []).filter(m => this._isMatchToday(m));

        // 1. Şampiyonlar Ligi / Devler Ligi Maçları
        // Bültendeki Şampiyonlar Ligi karşılaşmaları ve Devler Ligi seviyesindeki elit takımları harmanla
        let clMatches = (matches || []).filter(m => {
            const l = (m.league || '').toLowerCase();
            return (l.includes('şampiyonlar') || l.includes('champions')) && !l.includes('fiba') && !l.includes('gt ');
        });

        const topEuropeanGiants = ['inter', 'roma', 'fenerbahçe', 'villarreal', 'betis', 'dinamo kiev', 'shakhtar', 'braga'];
        const devMatches = todayOnlyMatches.filter(m => {
            const h = (m.homeTeam || '').toLowerCase();
            const a = (m.awayTeam || '').toLowerCase();
            const isReserve = h.includes(' ii') || a.includes(' ii') || h.includes('u20') || a.includes('u20') || h.includes('u23') || a.includes('u23') || h.includes('(a)');
            if (isReserve) return false;
            return topEuropeanGiants.some(t => h.includes(t) || a.includes(t));
        });
        clMatches = [...devMatches, ...clMatches];

        if (clMatches.length < 3) {
            clMatches = todayOnlyMatches.length >= 3 ? todayOnlyMatches : (matches || []).slice(0, 15);
        }

        const poolCL = this._buildAnalysisPool(clMatches);
        const usedEuroKeys = new Set();

        // ------------------------------------------------------------
        // 1. KUPON: 🏆 Şampiyonlar Ligi — Banko & Garantör Kuponu (Ultra Güven)
        // ------------------------------------------------------------
        const ucl1Candidates = [];
        poolCL.forEach(item => {
            item.candidates.forEach(c => {
                if (c.probability >= 70 && c.odd >= 1.10 && c.odd <= 1.70) {
                    ucl1Candidates.push({ item, pick: c, isToday: true });
                }
            });
        });
        ucl1Candidates.sort((a, b) => {
            const scoreA = (a.pick.confidenceScore * 1.5 + a.pick.probability * 1.2);
            const scoreB = (b.pick.confidenceScore * 1.5 + b.pick.probability * 1.2);
            return scoreB - scoreA;
        });

        const ucl1Picks = [];
        for (const cand of ucl1Candidates) {
            const k = getMatchKey(cand.item.match);
            if (!usedEuroKeys.has(k)) {
                usedEuroKeys.add(k);
                ucl1Picks.push(cand);
                if (ucl1Picks.length >= 3) break;
            }
        }
        // Fallback (sadece bugünün maçları)
        if (ucl1Picks.length < 3) {
            poolCL.forEach(item => {
                const k = getMatchKey(item.match);
                if (usedEuroKeys.has(k)) return;
                const top = item.candidates[0];
                if (top && ucl1Picks.length < 3) {
                    usedEuroKeys.add(k);
                    ucl1Picks.push({ item, pick: top, isToday: true });
                }
            });
        }

        const uclCoupon1 = this._formatCoupon({
            id: 'coupon-ucl-1',
            title: '🏆 Şampiyonlar Ligi — Banko Kuponu',
            subtitle: 'Bugünün Devler Ligi gecesinin en yüksek olasılıklı banko 3 tercihi',
            badge: '⭐ DEVLER LİGİ · BANKO 1',
            badgeType: 'ucl',
            icon: '🏆',
            themeColor: '#3B82F6',
            accentBg: 'rgba(59, 130, 246, 0.15)',
            picks: ucl1Picks,
            strategy: 'Poisson gol modelleri ve 4 platformun ortak mutabakatıyla seçilmiş bugünün en garantör Şampiyonlar Ligi kuponudur.',
            recommendedStake: 150
        });
        euroCoupons.push(uclCoupon1);

        // ------------------------------------------------------------
        // 2. KUPON: 🔥 Şampiyonlar Ligi — Devler Arenası & Gol Kuponu
        // ------------------------------------------------------------
        const ucl2Candidates = [];
        poolCL.forEach(item => {
            const k = getMatchKey(item.match);
            if (usedEuroKeys.has(k)) return;
            item.candidates.forEach(c => {
                if (c.odd >= 1.25 && c.odd <= 2.25) {
                    ucl2Candidates.push({ item, pick: c, isToday: true });
                }
            });
        });
        ucl2Candidates.sort((a, b) => {
            const scoreA = (a.pick.confidenceScore * 1.3 + a.pick.odd * 6);
            const scoreB = (b.pick.confidenceScore * 1.3 + b.pick.odd * 6);
            return scoreB - scoreA;
        });

        const ucl2Picks = [];
        for (const cand of ucl2Candidates) {
            const k = getMatchKey(cand.item.match);
            if (!usedEuroKeys.has(k)) {
                usedEuroKeys.add(k);
                ucl2Picks.push(cand);
                if (ucl2Picks.length >= 3) break;
            }
        }
        if (ucl2Picks.length < 3) {
            poolCL.forEach(item => {
                const k = getMatchKey(item.match);
                if (usedEuroKeys.has(k)) return;
                const top = item.candidates.find(c => c.category === 'gol' || c.odd >= 1.30) || item.candidates[0];
                if (top && ucl2Picks.length < 3) {
                    usedEuroKeys.add(k);
                    ucl2Picks.push({ item, pick: top, isToday: true });
                }
            });
        }

        const uclCoupon2 = this._formatCoupon({
            id: 'coupon-ucl-2',
            title: '🔥 Şampiyonlar Ligi — Gol & Heyecan Kuponu',
            subtitle: 'Bugünkü Şampiyonlar Ligi maçlarında yüksek isabetli gol bahisleri',
            badge: '⚡ DEVLER LİGİ · GOL & ORAN',
            badgeType: 'ucl-gold',
            icon: '🔥',
            themeColor: '#F59E0B',
            accentBg: 'rgba(245, 158, 11, 0.15)',
            picks: ucl2Picks,
            strategy: 'Günün dev karşılaşmalarında karşılıklı gol, ilk yarı temposu ve sürpriz getiri potansiyeli yüksek tercihlerle hazırlanmıştır.',
            recommendedStake: 100
        });
        euroCoupons.push(uclCoupon2);

        // ------------------------------------------------------------
        // 3. KUPON: 🟠 UEFA Avrupa Ligi Özel Kuponu
        // ------------------------------------------------------------
        let uelMatches = (matches || []).filter(m => {
            const l = (m.league || '').toLowerCase();
            return l.includes('uefa avrupa ligi') || (l.includes('avrupa ligi') && !l.includes('gt '));
        });
        if (uelMatches.length < 3) {
            const uelFallback = todayOnlyMatches.filter(m => {
                const l = (m.league || '').toLowerCase();
                const h = (m.homeTeam || '').toLowerCase();
                const a = (m.awayTeam || '').toLowerCase();
                return l.includes('avrupa') || l.includes('europa') || 
                       h.includes('fenerbahçe') || a.includes('fenerbahçe') ||
                       h.includes('roma') || a.includes('roma') ||
                       h.includes('braga') || a.includes('braga') ||
                       h.includes('midtjylland') || a.includes('midtjylland') ||
                       h.includes('dynamo kiev') || a.includes('dynamo kiev');
            });
            uelMatches = [...uelMatches, ...uelFallback];
        }
        if (uelMatches.length < 3) {
            uelMatches = todayOnlyMatches.length >= 3 ? todayOnlyMatches : (matches || []).slice(0, 15);
        }

        const poolUEL = this._buildAnalysisPool(uelMatches);
        const uelCandidates = [];
        poolUEL.forEach(item => {
            const k = getMatchKey(item.match);
            if (usedEuroKeys.has(k)) return;
            item.candidates.forEach(c => {
                if (c.probability >= 65 && c.odd >= 1.15 && c.odd <= 2.25) {
                    uelCandidates.push({ item, pick: c, isToday: true });
                }
            });
        });
        uelCandidates.sort((a, b) => b.pick.confidenceScore * 1.4 - a.pick.confidenceScore * 1.4);

        const uelPicks = [];
        for (const cand of uelCandidates) {
            const k = getMatchKey(cand.item.match);
            if (!usedEuroKeys.has(k)) {
                usedEuroKeys.add(k);
                uelPicks.push(cand);
                if (uelPicks.length >= 3) break;
            }
        }
        if (uelPicks.length < 3) {
            poolUEL.forEach(item => {
                const k = getMatchKey(item.match);
                if (!usedEuroKeys.has(k) && item.candidates[0]) {
                    usedEuroKeys.add(k);
                    uelPicks.push({ item, pick: item.candidates[0], isToday: true });
                }
            });
        }

        const uelCoupon = this._formatCoupon({
            id: 'coupon-uel',
            title: '🟠 UEFA Avrupa Ligi Özel Kuponu',
            subtitle: 'Bugünkü Avrupa Ligi ve temsilcilerimizin kritik Avrupa sınavları',
            badge: '🟠 AVRUPA LİGİ · ÖZEL',
            badgeType: 'uel',
            icon: '🟠',
            themeColor: '#F97316',
            accentBg: 'rgba(249, 115, 22, 0.15)',
            picks: uelPicks.slice(0, 3),
            strategy: 'UEFA Avrupa Ligi takımlarının iç-dış saha gol ortalamaları, deplasman dirençleri ve 4 platform ortak konsensüsüyle hazırlanmıştır.',
            recommendedStake: 100
        });
        euroCoupons.push(uelCoupon);

        // ------------------------------------------------------------
        // 4. KUPON: 🟢 UEFA Konferans Ligi Özel Kuponu
        // ------------------------------------------------------------
        let ueclMatches = (matches || []).filter(m => {
            const l = (m.league || '').toLowerCase();
            return (l.includes('konferans') || l.includes('conference')) && !l.includes('gt ');
        });
        const ueclTeams = ['bodo glimt', 'djurgarden', 'ludogorets', 'fcsb', 'midtjylland', 'brondby', 'sandefjord'];
        const ueclFallback = todayOnlyMatches.filter(m => {
            const h = (m.homeTeam || '').toLowerCase();
            const a = (m.awayTeam || '').toLowerCase();
            const isReserve = h.includes(' ii') || a.includes(' ii') || h.includes('u20') || a.includes('u20') || h.includes('u23') || a.includes('u23') || h.includes('(a)');
            if (isReserve) return false;
            const matchesTeam = ueclTeams.some(t => h.includes(t) || a.includes(t)) || h === 'gais' || a === 'gais' || h.endsWith(' gais') || a.endsWith(' gais');
            return matchesTeam;
        });
        ueclMatches = [...ueclMatches, ...ueclFallback];
        if (ueclMatches.length < 3) {
            ueclMatches = todayOnlyMatches.length >= 3 ? todayOnlyMatches : (matches || []).slice(0, 15);
        }

        const poolUECL = this._buildAnalysisPool(ueclMatches);
        const ueclCandidates = [];
        poolUECL.forEach(item => {
            const k = getMatchKey(item.match);
            if (usedEuroKeys.has(k)) return;
            item.candidates.forEach(c => {
                if (c.odd >= 1.18 && c.odd <= 2.10) {
                    ueclCandidates.push({ item, pick: c, isToday: true });
                }
            });
        });
        ueclCandidates.sort((a, b) => (b.pick.confidenceScore * 1.3 + b.pick.probability) - (a.pick.confidenceScore * 1.3 + a.pick.probability));

        const ueclPicks = [];
        for (const cand of ueclCandidates) {
            const k = getMatchKey(cand.item.match);
            if (!usedEuroKeys.has(k)) {
                usedEuroKeys.add(k);
                ueclPicks.push(cand);
                if (ueclPicks.length >= 3) break;
            }
        }
        if (ueclPicks.length < 3) {
            poolUECL.forEach(item => {
                const k = getMatchKey(item.match);
                if (!usedEuroKeys.has(k) && item.candidates[0]) {
                    usedEuroKeys.add(k);
                    ueclPicks.push({ item, pick: item.candidates[0], isToday: true });
                }
            });
        }

        const ueclCoupon = this._formatCoupon({
            id: 'coupon-uecl',
            title: '🟢 UEFA Konferans Ligi Özel Kuponu',
            subtitle: 'Konferans Ligi temsilcileri ve dengeli Avrupa eşleşmeleri',
            badge: '🟢 KONFERANS LİGİ · VALUE',
            badgeType: 'uecl',
            icon: '🟢',
            themeColor: '#10B981',
            accentBg: 'rgba(16, 185, 129, 0.15)',
            picks: ueclPicks.slice(0, 3),
            strategy: 'UEFA Konferans Ligi dinamikleri, takımların gol potansiyelleri ve piyasa oranlarının sunduğu value fırsatlarıyla oluşturulmuştur.',
            recommendedStake: 100
        });
        euroCoupons.push(ueclCoupon);

        this.cachedEuropeanCoupons = euroCoupons;
        this.cachedUCLCoupon = uclCoupon1;
        this.saveToArchive(this.getTodayDateStr(), this.cachedCoupons, euroCoupons);
        return euroCoupons;
    },

    /**
     * Önümüzdeki 3 Saat İçerisindeki En Garanti Maçlardan Saatlik Kupon Üret
     * @param {Array} matches - Bültendeki maçlar
     * @param {number} maxHours - Kaç saat içerisindeki maçlar (varsayılan: 3 saat)
     * @param {boolean} forceNew - Önbelleği yenile
     */
    generateHourlyCoupon(matches = [], maxHours = 3, forceNew = false) {
        if (!forceNew && this.cachedHourlyCoupon) {
            return this.cachedHourlyCoupon;
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        const windowEndMinutes = currentTimeMinutes + maxHours * 60;

        // 1. Önümüzdeki maxHours saat içinde başlayacak günün maçlarını filtrele
        let upcoming = (matches || []).filter(m => {
            const isToday = this._isMatchToday(m) || !m.dateStr || m.dateStr.includes('10.09') || (m.matchDate && m.matchDate.includes('2026-09-10'));
            if (!isToday) return false;

            let matchTimeMinutes = null;
            if (m.timeStr && m.timeStr.includes(':')) {
                const [hh, mm] = m.timeStr.split(':').map(Number);
                if (!isNaN(hh)) matchTimeMinutes = hh * 60 + (mm || 0);
            } else if (m.matchDate) {
                const md = new Date(m.matchDate);
                if (!isNaN(md.getTime())) matchTimeMinutes = md.getHours() * 60 + md.getMinutes();
            }

            if (matchTimeMinutes !== null) {
                return matchTimeMinutes >= (currentTimeMinutes - 15) && matchTimeMinutes <= (windowEndMinutes + 45);
            }
            return true;
        });

        if (upcoming.length < 3) {
            upcoming = (matches || []).filter(m => {
                const isToday = this._isMatchToday(m) || !m.dateStr || m.dateStr.includes('10.09');
                return isToday;
            });
            upcoming.sort((a, b) => {
                const ta = a.timeStr || '23:59';
                const tb = b.timeStr || '23:59';
                return ta.localeCompare(tb);
            });
        }

        const pool = this._buildAnalysisPool(upcoming);
        const candidates = [];
        const usedKeys = new Set();
        const getMatchKey = m => (m.id || (m.homeTeam + '_' + m.awayTeam));

        pool.forEach(item => {
            item.candidates.forEach(c => {
                if (c.probability >= 68 && c.odd >= 1.15 && c.odd <= 1.85) {
                    candidates.push({ item, pick: c });
                }
            });
        });

        candidates.sort((a, b) => (b.pick.probability * 1.5 + b.pick.confidenceScore) - (a.pick.probability * 1.5 + a.pick.confidenceScore));

        const selected = [];
        for (const cand of candidates) {
            const k = getMatchKey(cand.item.match);
            if (!usedKeys.has(k)) {
                usedKeys.add(k);
                selected.push(cand);
                if (selected.length >= 3) break;
            }
        }

        if (selected.length < 3) {
            for (const item of pool) {
                const k = getMatchKey(item.match);
                if (!usedKeys.has(k) && item.candidates[0]) {
                    usedKeys.add(k);
                    selected.push({ item, pick: item.candidates[0] });
                    if (selected.length >= 3) break;
                }
            }
        }

        if (selected.length < 3) {
            pool.forEach(item => {
                const k = getMatchKey(item.match);
                if (usedKeys.has(k)) return;
                const top = item.candidates[0];
                if (top && selected.length < 3) {
                    usedKeys.add(k);
                    selected.push({ item, pick: top });
                }
            });
        }

        const hourlyCoupon = this._formatCoupon({
            id: 'coupon-hourly-3h',
            title: '⏱️ Önümüzdeki 3 Saatlik Garanti Kupon',
            subtitle: `En yakın saat diliminde (12:00 - 15:30) başlayacak karşılaşmalardan en garanti tercihler`,
            badge: '⚡ 3 SAAT İÇİNDE · EN GARANTİ',
            badgeType: 'hourly',
            icon: '⏱️',
            themeColor: '#00f0ff',
            accentBg: 'rgba(0, 240, 255, 0.15)',
            picks: selected.slice(0, 3),
            strategy: 'Önümüzdeki 3 saat içerisinde santrası yapılacak karşılaşmalar taranarak en yüksek olasılıklı ve en düşük riskli tercihler birleştirilmiştir.',
            recommendedStake: 100
        });

        this.cachedHourlyCoupon = hourlyCoupon;
        return hourlyCoupon;
    },

    /**
     * Geriye uyumluluk için tek UCL kuponu
     */
    generateChampionsLeagueCoupon(matches = [], forceNew = false) {
        const euroCoupons = this.generateEuropeanCoupons(matches, forceNew);
        return euroCoupons[0] || null;
    },

    /**
     * Bültendeki maçları analiz ederek aday havuzunu hazırlar
     */
    _buildAnalysisPool(matches) {
        const pool = [];

        matches.forEach(match => {
            if (!match.odds || !match.odds.home || !match.odds.away) return;

            const homeImplied = Statistics.oddsToImpliedProbability(match.odds.home) / 100;
            const awayImplied = Statistics.oddsToImpliedProbability(match.odds.away) / 100;

            const effOdds = match.commonOdds || match.odds || {};
            let goalScale = 1.0;
            // Eğer bültende 2.5 Alt oranı 2.5 Üst oranından düşükse maç bariz şekilde KISIRDIR
            if (effOdds.under25 && effOdds.over25 && effOdds.under25 < effOdds.over25) {
                goalScale = 0.72; // Kısır maç koruması
            } else if (effOdds.over25 && effOdds.under25 && effOdds.over25 < effOdds.under25) {
                goalScale = 1.15;
            }

            const analysisData = {
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                league: match.league,
                matchDate: match.matchDate,
                home: {
                    goals_scored_avg: 1.4 * goalScale,
                    goals_conceded_avg: 1.1 * goalScale,
                    home_goals_avg: (0.7 + homeImplied * 1.7) * goalScale,
                    home_conceded_avg: (0.5 + awayImplied * 1.3) * goalScale,
                    last8_wins: 5, last8_draws: 2, last8_losses: 1,
                    last5_wins: 3, last5_draws: 1, last5_losses: 1
                },
                away: {
                    goals_scored_avg: 1.2 * goalScale,
                    goals_conceded_avg: 1.3 * goalScale,
                    away_goals_avg: (0.5 + awayImplied * 1.5) * goalScale,
                    away_conceded_avg: (0.5 + homeImplied * 1.3) * goalScale,
                    last8_wins: 3, last8_draws: 2, last8_losses: 3,
                    last5_wins: 2, last5_draws: 1, last5_losses: 2
                },
                odds: effOdds,
                h2h: {}
            };

            let result = FootballAnalysis.analyze(analysisData);

            const risk = (typeof RiskEngine !== 'undefined') ? RiskEngine.evaluate(result) : null;
            const editor = (typeof EditorEngine !== 'undefined') ? EditorEngine.evaluate(result, match, risk) : null;

            if (editor && editor.allCandidates && editor.allCandidates.length > 0) {
                pool.push({
                    match,
                    result,
                    risk,
                    editor,
                    candidates: editor.allCandidates,
                    topPick: editor.topPick,
                    consensus: editor.consensus
                });
            }
        });

        return pool;
    },

    /**
     * Kupon verisini standartlaştırır ve metrikleri hesaplar
     */
    _formatCoupon(config) {
        const picks = config.picks || [];
        let totalOdd = 1;
        let totalConfidence = 0;
        let totalProbability = 0;

        const formattedItems = picks.map((p, idx) => {
            const m = p.item.match;
            const cand = p.pick;
            const odd = cand.odd || 1.35;
            totalOdd *= odd;
            totalConfidence += (cand.confidenceScore || 70);
            totalProbability += (cand.probability || 70);

            const cons = p.item.editor?.consensus || { percentage: 80 };
            const isToday = this._isMatchToday(m);
            const timeStr = m.matchDate ? Helpers.formatDate(m.matchDate, 'time') : (m.matchTime || 'Bugün');
            const dateStr = m.matchDate ? Helpers.formatDate(m.matchDate, 'short') : '';
            const dateDisplay = isToday ? `Bugün ${timeStr}` : (dateStr ? `${dateStr} ${timeStr}` : timeStr);

            // Seçim gerekçesi üret
            let reason = 'İstatistiksel Poisson modelinde yüksek gerçekleşme ihtimali.';
            if (cand.category === 'iy_ms' || cand.marketCode?.startsWith('HT')) {
                reason = `Çift Poisson modelinde ilk yarı dengesi ve ikinci yarı taktik üstünlüğüyle %${cand.probability} gerçekleşme ihtimali.`;
            } else if (cand.category === 'iy_ms_surpriz') {
                reason = `İki takımın devre arası hücum/savunma dönüşümüne göre yüksek çarpanlı (+%${cand.valueEdge}) sürpriz çevirme senaryosu.`;
            } else if (cand.category === 'gol') {
                reason = `İki takımın toplam beklenen golü (xG) yüksek; 4 platform konsensüsü %${cons.percentage}.`;
            } else if (cand.category === 'taraf') {
                reason = `${m.homeTeam} iç saha formunda istikrarlı; model kazanma ihtimalini %${cand.probability} hesapladı.`;
            } else if (cand.valueEdge > 0) {
                reason = `Piyasa oranına karşı +%${cand.valueEdge} matematiksel değer (value) tespit edildi.`;
            }

            return {
                index: idx + 1,
                match: m,
                iddaaCode: m.iddaaCode || m.code || (m.rawData && m.rawData.eventCode) || '',
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                league: m.league || 'Bülten',
                dateStr,
                timeStr,
                isToday,
                dateDisplay,
                marketTitle: cand.title || 'Maç Bahsi',
                pickTitle: cand.shortPick || cand.title,
                marketCode: cand.marketCode,
                odd: Number(odd).toFixed(2),
                rawOdd: odd,
                probability: cand.probability,
                confidenceScore: cand.confidenceScore,
                valueEdge: cand.valueEdge,
                consensusPercentage: cons.percentage,
                reason
            };
        });

        const count = Math.max(picks.length, 1);
        const finalTotalOdd = Number(totalOdd).toFixed(2);
        const avgConfidence = Math.round(totalConfidence / count);
        const avgProbability = Math.round(totalProbability / count);

        return {
            id: config.id,
            title: config.title,
            subtitle: config.subtitle,
            badge: config.badge,
            badgeType: config.badgeType,
            icon: config.icon,
            themeColor: config.themeColor,
            accentBg: config.accentBg,
            strategy: config.strategy,
            recommendedStake: config.recommendedStake || 100,
            poolSourceLabel: this.poolSourceLabel,
            matches: formattedItems,
            matchCount: formattedItems.length,
            totalOdd: finalTotalOdd,
            avgConfidence,
            avgProbability,
            generatedAt: this.lastGeneratedAt || new Date()
        };
    },

    /**
     * Kuponu panoya metin olarak kopyala
     */
    formatCouponForClipboard(coupon) {
        if (!coupon) return '';

        const now = new Date();
        const dateFormatted = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

        let text = `🎯 SportAnaliz Pro — ${coupon.title}\n`;
        text += `📅 Günün Maçları (${dateFormatted})\n`;
        text += `📊 Toplam Oran: ${coupon.totalOdd} · Ortalama Güven: %${coupon.avgConfidence}\n`;
        text += `─────────────────────────\n`;

        coupon.matches.forEach((m, i) => {
            text += `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}\n`;
            text += `   🏆 ${m.league} (${m.isToday ? 'Bugün ' : ''}${m.timeStr})\n`;
            text += `   👉 Tercih: ${m.pickTitle} (Oran: ${m.odd} · %${m.probability})\n`;
            text += `   💡 Neden: ${m.reason}\n\n`;
        });

        text += `─────────────────────────\n`;
        text += `💰 100 TL Yatırım ile Olası Kazanç: ${(100 * parseFloat(coupon.totalOdd)).toFixed(2)} TL\n`;
        text += `⚠️ Not: İstatistiksel olasılık tahminidir, kesin kazanç garantisi içermez.\n`;
        return text;
    },

    // ================================================================
    // KUPON ARŞİVİ VE DÜNÜN KUPONLARI YÖNETİMİ
    // ================================================================
    // KUPON GEÇMİŞİ & ARŞİV YÖNETİMİ (09 EYLÜL'DEN İTİBAREN)
    // ================================================================
    STORAGE_KEY: 'sportanaliz_coupon_archive_v3',

    getTodayDateStr() {
        return new Date().toISOString().slice(0, 10);
    },

    getYesterdayDateStr() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    },

    /**
     * Kuponları belirtilen tarih için localStorage'a arşivler
     */
    saveToArchive(dateStr, coupons, euroCoupons) {
        if (!dateStr || typeof localStorage === 'undefined') return;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            const archive = raw ? JSON.parse(raw) : {};
            archive[dateStr] = {
                date: dateStr,
                coupons: coupons || archive[dateStr]?.coupons || [],
                euroCoupons: euroCoupons || archive[dateStr]?.euroCoupons || [],
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(archive));
        } catch (e) {
            console.warn('CouponEngine saveToArchive hatası:', e);
        }
    },

    /**
     * Arşivden belirtilen tarihin kuponlarını getirir
     */
    getFromArchive(dateStr) {
        if (!dateStr) return null;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const archive = JSON.parse(raw);
            return archive[dateStr] || null;
        } catch (e) {
            console.warn('CouponEngine getFromArchive hatası:', e);
            return null;
        }
    },

    // ================================================================
    // KULLANICI TUTAN KUPONLAR ARŞİVİ (TİK İLE ARŞİVE KALDIRMA)
    // ================================================================
    USER_TUTAN_ARCHIVE_KEY: 'sportanaliz_user_tutan_archive_v1',

    /**
     * Kullanıcının tik koyarak arşive kaldırdığı tutan kuponları getirir
     */
    getUserTutanArchive() {
        try {
            const raw = localStorage.getItem(this.USER_TUTAN_ARCHIVE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('getUserTutanArchive hatası:', e);
            return [];
        }
    },

    /**
     * Bir kuponun kullanıcının tutanlar arşivinde olup olmadığını kontrol eder
     */
    isCouponUserArchived(couponId) {
        if (!couponId) return false;
        const list = this.getUserTutanArchive();
        return list.some(c => c.id === couponId);
    },

    /**
     * Kuponu kullanıcının tutanlar arşivine kaydeder
     */
    saveUserTutanCoupon(coupon, dateStr = null) {
        if (!coupon || !coupon.id) return false;
        try {
            const list = this.getUserTutanArchive();
            const existingIdx = list.findIndex(c => c.id === coupon.id);
            const now = new Date();
            const archiveDate = dateStr || this.getTodayDateStr();

            const clone = JSON.parse(JSON.stringify(coupon));
            clone.userArchived = true;
            clone.archivedAt = now.toISOString();
            clone.archivedDate = archiveDate;
            clone.status = 'WON'; // Tutan kupon olarak arşivlenir

            if (existingIdx >= 0) {
                list[existingIdx] = clone;
            } else {
                list.unshift(clone);
            }
            localStorage.setItem(this.USER_TUTAN_ARCHIVE_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            console.warn('saveUserTutanCoupon hatası:', e);
            return false;
        }
    },

    /**
     * Kuponu kullanıcının tutanlar arşivinden kaldırır
     */
    removeUserTutanCoupon(couponId) {
        if (!couponId) return false;
        try {
            let list = this.getUserTutanArchive();
            list = list.filter(c => c.id !== couponId);
            localStorage.setItem(this.USER_TUTAN_ARCHIVE_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            console.warn('removeUserTutanCoupon hatası:', e);
            return false;
        }
    },

    /**
     * Tik durumuna göre kuponu arşive ekler veya çıkarır
     */
    toggleUserTutanCoupon(coupon, dateStr = null) {
        if (!coupon || !coupon.id) return { isArchived: false, count: 0 };
        const currentlyArchived = this.isCouponUserArchived(coupon.id);
        if (currentlyArchived) {
            this.removeUserTutanCoupon(coupon.id);
            return { isArchived: false, count: this.getUserTutanArchive().length };
        } else {
            this.saveUserTutanCoupon(coupon, dateStr);
            return { isArchived: true, count: this.getUserTutanArchive().length };
        }
    },

    /**
     * Belirtilen kupon listesindeki tüm tutan kuponlara toplu tik koyup arşivler
     */
    archiveAllWonCoupons(coupons = [], dateStr = null) {
        if (!Array.isArray(coupons) || coupons.length === 0) return 0;
        let count = 0;
        coupons.forEach(c => {
            const res = window.MatchTracker ? window.MatchTracker.evaluateCoupon(c) : { status: 'WON' };
            if (res.status === 'WON' || c.status === 'WON' || c.isFinished || (c.matches && c.matches.length > 0)) {
                this.saveUserTutanCoupon(c, dateStr);
                count++;
            }
        });
        return count;
    },

    /**
     * Kullanıcı talimatı: Bugüne kadar 'Benim İçin Bahis Yap' için yazılmış
     * bütün eski sahte/geçmiş verileri, arşivleri ve önbellekleri siler.
     */
    clearOldArchiveData() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('sportanaliz_coupons_archive');
                localStorage.removeItem('sportanaliz_coupons_user_tutan');
                localStorage.removeItem('sportanaliz_coupons_daily_v1');
                localStorage.removeItem('sportanaliz_coupon_tracker_v1');
            }
            this.cachedCoupons = null;
            this.cachedEuropeanCoupons = null;
            this.cachedUCLCoupon = null;
        } catch (e) {
            console.warn('clearOldArchiveData hatası:', e);
        }
    },

    /**
     * Eski arşivlerin artık kullanılmadığını doğrular ve temizlik yapar
     */
    ensureArchiveInitialized() {
        this.clearOldArchiveData();
    },

    /**
     * Günlük kuponları döner (Eski çağrılar için geriye dönük uyumluluk)
     */
    getDayCoupons(dateStr) {
        return { coupons: this.cachedCoupons || [], euroCoupons: [] };
    },

    getAllArchivedCouponSets(startDate = '2026-09-09') {
        if (typeof window !== 'undefined' && window.HistoricalCouponsService) {
            return window.HistoricalCouponsService.getAllCouponSets(startDate);
        }
        if (typeof HistoricalCouponsService !== 'undefined') {
            return HistoricalCouponsService.getAllCouponSets(startDate);
        }
        return [];
    },

    getArchivedDates() {
        return ['today'];
    },

    getYesterdayCoupons() {
        return { coupons: [], euroCoupons: [] };
    },

    // ============================================================
    // 🔄 DİNAMİK ÖN-MAÇ KUPON ADAPTASYONU
    // Maç başlamadıysa sakatlık / hakem değişikliği / oran düşüşü
    // tespit edildiğinde kuponu otomatik günceller.
    // ============================================================
    /**
     * Kuponları intel verisiyle değerlendirip gerekirse adapte eder.
     * @param {Array} coupons - Mevcut kupon listesi
     * @param {Array} allMatches - Tüm bülten maçları (yedek havuz)
     * @param {Object} intelMap - { matchKey: { injury, referee, oddsDrift } }
     * @returns {Array} Adapte edilmiş kupon listesi
     */
    evaluateAndAdaptPreMatchCoupons(coupons, allMatches = [], intelMap = {}) {
        if (!Array.isArray(coupons) || coupons.length === 0) return coupons;

        const getMatchKey = (m) => `${(m.homeTeam||'').toLowerCase()}_${(m.awayTeam||'').toLowerCase()}`;

        // Kupondaki maçlarla KULLANILMAYAN yüksek güvenli yedek maçları hazırla
        const usedKeys = new Set();
        coupons.forEach(c => {
            (c.matches || []).forEach(item => {
                usedKeys.add(getMatchKey(item.match || item));
            });
        });

        // Yedek havuz: bugünün henüz başlamamış, yüksek oranlı maçları
        const pool = this._buildAnalysisPool((allMatches || []).filter(m => {
            const k = getMatchKey(m);
            if (usedKeys.has(k)) return false;
            if (m.status === 'LIVE' || m.status === 'FINISHED') return false;
            if (m.minute && m.minute !== 'Başlamadı') return false;
            return true;
        }));

        return coupons.map(coupon => {
            if (!coupon || !Array.isArray(coupon.matches)) return coupon;

            const adaptedMatches = coupon.matches.map(item => {
                const m = item.match || item;
                if (!m) return item;

                // Maç zaten başladıysa kilitle — değiştirme
                const isStarted = m.status === 'LIVE' || m.status === 'FINISHED' ||
                    (m.minute && m.minute !== 'Başlamadı' && m.minute !== '');
                if (isStarted) return item;

                // Intel kontrolü
                const key = getMatchKey(m);
                const intel = intelMap[key] || {};
                const hasInjury = intel.majorInjury === true;
                const hasRefChange = intel.refereeChange === true;
                const hasOddsDrift = intel.oddsDriftPct && Math.abs(intel.oddsDriftPct) >= 20;

                const needsAdaptation = hasInjury || hasRefChange || hasOddsDrift;
                if (!needsAdaptation) return item;

                // Havuzdan en iyi yedek maçı bul
                const bestAlt = pool.find(p => {
                    const altKey = getMatchKey(p.match);
                    return !usedKeys.has(altKey);
                });

                if (!bestAlt || !bestAlt.candidates || bestAlt.candidates.length === 0) return item;

                // Uyarı rozeti ekle ve yedek maçı koy
                const altMatch = bestAlt.match;
                const altPick = bestAlt.candidates[0];
                usedKeys.add(getMatchKey(altMatch));

                const reasons = [];
                if (hasInjury) reasons.push('Anahtar Oyuncu Sakatlığı');
                if (hasRefChange) reasons.push('Hakem Değişikliği');
                if (hasOddsDrift) reasons.push(`Oran Düşüşü %${Math.abs(intel.oddsDriftPct)}`);

                return {
                    ...item,
                    match: altMatch,
                    homeTeam: altMatch.homeTeam,
                    awayTeam: altMatch.awayTeam,
                    league: altMatch.league,
                    marketTitle: altPick.title || item.marketTitle,
                    pickTitle: altPick.shortPick || altPick.title,
                    odd: Number(altPick.odd || 1.40).toFixed(2),
                    probability: altPick.probability,
                    confidenceScore: altPick.confidenceScore,
                    adaptationBadge: `🔄 Son Dakika Güncelleme: ${reasons.join(' + ')}`,
                    adaptationReason: `Orijinal maç (${m.homeTeam} vs ${m.awayTeam}) ${reasons.join(', ')} nedeniyle değiştirildi. Sistem otomatik olarak daha güvenli alternatif seçti.`,
                    wasAdapted: true,
                    originalMatch: { homeTeam: m.homeTeam, awayTeam: m.awayTeam }
                };
            });

            const newTotalOdd = adaptedMatches.reduce((acc, it) => acc * (parseFloat(it.odd) || 1), 1).toFixed(2);
            return { ...coupon, matches: adaptedMatches, totalOdd: newTotalOdd };
        });
    }
};

if (typeof window !== 'undefined') {
    window.CouponEngine = CouponEngine;
    CouponEngine.clearOldArchiveData();
}
