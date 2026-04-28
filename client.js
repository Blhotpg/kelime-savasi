// =============================================
// KELIME SAVASI — İstemci (Frontend)
// Socket.io ile sunucuya bağlanır
// =============================================

// Sunucuya bağlan (aynı adresten otomatik)
const socket = io();

// =============================================
// DEĞİŞKENLER
// =============================================
let beniOyuncuAdi = '';   // Bu taraftaki oyuncunun adı
let odaKodum = '';         // Mevcut oda kodu
let siradaBenMiyim = false; // Şu an sıra bende mi?

// =============================================
// EKRAN YÖNETİMİ
// =============================================

// Belirtilen ekranı göster, diğerlerini gizle
function ekranGoster(id) {
  document.querySelectorAll('.ekran').forEach(e => e.classList.remove('aktif'));
  document.getElementById(id).classList.add('aktif');
}

// =============================================
// GİRİŞ İŞLEMLERİ
// =============================================

// Oda oluştur butonu tıklandı
function odaOlustur() {
  const ad = document.getElementById('oyuncuAdiInput').value.trim();
  if (!ad) {
    hataGoster('Lütfen bir ad gir!');
    return;
  }
  beniOyuncuAdi = ad;
  // Sunucuya oda oluşturma isteği gönder
  socket.emit('odaOlustur', ad);
}

// Odaya katıl butonu tıklandı
function odayaKatil() {
  const ad = document.getElementById('oyuncuAdiInput').value.trim();
  const kod = document.getElementById('odaKoduInput').value.trim().toUpperCase();

  if (!ad) {
    hataGoster('Lütfen bir ad gir!');
    return;
  }
  if (kod.length !== 6) {
    hataGoster('Oda kodu 6 karakter olmalı!');
    return;
  }

  beniOyuncuAdi = ad;
  // Sunucuya katılma isteği gönder
  socket.emit('odayaKatil', { odaKodu: kod, oyuncuAdi: ad });
}

// Hata mesajı göster
function hataGoster(mesaj) {
  const el = document.getElementById('hatamesaji');
  el.textContent = mesaj;
  el.classList.remove('gizli');
  setTimeout(() => el.classList.add('gizli'), 3000);
}

// =============================================
// BEKLEME EKRANI
// =============================================

// Oda kodunu panoya kopyala
function koduKopyala() {
  navigator.clipboard.writeText(odaKodum).then(() => {
    const btn = document.querySelector('.btn-kopyala');
    btn.textContent = '✅ Kopyalandı!';
    setTimeout(() => btn.textContent = '📋 Kodu Kopyala', 2000);
  });
}

// =============================================
// OYUN FONKSİYONLARI
// =============================================

// Klavyeden harf tıklandı
function harfTiklandi(harf) {
  // Sıra bende değilse işlem yapma
  if (!siradaBenMiyim) {
    bilgiMesajGoster('Sıra sende değil!', 'uyari');
    return;
  }
  // Sunucuya harfi gönder
  socket.emit('harfEkle', harf);
}

// İtiraz et
function itirazEt() {
  if (siradaBenMiyim) {
    bilgiMesajGoster('Kendi sıranda itiraz edemezsin!', 'uyari');
    return;
  }
  socket.emit('itirazEt');
}

// Bilgi mesajı göster
function bilgiMesajGoster(mesaj, tip = 'normal') {
  const el = document.getElementById('bilgiMesaj');
  el.textContent = mesaj;
  el.style.color = tip === 'uyari' ? '#ff7a92' : '#6b7280';
  setTimeout(() => el.textContent = '', 2000);
}

