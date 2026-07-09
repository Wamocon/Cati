# Produktionsdatei 20 - HeyGen- und Schnittplan

Stand: 8. Juli 2026  
Sprache: Deutsch  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Zweck: Produktionsreihenfolge, Dateinamen, Szenen und Schnittregeln für die deutsche Video-Playlist.  
Quelle: `../1cati-full-functionality-playlist-script-de.md`

## Kapitelübersicht für HeyGen / Schnitt

| Datei | Titel | Zielzeit | Szenen |
|---|---:|---:|---|
| `1cati-pitch-de` | Pitch | 1:20-1:30 | S00, S03, S04, S08, S06, S14 |
| `1cati-ceo-walkthrough-de` | Management-Walkthrough | 8-10 Min. | S00-S04, S06-S08, S14, S17 |
| `1cati-training-00-orientierung-de` | Orientierung | 3-4 Min. | S00, S01, S17 |
| `1cati-training-01-login-rollen-de` | Login und Rollen | 3 Min. | S02 |
| `1cati-training-02-dashboard-de` | Dashboard | 4 Min. | S01, S03 |
| `1cati-training-03-einheiten-de` | 769 Einheiten | 5 Min. | S04 |
| `1cati-training-04-menschen-de` | Personen und Rollen | 4 Min. | S05 |
| `1cati-training-05-service-de` | Service, SLA und Premium-Services | 6-7 Min. | S08, S09 |
| `1cati-training-06-kalender-de` | Kalender und Checkout | 4 Min. | S10 |
| `1cati-training-07-finanzen-de` | Finanzen und Sperren | 6 Min. | S06, S07 |
| `1cati-training-08-dokumente-de` | Dokumente | 4 Min. | S12 |
| `1cati-training-09-kommunikation-de` | Kommunikation | 4 Min. | S11 |
| `1cati-training-10-compliance-de` | Zugang und Compliance | 4 Min. | Compliance route, manual clip |
| `1cati-training-11-reports-de` | Reports | 4 Min. | S13 |
| `1cati-training-12-ki-de` | Zwei KI-Assistenten | 5-6 Min. | S14 + Public Concierge |
| `1cati-training-13-mobile-de` | Mobile/PWA | 4 Min. | S15 |
| `1cati-training-14-integrationen-de` | Einstellungen und Integrationen | 4 Min. | S16 |
| `1cati-training-15-new-level-de` | Öffentliche Journey mit AI Concierge | 5-6 Min. | New Level route |
| `1cati-training-16-abschluss-de` | Abschluss und UAT-Grenzen | 3 Min. | S17 |

## Automatisierter Screen-Recorder

Für die Produktaufnahmen wird der Playwright-Recorder `apps/web/scripts/record-full-playlist.mjs` verwendet. Er erzeugt pro Kapitel einen eigenen Screen-Master mit:

- 1920 x 1080 Desktop-Aufnahme; bei Mobile/PWA echtes Smartphone-Viewport mit 1080 x 1920 Portrait-Export.
- sichtbarem Cursor, ruhigen Mausbewegungen, Hover-Zuständen und Klick-Puls.
- Kapitel-Label, kurzer Kontextkarte und Fokus-Markierung auf relevante Bereiche.
- automatischer Qualitätsprüfung auf Videogröße, Dauer, Auflösung und Browserfehler.
- Retry-Lauf, wenn die technische Prüfung fehlschlägt.
- Review-Screenshots und `recording-manifest.json` für Freigabe und Schnitt.

### Lokaler Produktionslauf

```powershell
cd "D:\Real Estate CRM\Cati\apps\web"

$env:ENABLE_ACCESS_PROFILES="true"
$env:NEXT_PUBLIC_SUPABASE_URL=""
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=""
$env:SUPABASE_SERVICE_ROLE_KEY=""
$env:AI_API_URL=""
$env:AI_API_KEY=""
npm run start -- --hostname 127.0.0.1 --port 3020
```

In einem zweiten Terminal:

```powershell
cd "D:\Real Estate CRM\Cati\apps\web"

$env:VIDEO_RECORD_BASE_URL="http://127.0.0.1:3020"
$env:VIDEO_RECORD_LOCALES="de"
$env:VIDEO_RECORD_RETRIES="1"
npm run record:playlist
```

Einzelne Kapitel können mit `VIDEO_RECORD_ONLY` aufgenommen werden:

```powershell
$env:VIDEO_RECORD_ONLY="01,08,15"
npm run record:playlist
```

Die fertigen Rohclips und Prüfdateien liegen unter `D:\Real Estate CRM\Cati\qa_output\full-playlist-recordings\`.

### Spätere Sprachvarianten

Für weitere Sprachfassungen denselben Lauf mit `VIDEO_RECORD_LOCALES="tr,ru,en,de"` ausführen. Bei Zeit- oder Credit-Limit zuerst Türkisch aufnehmen, danach Deutsch, Englisch und Russisch. Die Screen-Aufnahme bleibt produkthaft; HeyGen ergänzt Stimme, Avatar-Intro, Übergänge und Abschluss.

## 11. Aufnahmehinweise

### Dauer bestimmen

- Vor der Aufnahme wird pro Skript die Wortzahl gezählt.
- Richtwert Deutsch: 125-140 Wörter pro Minute bei ruhiger Business-Stimme.
- Zusätzlich 20-35 Prozent Puffer für Klicks, Hover, Scroll, Ladezeiten und kurze Pausen einplanen.
- Nach dem ersten Screen Recording wird die echte Laufzeit gemessen und in der Tabelle korrigiert.
- Wenn ein Kapitel länger als 7 Minuten wird, wird es in zwei HeyGen-/Schnittszenen geteilt.

### Allgemein

- Bildschirmaufnahme in 1920 x 1080, 30 fps.
- Keine echten Kundendaten zeigen.
- Keine privaten Namen zeigen, wenn sie nicht Teil der Seed-Demo sind.
- Mausbewegungen langsam, keine hektischen Scrolls.
- Jede Szene beginnt mit 2 Sekunden Ruhe.
- Jede Szene endet mit einem sauberen Standbild.
- Untertitel immer aktivieren oder später als `.vtt` bereitstellen.

### HeyGen

- Avatar nur für Intro, Übergänge und Abschluss einsetzen.
- Produktaufnahme bleibt der Hauptinhalt.
- Für die deutsche Version wird Valeris in HeyGen gespeicherte Stimme verwendet.
- Deutsche Stimme: ruhig, professionell, verständlich, nicht werblich.
- Geschwindigkeit 0,92-0,96, weil Deutsch länger ist.
- Lange Kapitel in einzelne HeyGen-Szenen teilen.
- Erst finalen Text freigeben, dann Credits verwenden.

### Sprachen

- Alle finalen Videos werden als TR, RU, EN und DE Version geplant.
- Priorität bei Zeit- oder Credit-Limit: Türkisch zuerst, danach Deutsch, Englisch und Russisch.
- Hook, Titelbild, Untertitel und Sprechertext müssen pro Sprache geprüft werden; keine rohe Maschinenübersetzung ohne Review.

### Schnitt

- Kurze Titelkarten pro Kapitel.
- Keine überladenen Animationen.
- Bei komplexen Bildschirmen sanfte Zooms auf die relevante Karte.
- Kritische Grenzen als dezente Text-Overlays zeigen: "UAT-ready", "Provider-abhängig", "menschliche Freigabe".
