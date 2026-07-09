# 1Çatı Final Platform Introduction Script

Status: July 7, 2026  
Use: Landing page embedded intro, client meeting opener, HeyGen production script  
Recommended master length: 3:45-4:15  
Master language: Turkish  
Secondary language: German  

## Confidence

This script is high-confidence because it is based on:

- The current 1Çatı app feature map in `apps/web/scripts/demo-record.mjs`.
- Current video marketing benchmarks showing that short video drives understanding and trust.
- The Turkish market's strong video platform reach.
- HeyGen's current Creator/Pro capability set: AI Studio, templates, avatar, voice, screen recorder, 1080p/4K depending on plan.

Important correction: this is not a "trailer". It is a premium platform introduction. A trailer should be 60-90 seconds. This asset is a deeper introduction for a serious ERP-style product.

## Production Choice

Use a 4-minute introduction on the landing page, but place it below the hero, not as the whole hero.

Do:

- Use avatar for hook, transitions and closing.
- Use real product screen recordings for the main proof.
- Keep captions on.
- Show large readable KPIs.
- Keep AI claims controlled and honest.

Do not:

- Run avatar full-screen for four minutes.
- Claim fully autonomous AI actions.
- Show real customer personal data.
- Use overdone sci-fi effects that reduce trust.

## HeyGen Template Direction

Inside HeyGen, choose a template style like:

- `Business / Product Demo`
- `SaaS Explainer`
- `Corporate Technology`
- `Product Launch`
- `AI Studio presentation with screen recording`

Avoid template styles like:

- Podcast/interview.
- News presenter.
- Influencer reel.
- Heavy neon cyberpunk.
- Education classroom.

Best visual pattern:

- Scene 1: full avatar on a clean premium dark office / subtle tech background.
- Scene 2 onward: product screen recording full-screen.
- Avatar as picture-in-picture on the right or lower corner only during transitions.
- Short caption bars with 3-5 words, not full paragraphs.
- Use restrained green/teal accents, glass panels and clean grid overlays.

The best HeyGen build is not "avatar video". It is "AI host + real product proof".

## Final Scene Plan

| Time | Scene | Visual | Purpose |
| --- | --- | --- | --- |
| 0:00-0:18 | Hook | Full avatar | Name the pain: Excel, WhatsApp, scattered follow-up. |
| 0:18-0:40 | Why now | Fast UI montage | Show the operational complexity. |
| 0:40-1:05 | What 1Çatı is | Dashboard | Establish one control center. |
| 1:05-1:35 | Dashboard | KPIs, risks, phase status | Show management value. |
| 1:35-2:00 | Unit matrix | Listings / unit detail | Show 769-unit control. |
| 2:00-2:35 | Tickets | Service orders, staff tasks | Show operational workflow. |
| 2:35-3:05 | Finance | Ledger, debt, restrictions | Show financial control. |
| 3:05-3:30 | Roles | Login/RBAC, owner/tenant/staff | Show privacy and simplicity. |
| 3:30-3:50 | AI layer | Assistant/risk cards | Show AI with guardrails. |
| 3:50-4:10 | Offer and close | Offer page + avatar close | Make the business offer memorable. |

## Product Clips To Record

Record these scenes from the existing Playwright recorder:

- `S00` Offer and Demo Center: `/pitch`
- `S01` What 1Çatı is: `/dashboard`
- `S02` Login and role-based access: `/login`
- `S03` Main dashboard and 15-phase status: `/dashboard`
- `S04` Site, blocks, floors and 769 units: `/dashboard/listings`
- `S06` Finance ledger engine: `/dashboard/finance`
- `S08` Service catalogue and service orders: `/dashboard/tickets`
- `S09` Staff tasks, SLA and media proof: `/dashboard/tickets`
- `S14` AI assistant and AI risk highlights: `/dashboard`
- `S15` Mobile web / PWA and offline-safe: `/dashboard/offline`

## Turkish Master Script

### Title

1Çatı: Modern Siteler İçin Dijital Operasyon Merkezi

### Script

Bir konut projesi büyüdükçe, yönetim de büyür.

Daireler, malik bilgileri, kiracılar, aidatlar, borçlar, servis talepleri, belgeler, personel görevleri ve günlük kararlar... Bunların tamamını Excel dosyaları, WhatsApp grupları ve manuel takiplerle yönetmek artık sürdürülebilir değil.

Çünkü sorun sadece bilgi toplamak değil. Sorun, doğru bilgiyi doğru kişiye, doğru zamanda ve güvenli şekilde ulaştırmak.

1Çatı bunun için geliştirildi.

1Çatı, modern konut projeleri için dijital operasyon merkezidir. Yönetim, muhasebe, saha ekibi, malik ve kiracı aynı sistemin içinde çalışır; ama herkes yalnızca kendi yetkisi kadarını görür.

