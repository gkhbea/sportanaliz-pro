/**
 * SportAnaliz Pro - Giriş Noktası (Entry Point)
 * Bulut / Web sunucusunda (Render, Vercel) proxy-server.js'i başlatır.
 * Masaüstü ortamında (Electron) profesyonel Windows masaüstü uygulamasını açar.
 */

let electron = null;
try {
    electron = require('electron');
} catch (e) {
    electron = null;
}

if (!electron || !electron.app) {
    console.log('🌐 Web Sunucusu Ortamı Algılandı (Render/Cloud/Node).');
    console.log('🚀 proxy-server.js başlatılıyor...');
    require('./proxy-server.js');
} else {
    // Masaüstü Electron Penceresi
    const { app, BrowserWindow, Menu, Tray, shell, globalShortcut } = electron;
    const http = require('http');
    const path = require('path');
    const fs = require('fs');

    let mainWindow = null;
    let tray = null;
    let isQuitting = false;

    const SERVER_PORT = process.env.PORT || 3001;
    const SERVER_URL = `http://localhost:${SERVER_PORT}`;

    app.name = 'SportAnaliz Pro';
    try {
        app.setPath('userData', path.join(app.getPath('appData'), 'SportAnaliz Pro'));
    } catch(e) {}

    // Tekil oturum kontrolü (İki kez açılmasını engeller)
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });

        app.whenReady().then(async () => {
            // 1. Yerel Express Proxy Sunucusunu Başlat
            try {
                require('./proxy-server.js');
                console.log('[DESKTOP] Express proxy sunucusu başlatıldı.');
            } catch (err) {
                console.warn('[DESKTOP] Proxy sunucusu kontrolü:', err.message);
            }

            // 2. Sunucunun hazır olmasını bekle (en fazla 10 saniye)
            await waitForServer(SERVER_URL, 10000);

            // 3. Ana Pencereyi Oluştur
            createWindow();

            // 4. Sistem Tepsisi (Tray) İkonunu Oluştur
            createTray();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    createWindow();
                } else if (mainWindow) {
                    mainWindow.show();
                }
            });
        });
    }

    function waitForServer(url, timeoutMs) {
        const start = Date.now();
        return new Promise((resolve) => {
            const check = () => {
                http.get(url, (res) => {
                    resolve(true);
                }).on('error', () => {
                    if (Date.now() - start > timeoutMs) {
                        resolve(false);
                    } else {
                        setTimeout(check, 250);
                    }
                });
            };
            check();
        });
    }

    function createWindow() {
        const iconPath = path.join(__dirname, 'icon.ico');
        const iconPngPath = path.join(__dirname, 'icon.png');
        const appIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(iconPngPath) ? iconPngPath : null);

        mainWindow = new BrowserWindow({
            width: 1440,
            height: 920,
            minWidth: 1080,
            minHeight: 720,
            title: 'SportAnaliz Pro — Yapay Zeka Destekli Analiz & Tahmin Platformu',
            backgroundColor: '#06070d',
            autoHideMenuBar: true,
            icon: appIcon,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                spellcheck: false
            }
        });

        // Pencere hazır olduğunda göster ve ekranı kapla
        mainWindow.once('ready-to-show', () => {
            mainWindow.maximize();
            mainWindow.show();
            mainWindow.focus();
        });

        // Menü çubuğunu gizle
        Menu.setApplicationMenu(null);

        // Kısayollar (F5 / Ctrl+R yenileme, F12 inceleme)
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
                mainWindow.reload();
            } else if (input.key === 'F12') {
                mainWindow.webContents.toggleDevTools();
            } else if (input.key === 'F11') {
                mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
        });

        // Dış bağlantıları (Github, Nesine vb.) varsayılan Windows tarayıcısında aç
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http:') || url.startsWith('https:')) {
                if (!url.includes('localhost:') && !url.includes('127.0.0.1:')) {
                    shell.openExternal(url);
                    return { action: 'deny' };
                }
            }
            return { action: 'allow' };
        });

        // Sayfayı yükle
        mainWindow.loadURL(SERVER_URL).catch(() => {
            mainWindow.loadFile(path.join(__dirname, 'index.html'));
        });

        // Kapat butonuna basıldığında tamamen kapat veya tepsiye gönder
        mainWindow.on('close', (event) => {
            if (!isQuitting) {
                // Kullanıcı isterse doğrudan kapanır
                isQuitting = true;
            }
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    function createTray() {
        const iconPath = path.join(__dirname, 'icon.ico');
        const iconPngPath = path.join(__dirname, 'icon.png');
        const trayIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(iconPngPath) ? iconPngPath : null);

        if (!trayIcon) return;

        try {
            tray = new Tray(trayIcon);
            tray.setToolTip('SportAnaliz Pro — Masaüstü');

            const contextMenu = Menu.buildFromTemplate([
                {
                    label: '⚡ SportAnaliz Pro Aç',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.show();
                            mainWindow.focus();
                        } else {
                            createWindow();
                        }
                    }
                },
                {
                    label: '🔄 Sayfayı Yenile',
                    click: () => {
                        if (mainWindow) mainWindow.reload();
                    }
                },
                { type: 'separator' },
                {
                    label: '❌ Çıkış',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]);

            tray.setContextMenu(contextMenu);
            tray.on('double-click', () => {
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.focus();
                    } else {
                        mainWindow.show();
                    }
                }
            });
        } catch (e) {
            console.warn('[DESKTOP] Tray oluşturulamadı:', e.message);
        }
    }

    app.on('before-quit', () => {
        isQuitting = true;
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
