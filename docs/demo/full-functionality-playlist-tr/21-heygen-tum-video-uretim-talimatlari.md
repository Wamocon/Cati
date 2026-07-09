# HeyGen Tüm Video Üretim Talimatları - Türkçe

Tarih: 8 Temmuz 2026  
Dil: Türkçe  
Gizlilik: STRICTLY CONFIDENTIAL  
Amaç: Full playlist videolarını HeyGen içinde doğru medya, doğru ses ve doğru sahne mantığıyla üretmek.

## Ana Kural

Full playlist videolarında ana görsel Waleri avatarı değildir. Ana görsel, kod tabanında kaydedilmiş ürün ekran videosudur.

Doğru yapı:

1. Kısa Waleri avatar girişi.
2. İlgili tam ürün ekran kaydı.
3. Türkçe seslendirme bu ekran kaydının üzerine.
4. Gerekirse kısa Waleri avatar kapanışı.

Yanlış yapı:

- Tüm sahneleri Waleri avatarı olarak bırakmak.
- Eski HeyGen intro kliplerini full walkthrough yerine kullanmak.
- `qa_output/heygen-platform-intro` altındaki kısa trailer/intro medyasını eğitim videolarının ana medyası yapmak.
- Script'i tek uzun avatar sahnesi olarak generate etmek.

## Kullanılacak Gerçek Medya Klasörü

Günlük HeyGen üretimi için temiz klasör:

`qa_output/video-production-tr/`

Bu klasörde her video için ayrı klasör vardır. Her klasör içinde:

- `script-tr.md`
- `screen-recording-master.webm`
- `README.md`

Tam s?reli ana kaynak:

`qa_output/full-playlist-recordings-tr-full/clips/`

HeyGen i?in temiz kullan?lacak dosyalar:

`qa_output/video-production-tr/<video-folder>/<video-folder>.webm`

HeyGen upload i?in tercih edilen dosya klas?r ad?yla ayn?d?r, ?rnek: `02-ceo-management-walkthrough.webm`. `screen-recording-master.webm` ayn? medyan?n i? canonical hardlink kayna?? olarak klas?rde kal?r.

`video-production-tr` alt?ndaki kay?t dosyalar?, tam s?reli ana kay?tlar?n hardlink kopyalar?d?r. Bu nedenle g?nl?k HeyGen ?retiminde her zaman `video-production-tr` kullan?lmal?d?r; `full-playlist-recordings-tr-full` sadece master kaynak olarak korunur.

Mevcut durum: 19 videonun tamam? 8 Temmuz 2026 tarihinde T?rk?e aray?zle, full timing modunda yeniden kaydedildi ve recorder QA'den ge?ti. Eski k?sa preview kay?tlar? ve `de` isimli eski kay?tlar final m??teri videosu i?in kullan?lmamal?d?r.

G?rsel stil: final kay?tlar?nda b?y?k turkuaz ?er?eve, siyah tooltip veya ?ngilizce overlay kart? kullan?lmaz. ?r?n ekran? temiz kal?r; sadece estetik mouse hareketi, hover, click pulse ve hafif focus efekti g?r?n?r.

Ek kalite kural?: `qa_output/video-production-tr/feature-coverage-checklist.md` dosyas?ndaki ?zellik kapsam? kar??lanmadan hi?bir video HeyGen final ?retimine g?nderilmez. Script'te anlat?lan ?zellik ekranda g?r?nmelidir; g?r?nm?yorsa UAT/provider/human-approval s?n?r? seslendirmede a??k?a anlat?lmal?d?r.

## HeyGen Proje Yapısı

HeyGen içinde önerilen klasör:

`1Cati Turkish Full Playlist`

Her video için ayrı draft:

- `01 - 1Cati Pitch TR`
- `02 - 1Cati CEO Management Walkthrough TR`
- `03 - 1Cati Training 00 Orientation TR`
- devamı aynı numara düzeniyle.

Mevcut bozuk `1Cati CEO Management Walkthrough TR` draft'ı generate edilmemelidir; çünkü ara sahneler avatar görseliyle kalmıştır. Yeni temiz draft açılmalı veya mevcut draft düzeltilene kadar production olarak kabul edilmemelidir.

## Dosya Yükleme

Önce gerçek kayıt dosyası HeyGen'e yüklenir. Upload başarısız olursa:

1. Chrome içinde `chrome://extensions` açılır.
2. Codex Chrome extension detaylarına girilir.
3. `Allow access to file URLs` aktif edilir.
4. HeyGen sayfası yenilenir ve upload tekrar denenir.

Alternatif olarak dosya Windows File Explorer'dan HeyGen `My Media` alanına manuel sürüklenir.

HeyGen WebM kabul etmezse kayıt MP4/H.264'e dönüştürülmelidir. `ffmpeg` şu an PATH üzerinde yok; bu nedenle dönüştürme yapılmadan önce `ffmpeg` kurulmalı veya HeyGen'in WebM upload kabulü test edilmelidir.

## Her Video İçin Sahne Şablonu