Dashboard'da yönetim ekibi tesisin durumunu tek bakışta görür. Kaç daire aktif, hangi ödemeler açık, hangi servisler bekliyor, hangi görevler gecikiyor, hangi alanlarda risk oluşuyor... Hepsi aynı ekranda toplanır.

Bu sadece güzel bir özet ekranı değildir. Günlük karar merkezidir.

Daire matrisi, siteyi gerçek yapısıyla gösterir: blok, kat, daire, malik, kiracı, borç, servis ve belge durumu. Bir daire açıldığında bütün bağlam görünür. Kim sorumlu, hangi ödeme açık, hangi talep devam ediyor, hangi belge eksik, hangi işlem onay bekliyor... Ekip artık bilgi aramak yerine karar verebilir.

Servis tarafında talepler metin, fotoğraf, video veya sesle alınabilir. Talep sınıflandırılır, doğru ekibe yönlendirilir, SLA süresi izlenir ve iş tamamlandığında kanıt sisteme eklenir. Yönetim, sahada ne olduğunu sonradan tahmin etmez; süreç boyunca görür.

Finans tarafında aidatlar, ödemeler, borçlar, kısıtlamalar ve onay süreçleri izlenebilir hale gelir. Muhasebe neyin tahsil edildiğini, neyin açık kaldığını ve hangi işlem için onay gerektiğini net olarak görür. Malik ise yalnızca kendi dairesiyle ilgili izinli bilgileri takip eder.

1Çatı'nın rol yapısı bu yüzden önemlidir. Admin sistemi kurar ve yetkileri yönetir. Yönetici operasyonu izler ve karar verir. Muhasebe finansı takip eder. Personel kendisine atanan görevi görür. Malik kendi dairesini izler. Kiracı ise taleplerini ve iletişimini takip eder.

Yapay zeka bu yapının içinde yardımcı bir katmandır.

AI talepleri özetler, öncelik önerir, riskleri işaretler ve cevap taslakları hazırlar. Ama kritik kararlar otomatik verilmez. Para, erişim, iade, kısıtlama ve rol değişikliği gibi konular her zaman insan onayıyla ilerler.

Bu yaklaşım 1Çatı'yı hem modern hem de güvenilir yapar: hızlı çalışan bir AI katmanı, ama kontrolü kaybetmeyen bir yönetim modeli.

WAMOCON'un iş modeli de aynı şekilde nettir. Müşteri için ağır bir yazılım geliştirme maliyeti yoktur. Sistem kurulur, işletilir, güncellenir ve bakımı yapılır. Müşteri, kullanıcı başına aylık bakım modeliyle süreci yönetilebilir bir operasyon giderine çevirir.

Sonuç daha az karmaşa, daha net finans, daha hızlı servis, daha iyi malik iletişimi ve daha premium bir site deneyimidir.

1Çatı; daireleri, insanları, finansı, servisleri, belgeleri ve kararları tek platformda birleştirir.

Bu sadece bir yazılım değildir.

Bu, modern konut projeleri için yönetilebilir, şeffaf ve ölçeklenebilir bir işletim modelidir.

## German Version

### Titel

1Çatı: Die Digitale Betriebszentrale Für Moderne Wohnanlagen

### Script

Je größer ein Wohnprojekt wird, desto komplexer wird auch der Betrieb.

Wohnungen, Eigentümerdaten, Mieter, Beiträge, offene Beträge, Serviceanfragen, Dokumente, Teamaufgaben und tägliche Entscheidungen lassen sich nicht mehr sauber mit Excel-Dateien, WhatsApp-Gruppen und manueller Nachverfolgung steuern.

Das eigentliche Problem ist nicht nur, Informationen zu sammeln. Das Problem ist, die richtige Information zur richtigen Zeit sicher an die richtige Person zu bringen.

Dafür wurde 1Çatı entwickelt.

1Çatı ist die digitale Betriebszentrale für moderne Wohnprojekte. Management, Buchhaltung, Service-Team, Eigentümer und Mieter arbeiten im selben System; aber jede Rolle sieht nur den Bereich, für den sie berechtigt ist.

Im Dashboard sieht das Management den Zustand der Anlage auf einen Blick. Wie viele Wohnungen sind aktiv, welche Zahlungen sind offen, welche Services warten, welche Aufgaben sind überfällig und wo entsteht ein Risiko? Alles kommt in einem klaren Bild zusammen.

Das ist nicht nur eine schöne Übersicht. Es ist die tägliche Entscheidungszentrale.

Die Wohnungsmatrix zeigt die Anlage in ihrer echten Struktur: Block, Etage, Wohnung, Eigentümer, Bewohner, Schulden, Service und Dokumente. Wenn eine Wohnung geöffnet wird, ist der gesamte Kontext sichtbar. Wer ist verantwortlich, welche Zahlung ist offen, welches Ticket läuft, welches Dokument fehlt und welche Aktion wartet auf Freigabe?

