const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
const SERVER_PORT = process.env.PORT || 3001;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Tekil instance kilidi (Aynı anda birden fazla uygulamanın açılmasını engeller)
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
        // Express backend'ini başlat
        try {
            require('./proxy-server.js');
            console.log('[ELECTRON] Express proxy sunucusu başlatıldı.');
        } catch (err) {
            console.error('[ELECTRON] Proxy sunucusu başlatılırken hata:', err);
        }

        // Sunucunun hazır olmasını bekle ve pencereyi aç
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
                    console.warn('[ELECTRON] Sunucu yanıt vermedi, doğrudan yüklemeye çalışılıyor.');
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
    const fs = require('fs');

    const windowOptions = {
        width: 1400,
        height: 900,
        minWidth: 1080,
        minHeight: 700,
        title: 'SportAnaliz Pro - Spor Analiz ve Tahmin Platformu',
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

    // Sayfa hazır olduğunda pencereyi göster
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    // Menü çubuğunu gizle
    Menu.setApplicationMenu(null);

    // Dış linkleri varsayılan sistem tarayıcısında aç
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.loadURL(SERVER_URL).catch((err) => {
        console.error('[ELECTRON] Sayfa yüklenemedi:', err);
        mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Tüm pencereler kapandığında çıkış yap (Windows/Linux)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    console.log('[ELECTRON] Uygulama kapatılıyor...');
});
