/**
 * authService.js — Supabase Auth Servisi
 */
const AuthService = {
    currentUser: null,

    /**
     * Email/şifre ile kayıt
     */
    async register(email, password, displayName) {
        const client = SupabaseConfig.getClient();
        if (!client) throw new Error('Supabase bağlantısı yok');

        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } }
        });

        if (error) throw error;

        // Profil oluştur
        if (data.user) {
            await client.from('profiles').upsert({
                id: data.user.id,
                display_name: displayName
            });
        }

        return data;
    },

    /**
     * Email/şifre ile giriş
     */
    async login(email, password) {
        const client = SupabaseConfig.getClient();
        if (!client) throw new Error('Supabase bağlantısı yok');

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;

        this.currentUser = data.user;
        this.updateAuthUI();
        return data;
    },

    /**
     * Çıkış
     */
    async logout() {
        const client = SupabaseConfig.getClient();
        if (!client) return;

        await client.auth.signOut();
        this.currentUser = null;
        this.updateAuthUI();
    },

    /**
     * Mevcut oturumu kontrol et
     */
    async checkSession() {
        const client = SupabaseConfig.getClient();
        if (!client) return null;

        const { data: { session } } = await client.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.updateAuthUI();
        }
        return session;
    },

    /**
     * Auth state değişikliklerini dinle
     */
    onAuthStateChange(callback) {
        const client = SupabaseConfig.getClient();
        if (!client) return;

        client.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.updateAuthUI();
            if (callback) callback(event, session);
        });
    },

    /**
     * Auth UI güncelle
     */
    updateAuthUI() {
        const authArea = document.getElementById('auth-area');
        const drawerAuth = document.getElementById('mobile-drawer-auth');

        if (this.currentUser) {
            const name = this.currentUser.user_metadata?.display_name || 
                         this.currentUser.email?.split('@')[0] || 'Kullanıcı';
            const initial = name[0].toUpperCase();
            const userMarkup = `
                <div class="user-info" id="user-menu-toggle">
                    <div class="user-avatar">${initial}</div>
                    <span class="user-name">${Helpers.escapeHtml(name)}</span>
                </div>
                <button class="btn btn-ghost btn-sm" id="btn-logout" title="Çıkış">🚪</button>
            `;
            if (authArea) {
                authArea.innerHTML = userMarkup;
                document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
            }
            if (drawerAuth) {
                drawerAuth.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div class="user-avatar">${initial}</div>
                            <div>
                                <strong style="color:#fff;font-size:0.9rem;display:block;">${Helpers.escapeHtml(name)}</strong>
                                <span style="font-size:0.75rem;color:var(--accent-cyan);">Aktif Üye</span>
                            </div>
                        </div>
                        <button class="btn btn-ghost btn-sm" id="btn-drawer-logout" title="Çıkış">Çıkış</button>
                    </div>
                `;
                document.getElementById('btn-drawer-logout')?.addEventListener('click', () => this.logout());
            }
        } else {
            if (authArea) {
                authArea.innerHTML = `<button class="btn btn-primary btn-sm" id="btn-login">Giriş Yap</button>`;
                document.getElementById('btn-login')?.addEventListener('click', () => {
                    Helpers.openModal('modal-auth');
                });
            }
            if (drawerAuth) {
                drawerAuth.innerHTML = `<button class="btn btn-primary btn-sm btn-block" id="btn-mobile-login">Giriş Yap / Kayıt Ol</button>`;
                document.getElementById('btn-mobile-login')?.addEventListener('click', () => {
                    if (window.App && App.closeMobileDrawer) App.closeMobileDrawer();
                    Helpers.openModal('modal-auth');
                });
            }
        }
    },

    /**
     * Kullanıcı giriş yapmış mı?
     */
    isLoggedIn() {
        return !!this.currentUser;
    },

    /**
     * Kullanıcı ID
     */
    getUserId() {
        return this.currentUser?.id || null;
    }
};

window.AuthService = AuthService;
