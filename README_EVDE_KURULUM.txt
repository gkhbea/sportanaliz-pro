===================================================================
     ⚡ SportAnaliz Pro — Evde Geliştirmeye Devam Etme Rehberi ⚡
===================================================================

Bu arşiv projenin tüm kaynak kodlarını, proxy sunucusunu, yapay zeka analiz motorlarını, 
sanal kupon sistemini ve Electron masaüstü yapılandırmasını içerir.

-------------------------------------------------------------------
🛠️ EVDEKİ BİLGİSAYARDA ÇALIŞTIRMA ADIMLARI:
-------------------------------------------------------------------

1. ADIM (Gereksinim):
   - Evdeki bilgisayarınızda Node.js kurulu olmalıdır (Önerilen: LTS sürümü).
   - Node.js yoksa https://nodejs.org adresinden ücretsiz indirip kurabilirsiniz.

2. ADIM (Kolay Başlatma):
   - Klasör içindeki "BASLAT.bat" dosyasına çift tıklayın.
   - İlk çalıştırmada gerekli kütüphaneleri otomatik yükler, tarayıcınızda ve masaüstü uygulamasında projeyi açar.

3. ADIM (Manuel Komutlar - İsteğe Bağlı):
   Terminal veya PowerShell açıp klasör dizininde şu komutları çalıştırabilirsiniz:
   
   - Paketleri Yükleme:
     npm install

   - Web / Proxy Sunucusunu Başlatma:
     npm start

   - Electron Masaüstü Uygulaması Olarak Çalıştırma:
     npm run electron

   - Yeni Windows (.exe) Kurulum Paketi Üretme:
     npm run dist

-------------------------------------------------------------------
📁 PROJE DİZİN YAPISI:
-------------------------------------------------------------------
- index.html               : Ana arayüz ve sayfa yapıları
- main.js                  : Electron masaüstü uygulama çekirdeği
- proxy-server.js          : Canlı skor, Nesine, Misli, İddaa API proxy sunucusu
- js/analysis/             : Poisson, Risk, In-Play Sniper, Squad Rating motorları
- js/components/           : Sanal Kupon, Value/Canlı Panel, Kasa, Analiz Panelleri
- js/services/             : Canlı skor servisi, veri yönetimi, Supabase entegrasyonu
- css/                     : Tema, responsive stiller ve animasyonlar
===================================================================