Im Servicebereich können Anfragen per Text, Foto, Video oder Sprache entstehen. Die Anfrage wird klassifiziert, an das richtige Team weitergeleitet, mit SLA-Zeit verfolgt und nach Abschluss mit Nachweis dokumentiert. Das Management muss nicht raten, was draußen passiert. Es sieht den Ablauf.

Im Finanzbereich werden Beiträge, Zahlungen, offene Beträge, Einschränkungen und Freigaben nachvollziehbar. Die Buchhaltung sieht, was bezahlt wurde, was offen ist und wo eine Freigabe nötig ist. Der Eigentümer sieht nur die erlaubten Informationen zur eigenen Einheit.

Die Rollenstruktur ist deshalb ein Kernpunkt von 1Çatı. Admins richten das System ein und verwalten Rechte. Manager steuern den Betrieb. Die Buchhaltung verfolgt Finanzen. Das Service-Team sieht zugewiesene Aufgaben. Eigentümer sehen ihre eigene Einheit. Mieter verfolgen Anfragen und Kommunikation.

Künstliche Intelligenz ist in diesem System eine unterstützende Ebene.

Die KI fasst Anfragen zusammen, schlägt Prioritäten vor, markiert Risiken und bereitet Antwortentwürfe vor. Kritische Entscheidungen werden aber nicht automatisch getroffen. Geld, Zugang, Rückerstattung, Einschränkungen und Rollenwechsel bleiben immer unter menschlicher Kontrolle.

Genau das macht 1Çatı modern und vertrauenswürdig: eine schnelle KI-Ebene, aber ein Betriebsmodell, das die Kontrolle behält.

Auch das WAMOCON-Modell ist klar. Für den Kunden entstehen keine schweren Entwicklungskosten. Das System wird aufgebaut, betrieben, aktualisiert und gewartet. Der Kunde macht daraus einen planbaren monatlichen Betriebsaufwand pro Nutzer.

Das Ergebnis ist weniger Chaos, klarere Finanzen, schnellerer Service, bessere Eigentümerkommunikation und ein hochwertigeres Erlebnis für die gesamte Anlage.

1Çatı verbindet Einheiten, Menschen, Finanzen, Services, Dokumente und Entscheidungen in einer Plattform.

Das ist nicht nur Software.

Das ist ein kontrollierbares, transparentes und skalierbares Betriebsmodell für moderne Wohnanlagen.

## Turkish Short Hook Options

Use one of these as the first line in HeyGen if the first test feels too soft:

1. Bir site büyüdüğünde, Excel artık yönetim aracı değil; risk kaynağıdır.
2. Modern bir konut projesi, WhatsApp gruplarıyla değil, tek bir operasyon merkeziyle yönetilir.
3. 769 daireyi yönetmek için daha fazla dosyaya değil, daha net bir sisteme ihtiyaç var.

Recommended hook: option 3. It is concrete and directly tied to the product demo.

## German Short Hook Options

1. Wenn eine Wohnanlage wächst, wird Excel vom Werkzeug zum Risiko.
2. Moderne Wohnanlagen werden nicht mehr über WhatsApp-Gruppen gesteuert.
3. Für 769 Wohnungen braucht man nicht mehr Dateien, sondern ein klareres System.

Recommended hook: option 3.

## HeyGen Scene Notes

### Avatar Settings

- Voice: warm, business-professional, calm authority.
- Speed: 0.92-0.97 for Turkish; 0.90-0.95 for German.
- Avatar placement: full-screen only at start and end.
- Middle scenes: small picture-in-picture avatar only when needed.

### Captions

- Always use captions.
- Use short subtitle lines.
- Turkish captions must preserve characters: Ç, ğ, ı, İ, ö, ş, ü.
- German captions must preserve: ä, ö, ü, ß.

### Visual Labels

Use short labels on screen:

- Tek operasyon merkezi
- 769 daire kontrolü
- Rol bazlı erişim
- Finans ve tahsilat
- Servis ve SLA takibi
- AI destekli karar hazırlığı
- İnsan onaylı kritik işlemler

German labels:

- Eine Betriebszentrale
- 769 Einheiten im Blick
- Rollenbasierter Zugriff
- Finanzen und Zahlungen
- Service und SLA
- KI-gestützte Vorbereitung
- Kritische Aktionen mit Freigabe

## Landing Page Placement

Place the 4-minute video below the first hero block.

Landing page CTA copy:

- Turkish: `4 dakikalık platform tanıtımını izleyin`
- German: `4-minütige Plattform-Einführung ansehen`
- English: `Watch the 4-minute platform introduction`

Do not autoplay with sound.

Use a strong poster image:

- Dashboard visible.
- One KPI cluster readable.
- Small avatar face on the side.
- Text overlay: `1Çatı Platform Introduction`

## Final Recommendation

Use this as the master introduction:

- Turkish first.
- 3:45-4:15 target runtime.
- Avatar only as host.
- Product screen recordings as proof.
- German version after Turkish timing is approved.

This is the strongest format for a Turkish property-developer client because it combines authority, clarity, product proof, cost control and a controlled AI story.
