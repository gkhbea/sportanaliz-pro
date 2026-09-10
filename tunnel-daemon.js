const localtunnel = require('localtunnel');

let currentTunnel = null;

async function startTunnel() {
  try {
    if (currentTunnel) {
      try { currentTunnel.close(); } catch (e) {}
    }

    const tunnel = await localtunnel({ port: 3001 });
    currentTunnel = tunnel;
    console.log('ACTIVE_TUNNEL_URL: ' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel bağlantısı kapandı, 3 saniye sonra yeniden bağlanılıyor...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel hatası:', err ? err.message : err);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Tunnel başlatma hatası:', err ? err.message : err);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();

// Process'in kapanmasını önlemek için event loop'u canlı tut
setInterval(() => {
  // Heartbeat keep-alive
}, 10000);

