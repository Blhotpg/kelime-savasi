// =============================================
// KELIME SAVASI - Sunucu (Backend)
// Node.js + Express + Socket.io kullanıyoruz
// =============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Express uygulaması oluştur
const app = express();
// HTTP sunucusu oluştur (Socket.io için gerekli)
const server = http.createServer(app);
// Socket.io'yu sunucuya bağla
const io = new Server(server);

// Statik dosyaları sun (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// OYUN VERİLERİ
// =============================================

// Aktif odaları tutan nesne
// Örnek: { "oda123": { oyuncular: [], mevcutHarfler: "", sira: 0 } }
const odalar = {};

// Basit Türkçe kelime listesi (gerçek projede daha büyük bir liste kullan)
const turkceKelimeler = [
  "araba", "armut", "aslan", "ayak", "balik", "bardak", "bebek", "bisiklet",
  "bulut", "cadde", "ceket", "çanta", "çiçek", "deniz", "dondurma", "dünya",
  "elma", "fare", "fener", "fincan", "gece", "gelincik", "gemi", "gitar",
  "gökyüzü", "güneş", "hayat", "horoz", "irmak", "islık", "kale", "kalem",
  "kapı", "kaplan", "kar", "kedi", "kemik", "kilim", "kitap", "köpek",
  "köy", "kuş", "lamba", "limon", "masa", "mavi", "melek", "meyve",
  "nehir", "okul", "orman", "oyun", "pamuk", "pencere", "portakal",
  "resim", "rüzgar", "saat", "sabun", "sandal", "sarı", "sebze", "sepet",
  "şeker", "şehir", "tablo", "taş", "telefon", "tren", "uçak", "uyku",
  "üzüm", "vapur", "yağmur", "yaprak", "yıldız", "yol", "yunus", "zeytin",
  "bahçe", "banka", "çarşı", "doktor", "ekran", "fabrika", "gazete",
  "hastane", "ilaç", "jandarma", "köprü", "mektup", "noter", "opera",
  "pazar", "radyo", "sinema", "tiyatro", "uzman", "vitrin", "yazar",
  "anahtar", "bilgisayar", "çikolata", "davul", "ekmek", "fırın",
  "havlu", "iskemle", "jakuzi", "kavanoz", "lokanta", "müzik",
  "parfüm", "robot", "sözlük", "tatil", "üniversite", "vanilya"
];

// =============================================
// YARDIMCI FONKSİYONLAR
// =============================================

// Verilen harf dizisiyle başlayan kelime var mı kontrol et
function kelimeVarMi(harfler) {
  return turkceKelimeler.some(kelime => kelime.startsWith(harfler));
}

// Verilen harf dizisi tam bir kelime mi?
function tamKelimeMi(harfler) {
  return turkceKelimeler.includes(harfler) && harfler.length >= 3;
}

// Rastgele oda kodu üret (6 karakter)
function odaKoduUret() {
  const karakterler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = '';
  for (let i = 0; i < 6; i++) {
    kod += karakterler[Math.floor(Math.random() * karakterler.length)];
  }
  return kod;
}

// =============================================
// SOCKET.IO BAĞLANTILARI
// =============================================