// Harf ekranını güncelle
function harfEkraniGuncelle(harfler) {
  const el = document.getElementById('harfEkran');
  const sayiEl = document.getElementById('harfSayisi');

  if (!harfler || harfler.length === 0) {
    el.innerHTML = '<span class="harf-placeholder">Henüz harf yok...</span>';
    sayiEl.textContent = '0 harf';
  } else {
    // Her harfi ayrı span'a koy (animasyon için)
    el.innerHTML = harfler.split('').map((h, i) =>
      `<span style="animation-delay:${i * 0.05}s" class="harf-ani">${h.toUpperCase()}</span>`
    ).join('');
    sayiEl.textContent = `${harfler.length} harf`;
  }
}

// Klavyeyi aktif/pasif yap
function klavyeAktif(aktif) {
  document.querySelectorAll('.tus').forEach(tus => {
    tus.disabled = !aktif;
  });
  document.getElementById('itirazBtn').disabled = aktif;
}

// Oyuncu kartlarını güncelle
function oyuncuKartlariGuncelle(oyuncular, siradakiOyuncu) {
  const [o1, o2] = oyuncular;

  // Ad ve skor
  document.getElementById('oyuncuAd1').textContent = o1.ad;
  document.getElementById('oyuncuSkor1').textContent = o1.skor;
  document.getElementById('oyuncuAd2').textContent = o2.ad;
  document.getElementById('oyuncuSkor2').textContent = o2.skor;

  // Aktif oyuncuyu vurgula
  const kart1 = document.getElementById('oyuncuKart1');
  const kart2 = document.getElementById('oyuncuKart2');

  if (siradakiOyuncu === o1.ad) {
    kart1.classList.add('aktif');
    kart2.classList.remove('aktif');
  } else {
    kart2.classList.add('aktif');
    kart1.classList.remove('aktif');
  }

  // Sıra göstergesi
  document.getElementById('siraGostergesi').textContent =
    siradakiOyuncu === beniOyuncuAdi ? '⚡ SENİN SIRAN' : `⏳ ${siradakiOyuncu}`;
}

// =============================================
// TUR SONU OVERLAY
// =============================================

function turSonuGoster(data) {
  const overlay = document.getElementById('turSonuOverlay');
  const emoji = document.getElementById('sonucEmoji');
  const baslik = document.getElementById('sonucBaslik');
  const aciklama = document.getElementById('sonucAciklama');
  const skor = document.getElementById('skorOzet');

  // Kazandım mı kaybettim mi?
  const bendKazandim = data.kazanan === beniOyuncuAdi;

  emoji.textContent = bendKazandim ? '🏆' : '💀';
  baslik.textContent = bendKazandim ? 'KAZANDIN!' : 'KAYBETTİN!';
  baslik.style.color = bendKazandim ? '#22c55e' : '#ff3b5c';

  // Sebep açıklaması
  let aciklamaMetni = '';
  if (data.sebep === 'kelimeTamamlandi') {
    aciklamaMetni = `"${data.tamamlananKelime?.toUpperCase()}" kelimesini tamamladı!`;
  } else if (data.sebep === 'gecersizHarf') {
    aciklamaMetni = `"${data.mevcutHarfler?.toUpperCase()}" ile başlayan kelime yok!`;
  } else if (data.sebep === 'itiraz') {
    aciklamaMetni = bendKazandim
      ? 'İtirazın haklıydı! Karşı taraf puan aldı 🎯'
      : 'Haksız itiraz! Sen puan kaybettin ⚠️';
  }
  aciklama.textContent = aciklamaMetni;

  // Skor özeti
  if (data.oyuncular && data.oyuncular.length === 2) {
    skor.innerHTML = `
      <span>${data.oyuncular[0].ad}: ${data.oyuncular[0].skor}</span>
      <span style="color:var(--gri)">—</span>
      <span>${data.oyuncular[1].ad}: ${data.oyuncular[1].skor}</span>
    `;
  }

  overlay.classList.remove('gizli');

  // 3 saniye sonra kapat
  setTimeout(() => {
    overlay.classList.add('gizli');
  }, 3000);
}

// =============================================
// SOCKET.IO OLAYLARI — Sunucudan gelen mesajlar
// =============================================

