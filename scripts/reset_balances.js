/**
 * reset_balances.js — SportAnaliz Pro
 * Bakiye ve Kasa Sıfırlayıcı
 * 
 * 1 Kasım / 2 Kasım 2026 itibariyle:
 * - Başlangıç Kasası: 500 TL
 * - Güncel Kasa: 500 TL
 * - Sanal Cüzdan: 500 TL
 */

const fs = require('fs');
const path = require('path');

console.log('=====================================================');
console.log('⚡ SPORTANALIZ PRO — BAKİYE & KASA SIFIRLAMA İŞLEMİ');
console.log('=====================================================');

const defaultWallet = {
    initialBalance: 500,
    currentBalance: 500,
    totalStaked: 0,
    totalWon: 0,
    totalProfit: 0,
    winCount: 0,
    lossCount: 0,
    pendingCount: 0,
    history: [],
    createdAt: new Date().toISOString(),
    resetAt: new Date().toISOString(),
    resetReason: "Kullanıcı talebi doğrultusunda 500 TL taban bakiye sıfırlaması"
};

const defaultProfile = {
    userName: 'Pro Bahisçi',
    startingBankroll: 500,
    currentBankroll: 500,
    stakeStrategy: 'fixed',
    fixedStakeAmount: 50,
    minStakeAmount: 50,
    percentageStakeRate: 5,
    dailyProfitGoal: 500,
    weeklyProfitGoal: 2500,
    stopLossDaily: 500,
    currency: 'TL',
    createdAt: '2026-11-01',
    resetAt: new Date().toISOString()
};

// 1. data_cache/user_wallet_state.json
const cacheDir = path.join(__dirname, '..', 'data_cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const walletPath = path.join(cacheDir, 'user_wallet_state.json');
fs.writeFileSync(walletPath, JSON.stringify(defaultWallet, null, 2), 'utf8');
console.log('✅ [1/2] Cüzdan durumu sıfırlandı -> 500 TL:', walletPath);

const profilePath = path.join(cacheDir, 'user_profile_state.json');
fs.writeFileSync(profilePath, JSON.stringify(defaultProfile, null, 2), 'utf8');
console.log('✅ [2/2] Kasa profili sıfırlandı -> 500 TL:', profilePath);

console.log('=====================================================');
console.log('🎉 BAKİYELER BAŞARIYLA 500 TL OLARAK SIFIRLANDI!');
console.log('=====================================================');
