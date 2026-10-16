# ⚽ SportAnaliz Pro — Akıllı İddaa & Maç Analiz Platformu

Yapay zeka destekli istihbarat, anlık Nesine & Bilyoner bülten entegrasyonu ve otomatik kupon motoru.

---

## 🚀 Evdeki Bilgisayarda Çalıştırma (3 Adım)

Projenizi evdeki bilgisayarınızda hemen çalıştırmak için:

1. **Projeyi İndirin / Güncelleyin:**
   ```bash
   git clone https://github.com/gkhbea/sportanaliz-pro.git
   cd sportanaliz-pro
   ```
   *(Eğer zaten indirdiyseniz: `git pull origin master`)*

2. **Paketleri Yükleyin:**
   ```bash
   npm install
   ```

3. **Başlatın:**
   ```bash
   npm start
   ```

Tarayıcınızı açıp **`http://localhost:3001`** adresine gidin. Platform tüm analizler ve kuponlarla hazır!

---

## 🌐 Ücretsiz 7/24 İnternette Yayınlama (Koyeb veya Vercel)

Eğer telefonunuzdan veya dışarıdan istediğiniz zaman girmek isterseniz:

### Seçenek 1: Koyeb (Önerilen — En Hızlı)
1. **[koyeb.com](https://www.koyeb.com)** adresine gidin ve **GitHub** ile giriş yapın.
2. **"Create App"** -> **GitHub** -> **`sportanaliz-pro`** deponuzu seçin.
3. Doğrudan yeşil **"Deploy"** butonuna basın. 1 dakika içinde size özel canlı linkiniz hazır olur.

### Seçenek 2: Vercel
1. **[vercel.com](https://vercel.com)** adresine gidip **GitHub** ile oturum açın.
2. **Add New... -> Project** deyin ve **`sportanaliz-pro`** deponuzu import edin.
3. **Deploy** butonuna tıklayın.

---

## 📋 Kupon ve Bahis Kuralları

- **Resmi Piyasa Doğrulaması:** Sadece Nesine ve Bilyoner'de bahsi fiilen açılmış olan maçlar ve marketler kupona alınır.
- **İY / MS Koruması (MTID 5):** İlk Yarı / Maç Sonu kuponları için İddaa'nın resmi `MTID === 5` kodu bültende taranır; İY/MS bahsi açılmamış maçlar (örn. bazı alt kupa maçları) kesinlikle kupona yazılmaz.
- **Oran Alt Sınırı:** Hiçbir kupona 1.20 oranının altında maç eklenmez ($\ge 1.20$).
- **Maksimum 2 Tekrar:** Bir maç günlük 6 kupon genelinde en fazla 2 kuponda yer alabilir.
- **Günlük 6 + 1 Kupon:**
  1. Garantör Banko
  2. İdeal Günlük
  3. Gol Yağmuru
  4. **İY / MS 5'li Sistem Kuponu**
  5. Çifte Şans
  6. Değer (Value)
  7. Sistem 4-5-6