// Oda başarıyla oluşturuldu
socket.on('odaOlusturuldu', (data) => {
  odaKodum = data.odaKodu;
  // Oda kodunu bekleme ekranında göster
  document.getElementById('odaKoduGoster').textContent = data.odaKodu;
  ekranGoster('beklemeEkrani');
});

// Oyun başladı (2 oyuncu hazır)
socket.on('oyunBasladi', (data) => {
  // Oyun ekranına geç
  ekranGoster('oyunEkrani');

  // Oyuncu kartlarını ayarla
  oyuncuKartlariGuncelle(data.oyuncular, data.siradakiOyuncu);

  // Harf ekranını temizle
  harfEkraniGuncelle('');

  // Tur numarasını göster
  document.getElementById('turNo').textContent = `TUR ${data.tur}`;

  // Sıra bende mi?
  siradaBenMiyim = data.siradakiOyuncu === beniOyuncuAdi;
  klavyeAktif(siradaBenMiyim);
});

// Harf eklendi (birisi harf ekledi)
socket.on('harfEklendi', (data) => {
  // Harf ekranını güncelle
  harfEkraniGuncelle(data.mevcutHarfler);

  // Kimin eklediğini göster
  const kim = data.ekleyenOyuncu === beniOyuncuAdi ? 'Sen' : data.ekleyenOyuncu;
  bilgiMesajGoster(`${kim} "${data.eklenenHarf.toUpperCase()}" ekledi`);

  // Sırayı güncelle
  siradaBenMiyim = data.siradakiOyuncu === beniOyuncuAdi;
  klavyeAktif(siradaBenMiyim);

  // Oyuncu kartlarını güncelle (sıra vurgusu)
  // Mevcut oyuncuları al
  const ad1 = document.getElementById('oyuncuAd1').textContent;
  const skor1 = parseInt(document.getElementById('oyuncuSkor1').textContent);
  const ad2 = document.getElementById('oyuncuAd2').textContent;
  const skor2 = parseInt(document.getElementById('oyuncuSkor2').textContent);
  oyuncuKartlariGuncelle(
    [{ ad: ad1, skor: skor1 }, { ad: ad2, skor: skor2 }],
    data.siradakiOyuncu
  );
});

// Tur bitti
socket.on('turBitti', (data) => {
  // Klavyeyi kapat
  klavyeAktif(false);
  siradaBenMiyim = false;

  // Skor güncelle
  oyuncuKartlariGuncelle(data.oyuncular, '');

  // Overlay göster
  turSonuGoster(data);
});

// Yeni tur
socket.on('yeniTur', (data) => {
  // Harf ekranını temizle
  harfEkraniGuncelle('');

  // Tur numarasını güncelle
  document.getElementById('turNo').textContent = `TUR ${data.tur}`;

  // Oyuncu kartlarını güncelle
  oyuncuKartlariGuncelle(data.oyuncular, data.siradakiOyuncu);

  // Sıra bende mi?
  siradaBenMiyim = data.siradakiOyuncu === beniOyuncuAdi;
  klavyeAktif(siradaBenMiyim);
});

// Sunucu hata mesajı
socket.on('hata', (mesaj) => {
  bilgiMesajGoster(mesaj, 'uyari');
});

// Rakip ayrıldı
socket.on('rakipAyrildi', (data) => {
  alert(data.mesaj + '\nOda kapatıldı.');
  // Giriş ekranına dön
  location.reload();
});

// =============================================
// KLAVYE DESTEĞİ (fiziksel klavye)
// =============================================
document.addEventListener('keydown', (e) => {
  // Oyun ekranı açık değilse çalışma
  if (!document.getElementById('oyunEkrani').classList.contains('aktif')) return;

  const harf = e.key.toLowerCase();
  const gecerliHarfler = 'abcçdefgğhıijklmnoöprsştuüvyz';
  if (harf.length === 1 && gecerliHarfler.includes(harf)) {
    harfTiklandi(harf);
  }
});