io.on('connection', (socket) => {
  console.log(`Yeni oyuncu bağlandı: ${socket.id}`);

  // --- ODA OLUŞTUR ---
  socket.on('odaOlustur', (oyuncuAdi) => {
    // Benzersiz oda kodu üret
    let odaKodu;
    do {
      odaKodu = odaKoduUret();
    } while (odalar[odaKodu]);

    // Odayı kaydet
    odalar[odaKodu] = {
      oyuncular: [{ id: socket.id, ad: oyuncuAdi, skor: 0 }],
      mevcutHarfler: '',   // Şu ana kadar eklenen harfler
      sira: 0,             // Hangi oyuncunun sırası (index)
      oyunBasladi: false,
      tur: 1
    };

    // Oyuncuyu odaya al
    socket.join(odaKodu);
    socket.odaKodu = odaKodu;
    socket.oyuncuAdi = oyuncuAdi;

    // Oyuncuya oda kodunu gönder
    socket.emit('odaOlusturuldu', { odaKodu, oyuncuAdi });
    console.log(`Oda oluşturuldu: ${odaKodu} - Oyuncu: ${oyuncuAdi}`);
  });

  // --- ODAYA KATIL ---
  socket.on('odayaKatil', ({ odaKodu, oyuncuAdi }) => {
    const oda = odalar[odaKodu];

    // Oda bulunamadı
    if (!oda) {
      socket.emit('hata', 'Bu oda kodu geçersiz! Tekrar dene.');
      return;
    }

    // Oda dolu (2 oyuncu max)
    if (oda.oyuncular.length >= 2) {
      socket.emit('hata', 'Bu oda dolu! Başka bir odaya katıl.');
      return;
    }

    // Oyun zaten başlamış
    if (oda.oyunBasladi) {
      socket.emit('hata', 'Oyun zaten başlamış!');
      return;
    }

    // Oyuncuyu odaya ekle
    oda.oyuncular.push({ id: socket.id, ad: oyuncuAdi, skor: 0 });
    socket.join(odaKodu);
    socket.odaKodu = odaKodu;
    socket.oyuncuAdi = oyuncuAdi;

    console.log(`${oyuncuAdi} odaya katıldı: ${odaKodu}`);

    // Oyun başlasın! İki oyuncu da hazır
    oda.oyunBasladi = true;

    // Tüm odaya oyun başladı bilgisi gönder
    io.to(odaKodu).emit('oyunBasladi', {
      oyuncular: oda.oyuncular.map(o => ({ ad: o.ad, skor: o.skor })),
      siradakiOyuncu: oda.oyuncular[oda.sira].ad,
      mevcutHarfler: '',
      tur: 1
    });
  });

  // --- HARF EKLE ---
  socket.on('harfEkle', (harf) => {
    const odaKodu = socket.odaKodu;
    const oda = odalar[odaKodu];

    if (!oda || !oda.oyunBasladi) return;

    // Sıra bu oyuncuda mı?
    const siradakiOyuncu = oda.oyuncular[oda.sira];
    if (siradakiOyuncu.id !== socket.id) {
      socket.emit('hata', 'Sıra sende değil!');
      return;
    }

    // Harfi ekle
    const yeniHarfler = oda.mevcutHarfler + harf.toLowerCase();

    // Geçerli Türkçe harf mi?
    const gecerliHarfler = 'abcçdefgğhıijklmnoöprsştuüvyz';
    if (!gecerliHarfler.includes(harf.toLowerCase())) {
      socket.emit('hata', 'Geçersiz harf!');
      return;
    }

    // Bu harflerle başlayan kelime var mı?
    if (!kelimeVarMi(yeniHarfler)) {
      // Kelime yok — bu oyuncu kaybetti!
      const kaybeden = siradakiOyuncu.ad;
      const kazanan = oda.oyuncular[1 - oda.sira].ad;

      // Kazananın skorunu artır
      oda.oyuncular[1 - oda.sira].skor += 1;

      io.to(odaKodu).emit('turBitti', {
        sebep: 'gecersizHarf',
        kaybeden,
        kazanan,
        mevcutHarfler: yeniHarfler,
        oyuncular: oda.oyuncular.map(o => ({ ad: o.ad, skor: o.skor }))
      });

      // Yeni tur başlat
      setTimeout(() => yeniTurBaslat(odaKodu), 3000);
      return;
    }

    // Tam kelime mi? (3+ harf, Türkçe sözlükte var)
    if (tamKelimeMi(yeniHarfler)) {
      // Kelime tamamlandı — bu oyuncu kaybetti!
      const kaybeden = siradakiOyuncu.ad;
      const kazanan = oda.oyuncular[1 - oda.sira].ad;

      oda.oyuncular[1 - oda.sira].skor += 1;

      io.to(odaKodu).emit('turBitti', {
        sebep: 'kelimeTamamlandi',
        kaybeden,
        kazanan,
        tamamlananKelime: yeniHarfler,
        oyuncular: oda.oyuncular.map(o => ({ ad: o.ad, skor: o.skor }))
      });

      setTimeout(() => yeniTurBaslat(odaKodu), 3000);
      return;
    }

    // Normal harf ekleme — sırayı değiştir
    oda.mevcutHarfler = yeniHarfler;
    oda.sira = 1 - oda.sira; // 0 → 1 veya 1 → 0

    // Tüm odaya güncelleme gönder
    io.to(odaKodu).emit('harfEklendi', {
      mevcutHarfler: yeniHarfler,
      siradakiOyuncu: oda.oyuncular[oda.sira].ad,
      ekleyenOyuncu: socket.oyuncuAdi,
      eklenenHarf: harf
    });
  });

  // --- İTİRAZ ET ---
  socket.on('itirazEt', () => {
    const odaKodu = socket.odaKodu;
    const oda = odalar[odaKodu];

    if (!oda || !oda.oyunBasladi) return;

    // Sıra bu oyuncuda değilse itiraz edebilir
    const siradakiOyuncu = oda.oyuncular[oda.sira];
    if (siradakiOyuncu.id === socket.id) {
      socket.emit('hata', 'Kendi sıranda itiraz edemezsin!');
      return;
    }

    // Mevcut harflerle başlayan kelime var mı kontrol et
    const kelimeVar = turkceKelimeler.some(k =>
      k.startsWith(oda.mevcutHarfler) && k !== oda.mevcutHarfler
    );

    let kaybeden, kazanan;

    if (kelimeVar) {
      // Kelime var — itiraz eden kaybetti
      kaybeden = socket.oyuncuAdi;
      kazanan = siradakiOyuncu.ad;
      siradakiOyuncu.skor += 1;
    } else {
      // Kelime yok — sıradaki oyuncu kaybetti
      kaybeden = siradakiOyuncu.ad;
      kazanan = socket.oyuncuAdi;
      const kazananObj = oda.oyuncular.find(o => o.id === socket.id);
      if (kazananObj) kazananObj.skor += 1;
    }

    io.to(odaKodu).emit('turBitti', {
      sebep: 'itiraz',
      kaybeden,
      kazanan,
      mevcutHarfler: oda.mevcutHarfler,
      oyuncular: oda.oyuncular.map(o => ({ ad: o.ad, skor: o.skor }))
    });

    setTimeout(() => yeniTurBaslat(odaKodu), 3000);
  });

  // --- BAĞLANTI KESİLDİ ---
  socket.on('disconnect', () => {
    const odaKodu = socket.odaKodu;
    if (!odaKodu || !odalar[odaKodu]) return;

    console.log(`${socket.oyuncuAdi} ayrıldı (${odaKodu})`);

    // Diğer oyuncuya bildir
    socket.to(odaKodu).emit('rakipAyrildi', {
      mesaj: `${socket.oyuncuAdi} oyundan ayrıldı.`
    });

    // Odayı sil
    delete odalar[odaKodu];
  });
});

// =============================================
// YENİ TUR BAŞLAT
// =============================================
function yeniTurBaslat(odaKodu) {
  const oda = odalar[odaKodu];
  if (!oda) return;

  oda.mevcutHarfler = '';
  oda.tur += 1;
  // Sırayı değiştir — önceki turda kaybeden başlasın
  // (sira zaten tur sonu sırasındadır, değiştirme)

  io.to(odaKodu).emit('yeniTur', {
    tur: oda.tur,
    siradakiOyuncu: oda.oyuncular[oda.sira].ad,
    oyuncular: oda.oyuncular.map(o => ({ ad: o.ad, skor: o.skor }))
  });
}

// =============================================
// SUNUCUYU BAŞLAT
// =============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});