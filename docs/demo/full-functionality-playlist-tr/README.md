# 1Cati Full Functionality Playlist - Turkish Script Folder

Tarih: 8 Temmuz 2026  
Dil: Türkçe  
Gizlilik: STRICTLY CONFIDENTIAL  
Kaynak: `../full-functionality-playlist-de/`

Bu klasör, onaylanan Almanca video yapısının Türkçe üretim versiyonudur. Dosya numaraları Almanca klasörle aynı tutulmuştur. Böylece HeyGen sahneleri, ekran kayıtları, altyazılar ve son montaj aynı sırayla yönetilir.

## Üretim Mantığı

- `01` ve `02`: Yönetim ve karar verici videoları.
- `03` - `19`: Eğitim ve uygulama kullanım videoları.
- `20`: Türkçe HeyGen / CEO üretim planı.
- Öncelik: Türkçe versiyon önce tamamlanır, sonra Almanca, İngilizce ve Rusça versiyonlar aynı yapıdan türetilir.

## Dil Standardı

- Dil sade, iş odaklı ve teknik olmayan kişiler için anlaşılır olmalıdır.
- "1Çatı" Türkçe anlatımda ana marka adı olarak kullanılır. Dosya ve sistem içinde geçen "1Cati" aynı ürünü ifade eder.
- AI/KI anlatılırken "yapay zeka destekler, kritik kararları insan verir" sınırı net tutulur.
- Canlı, UAT-ready ve sağlayıcıya bağlı alanlar açıkça ayrılır.
- Gerçek müşteri verisi, özel kişi bilgisi veya üretim vaadi gösterilmez.

## HeyGen Üretim Notu

Tüm tam eğitim ve yönetim videolarında doğru yapı:

1. Waleri avatarı ile kısa giriş.
2. `qa_output/full-playlist-recordings/clips/` altındaki ilgili tam ürün ekran kaydı ana görsel olur.
3. Türkçe seslendirme bu ürün kaydının üzerine bindirilir.
4. Gerekirse kısa Waleri avatar kapanışı eklenir.
5. HeyGen timeline'da tüm ara sahneler avatar yüzü olarak bırakılmaz.

Yerel medya yükleme için Chrome Codex eklentisinde "Allow access to file URLs" aktif olmalıdır. Aksi halde HeyGen'e yeni yerel dosya yükleme tarayıcı tarafından engellenir. Bu durumda işlem durdurulur veya dosyalar manuel yüklenir; eski HeyGen intro klipleri full playlist üretimi için ana medya olarak kullanılmaz.