| Bölüm | Görsel | Ses | Not |
|---|---|---|---|
| Intro | Waleri avatar | Türkçe hook ve bağlam | 10-30 sn, sakin ve profesyonel |
| Ana bölüm | Tam ürün ekran kaydı | Türkçe script voiceover | Kaynak video tam ekrana yayılır, avatar görünmez |
| Kapanış | Waleri avatar veya ürün kaydının son temiz karesi | Net özet ve sonraki adım | 10-25 sn, gereksiz satış dili yok |

Senkron kuralı:

- Ürün ekran kaydı ile Türkçe ses aynı akış hissini vermelidir.
- Ses medyadan en fazla yüzde 10-15 uzun/kısa olmalıdır.
- Fark daha büyükse HeyGen içinde videoyu aşırı hızlandırmak yerine ekran kaydı yeniden alınır veya script iki bölüme ayrılır.
- Ürün kaydı source audio içeriyorsa kapatılır; sadece HeyGen voiceover kullanılır.

## Full Playlist Medya Eşleştirmesi

| Video | Temiz üretim klasörü | HeyGen ana medya |
|---:|---|---|
| 01 | `qa_output/video-production-tr/01-pitch-video-1cati-in-90-saniye/` | `screen-recording-master.webm` |
| 02 | `qa_output/video-production-tr/02-ceo-management-walkthrough/` | `screen-recording-master.webm` |
| 03 | `qa_output/video-production-tr/03-training-00-izleyici-orientasyonu/` | `screen-recording-master.webm` |
| 04 | `qa_output/video-production-tr/04-training-01-login-roller-veri-guvenligi/` | `screen-recording-master.webm` |
| 05 | `qa_output/video-production-tr/05-training-02-dashboard-gunluk-yonetim/` | `screen-recording-master.webm` |
| 06 | `qa_output/video-production-tr/06-training-03-daireler-bloklar-matris/` | `screen-recording-master.webm` |
| 07 | `qa_output/video-production-tr/07-training-04-insanlar-malik-kiraci-personel/` | `screen-recording-master.webm` |
| 08 | `qa_output/video-production-tr/08-training-05-servis-ticket-sla-gorevler/` | `screen-recording-master.webm` |
| 09 | `qa_output/video-production-tr/09-training-06-takvim-rezervasyon-checkin-checkout/` | `screen-recording-master.webm` |
| 10 | `qa_output/video-production-tr/10-training-07-finans-odemeler-depozito-kisitlama/` | `screen-recording-master.webm` |
| 11 | `qa_output/video-production-tr/11-training-08-belgeler-yukleme-kanit/` | `screen-recording-master.webm` |
| 12 | `qa_output/video-production-tr/12-training-09-iletisim-bildirimler/` | `screen-recording-master.webm` |
| 13 | `qa_output/video-production-tr/13-training-10-erisim-compliance-denetim/` | `screen-recording-master.webm` |
| 14 | `qa_output/video-production-tr/14-training-11-raporlar-yonetim-analizleri/` | `screen-recording-master.webm` |
| 15 | `qa_output/video-production-tr/15-training-12-yapay-zeka-asistani-sinirlar/` | `screen-recording-master.webm` |
| 16 | `qa_output/video-production-tr/16-training-13-mobile-web-pwa-offline-queue/` | `screen-recording-master.webm` |
| 17 | `qa_output/video-production-tr/17-training-14-ayarlar-entegrasyonlar/` | `screen-recording-master.webm` |
| 18 | `qa_output/video-production-tr/18-training-15-new-level-premium-journey/` | `screen-recording-master.webm` |
| 19 | `qa_output/video-production-tr/19-training-16-kapanis-live-uat-onay/` | `screen-recording-master.webm` |

## CEO Video İçin Net HeyGen Akışı

1. Yeni draft aç: `02 - 1Cati CEO Management Walkthrough TR`.
2. Scene 1: Waleri avatar. Sadece giriş cümleleri.
3. Scene 2: `qa_output/video-production-tr/02-ceo-management-walkthrough/screen-recording-master.webm` upload edilir ve tam ekran ana medya yapılır.
4. Scene 2 voiceover: CEO Türkçe script'in ana açıklama bölümü. Avatar görünmez.
5. Scene 3: Waleri avatar veya ürün kaydının temiz son karesi. WAMOCON modeli, UAT sınırları ve yönetim faydası.
6. Önizleme yapılır: scene 2 thumbnail ürün ekranı olmalı, avatar yüzü olmamalı.
7. Ancak bundan sonra generate/export yapılır.

## QA Kontrolü

Her video için final generate öncesi:

- Timeline thumbnail'larında intro dışında ürün ekran kaydı görünür.
- `No script` uyarısı yoktur.
- Türkçe karakterler bozulmamıştır: `1Çatı`, `yönetim`, `şeffaf`, `güvenlik`.
- Avatar sadece intro/outro veya kısa geçişte görünür.
- Ürün kaydı sessizdir; voiceover temizdir.
- Ekranda gerçek müşteri verisi veya gizli bilgi yoktur.
- URL/adres çubuğu veya internal ID gösterimi rahatsız edici ise crop/blur/zoom ile temizlenmiştir.
- AI anlatımı sınırlıdır: önerir, özetler, uyarır; para, erişim, iade veya rol kararını tek başına vermez.
