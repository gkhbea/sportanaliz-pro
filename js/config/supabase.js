/**
 * supabase.js — Supabase Client Konfigürasyonu
 * Kullanıcının sağladığı resmi Supabase URL ve Publishable API anahtarlarıyla otomatik bağlanır.
 */
const SupabaseConfig = {
    DEFAULT_URL: 'https://jcblvrwcckpuxrrpzcsx.supabase.co',
    DEFAULT_KEY: 'sb_publishable_THUOZv7vHWU1s_gLnT4ysA_Ylv-HN68',
    client: null,
    isConnected: false,

    /**
     * Supabase client'ı başlat
     */
    init(url, anonKey) {
        const targetUrl = url || this.DEFAULT_URL;
        const targetKey = anonKey || this.DEFAULT_KEY;

        if (!targetUrl || !targetKey) {
            console.warn('Supabase: URL veya Key eksik');
            return false;
        }

        try {
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                this.client = supabase.createClient(targetUrl, targetKey);
                this.isConnected = true;
                this.updateStatusUI(true);
                if (typeof Helpers !== 'undefined' && Helpers.storage) {
                    Helpers.storage.set('supabase_url', targetUrl);
                    Helpers.storage.set('supabase_key', targetKey);
                }
                console.log('✅ Supabase bağlantısı başarıyla kuruldu:', targetUrl);
                return true;
            } else {
                console.warn('Supabase SDK henüz yüklenmedi.');
                return false;
            }
        } catch (err) {
            console.error('Supabase init hatası:', err);
            this.isConnected = false;
            this.updateStatusUI(false);
            return false;
        }
    },

    /**
     * Kayıtlı bilgilerle veya varsayılan URL/Key ile otomatik bağlan
     */
    autoConnect() {
        const url = (typeof Helpers !== 'undefined' && Helpers.storage) 
            ? (Helpers.storage.get('supabase_url') || this.DEFAULT_URL) 
            : this.DEFAULT_URL;
        const key = (typeof Helpers !== 'undefined' && Helpers.storage) 
            ? (Helpers.storage.get('supabase_key') || this.DEFAULT_KEY) 
            : this.DEFAULT_KEY;

        return this.init(url, key);
    },

    /**
     * Bağlantı durumu UI güncelle
     */
    updateStatusUI(connected) {
        const statusEl = document.getElementById('supabase-status');
        if (statusEl) {
            statusEl.innerHTML = connected
                ? '<span class="status-dot online"></span> Bağlı (Supabase Cloud)'
                : '<span class="status-dot offline"></span> Bağlı değil';
        }
    },

    /**
     * Client al
     */
    getClient() {
        if (!this.client && this.autoConnect) {
            this.autoConnect();
        }
        return this.client;
    },

    /**
     * Bağlantıyı kes
     */
    disconnect() {
        this.client = null;
        this.isConnected = false;
        if (typeof Helpers !== 'undefined' && Helpers.storage) {
            Helpers.storage.remove('supabase_url');
            Helpers.storage.remove('supabase_key');
        }
        this.updateStatusUI(false);
    }
};

window.SupabaseConfig = SupabaseConfig;
