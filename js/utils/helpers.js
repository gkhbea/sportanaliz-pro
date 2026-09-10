/**
 * helpers.js — Genel yardımcı fonksiyonlar
 */
const Helpers = {
    /**
     * Toast bildirimi göster
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Modal aç/kapat
     */
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    },

    /**
     * Tarih formatlama
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        
        const options = {
            short: { day: '2-digit', month: '2-digit', year: 'numeric' },
            long: { day: 'numeric', month: 'long', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            full: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        
        return d.toLocaleString('tr-TR', options[format] || options.short);
    },

    /**
     * Saat formatlama
     */
    formatTime(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Takım kısaltması oluştur
     */
    teamAbbreviation(name) {
        if (!name) return '??';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
        return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
    },

    /**
     * Renk üret (olasılık → renk)
     */
    probabilityColor(prob) {
        if (prob >= 60) return '#10B981';
        if (prob >= 40) return '#F59E0B';
        if (prob >= 25) return '#3B82F6';
        return '#6B7280';
    },

    /**
     * Heat map rengi (0-1 arası)
     */
    heatmapColor(value, maxValue = 1) {
        const intensity = Math.min(value / maxValue, 1);
        if (intensity < 0.01) return 'rgba(107, 114, 128, 0.1)';
        
        const r = Math.round(124 + (0 - 124) * intensity);
        const g = Math.round(58 + (240 - 58) * intensity);
        const b = Math.round(237 + (255 - 237) * intensity);
        const a = 0.15 + intensity * 0.6;
        
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    },

    /**
     * Güven seviyesi metni
     */
    confidenceLabel(score) {
        if (score >= 80) return { text: 'Çok Yüksek', color: '#10B981' };
        if (score >= 60) return { text: 'Yüksek', color: '#3B82F6' };
        if (score >= 40) return { text: 'Orta', color: '#F59E0B' };
        return { text: 'Düşük', color: '#EF4444' };
    },

    /**
     * Risk seviyesi metni
     */
    riskLabel(score) {
        if (score >= 70) return { text: 'Yüksek', color: '#EF4444' };
        if (score >= 40) return { text: 'Orta', color: '#F59E0B' };
        return { text: 'Düşük', color: '#10B981' };
    },

    /**
     * Debounce
     */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * LocalStorage güvenli okuma/yazma
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch { /* quota exceeded */ }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch {}
        }
    },

    /**
     * UUID oluştur
     */
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },

    /**
     * HTML escape
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Sayı formatlama (binlik ayraç)
     */
    formatNumber(num) {
        return new Intl.NumberFormat('tr-TR').format(num);
    }
};

window.Helpers = Helpers;
