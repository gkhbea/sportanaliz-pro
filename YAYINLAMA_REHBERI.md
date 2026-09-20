# SportAnaliz Pro — 7/24 Ücretsiz Web Sitesi & Supabase Kurulum Rehberi

Bu rehber, **SportAnaliz Pro** uygulamanızı hiçbir ücret ödemeden internette 7/24 canlı yayına almanızı, kuponları bulutta saklamanızı ve cep telefonunuz dahil her yerden kesintisiz erişmenizi sağlar.

---

## 1. ADIM: Supabase Veritabanını Tek Tıkla Kurma (2 Dakika)

Projeniz için hazırlanan tüm tablolar ve izinler supabase_schema.sql dosyasında hazırdır.

1. Tarayıcınızdan **[Supabase Dashboard](https://supabase.com/dashboard)** sayfasına gidin.
2. Projenizi seçin (Mevcut projeniz: jcblvrwcckpuxrrpzcsx).
3. Sol menüdeki **SQL Editor** simgesine tıklayın.
4. **+ New Query** butonuna basın.
5. Proje klasörünüzdeki **supabase_schema.sql** dosyasının tüm içeriğini kopyalayıp editöre yapıştırın.
6. Sağ alttaki yeşil **RUN** butonuna tıklayın.

> ✅ **Tebrikler!** daily_coupons (günlük kuponlar), irtual_wallet (sanal kasa) ve nalysis_history (maç karnesi) tabloları bulutta hazır hale geldi.

---

## 2. ADIM: Web Sitesini İnternette Yayına Alma (Render.com)

**Render.com**, Node.js sunucumuzu ve web sitemizi **%100 ücretsiz** olarak internete açar.

### Kolay Kurulum Adımları:
1. **[GitHub](https://github.com)** üzerinde ücretsiz bir hesap açın ve yeni bir depo (Repository) oluşturun (Örn: sportanaliz-pro).
2. Bilgisayarınızdaki proje dosyalarını bu depoya yükleyin.
3. **[Render.com](https://render.com)** adresine gidip ücretsiz üye olun.
4. **New +** -> **Web Service** seçeneğine tıklayın.
5. GitHub deponuzu bağlayın ve seçin.
6. Karşınıza gelen ayarlar ekranında şu bilgileri girin:
   - **Name:** sportanaliz-pro (veya istediğiniz bir isim)
   - **Environment:** Node
   - **Build Command:** 
pm install
   - **Start Command:** 
ode proxy-server.js
   - **Instance Type:** Free
7. **Create Web Service** butonuna tıklayın.

> 🚀 Yaklaşık 1-2 dakika içinde siteniz internete açılır ve size özel bir internet adresi verilir:
> **https://sportanaliz-pro.onrender.com**

---

## 3. ADIM: 7/24 Hiç Uyumadan Kesintisiz Çalıştırma (UptimeRobot)

Render ücretsiz planda 15 dakika ziyaret edilmezse sunucuyu uyku moduna alır. Sunucunun **hiç uyumadan 7/24 maçları takip etmesi ve kuponları sonuçlandırması** için:

1. **[UptimeRobot.com](https://uptimerobot.com)** adresine ücretsiz üye olun.
2. Dashboard'da **+ Add New Monitor** butonuna tıklayın.
3. Şu ayarları yapın:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** SportAnaliz Canlı Takip
   - **URL (or IP):** https://sportanaliz-pro.onrender.com/api/health *(Kendi Render linkinizi yazın)*
   - **Monitoring Interval:** 5 minutes
4. **Create Monitor** butonuna tıklayın.

> ⚡ **Artık bitti!** UptimeRobot her 5 dakikada bir sunucunuza sinyal gönderir, Render sunucunuz **asla uyumaz** ve 7/24 arka planda kuponları ve maçları canlı takip eder.

---

## 4. ADIM: Cep Telefonundan Uygulama (Mobil PWA) Olarak Kullanma

1. Telefonunuzun internet tarayıcısından (Chrome veya Safari) sitenizin adresine gidin:
   https://sportanaliz-pro.onrender.com
2. Tarayıcı menüsünü açın:
   - **Android (Chrome):** Üç noktaya dokunun -> **Ana ekrana ekle (Uygulamayı yükle)** deyin.
   - **iPhone (Safari):** Paylaş butonuna dokunun -> **Ana Ekrana Ekle** deyin.
3. Telefonunuzun ana ekranına tıpkı App Store / Play Store'dan indirilmiş gibi **SportAnaliz Pro** ikonu gelir.
4. Telefonunuzdan açtığınızda bilgisayarda tutulan kuponları, sanal kasayı ve canlı maçları anlık olarak 1:1 görürsünüz!

---

## Özet & Kontrol Listesi

- [x] supabase_schema.sql dosyası hazırlandı.
- [x] Kuponlar ve Sanal Kasa için Supabase bulut senkronizasyonu kodlandı.
- [x] API servisleri bulut/üretim ortamına dinamik hale getirildi.
- [ ] Supabase SQL editöründe supabase_schema.sql çalıştırılacak.
- [ ] Render.com üzerinde ücretsiz Web Service başlatılacak.
- [ ] UptimeRobot pingi tanımlanacak.
