/**
 * SportAnaliz Pro - Giriş Noktası (Entry Point)
 * Bulut / Web sunucusunda (Render, Vercel) proxy-server.js'i başlatır.
 * Masaüstü ortamında (Electron yüklüyse) masaüstü penceresini açar.
 */

let electron = null;
try {
    electron = require('electron');
} catch (e) {
    electron = null;
}

if (!electron || !electron.app) {
    console.log('🌐 Web Sunucusu Ortamı Algılandı (Render/Cloud).');
    console.log('🚀 proxy-server.js başlatılıyor...');
    require('./proxy-server.js');
} else {
    // Masaüstü Electron Penceresi
    const { app, BrowserWindow, Menu, shell } = electron;
    const http = require('http');
    const path = require('path');
    const fs = require('fs');
    let mainWindow = null;
    const SERVER_PORT = process.env.PORT || 3001;
    const SERVER_URL = `http://localhost:${SERVER_PORT}`;

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });

        app.whenReady().then(async () => {
            try {
                require('./proxy-server.js');
                console.log('[ELECTRON] Express proxy sunucusu başlatıldı.');
            } catch (err) {
                console.error('[ELECTRON] Proxy sunucusu başlatılırken hata:', err);
            }

            await waitForServer(SERVER_URL, 15000);
            createWindow();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
                        setTimeout(check, 300);
                    }
                });
            };
            check();
        });
    }

    function createWindow() {
        const iconPath = path.join(__dirname, 'icon.ico');
        const windowOptions = {
            width: 1400,
            height: 900,
            minWidth: 1080,
            minHeight: 700,
            title: 'SportAnaliz Pro',
            backgroundColor: '#06070d',
            autoHideMenuBar: true,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false
            }
        };

        if (fs.existsSync(iconPath)) {
            windowOptions.icon = iconPath;
        }

        mainWindow = new BrowserWindow(windowOptions);
        mainWindow.once('ready-to-show', () => {
            mainWindow.maximize();
            mainWindow.show();
        });

        Menu.setApplicationMenu(null);
        mainWindow.loadURL(SERVER_URL).catch(() => {
            mainWindow.loadFile(path.join(__dirname, 'index.html'));
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
