# AGENTS.md - Projektübersicht für KI-Coding-Agenten

> Stand: Juni 2026
> Sprache der Projektdokumentation: Deutsch
> Vertraulichkeit: STRICTLY CONFIDENTIAL

## Projektübersicht

Dieses Verzeichnis enthält **keinen ausführbaren Quellcode** und keine klassische Software-Build-Umgebung. Es handelt sich um ein **Dokumenten- und Angebotsrepository** für die geplante digitale Transformationsinitiative **„1Cat“** (auch: **„1Çatı Plattform“**).

- **Auftraggeber:** Ataberk Estate, Türkei (Zielgruppe: russischsprachige Käufer und Verkäufer)
- **Durchführung / Beratung:** WAMOCON GmbH, Digitale Transformationsberatung & Softwareentwicklung
- **Projektname:** 1Cat - Property-Management-Plattform
- ** aktuelle Website des Mandanten:** ataberkestate.com (statisches Marketing-Portal)
- **Immobilienbestand des Mandanten:** 212.298+ Objekte in der Datenbank
- **Dokumentenstatus:** Version 2.0 Final (Juni 2026)

Ziel der Unterlagen ist die Begründung, Planung und Budgetierung einer integrierten Immobilienverwaltungsplattform mit Echtzeitkommunikation, CRM, Ticketing und Offline-Funktionalität.

## Enthaltene Dateien

| Datei | Format | Inhalt |
|-------|--------|--------|
| `wmc_report.md` | Markdown | Strategiepapier „1Çatı Plattform“ mit Management-Zusammenfassung, Marktanalyse, Gap-Analyse, 10 MUST-Anforderungen, Architektur, Finanzmodell, Roadmap und Risikoanalyse |
| `wmc_proposal.html` | HTML | Interaktive Verkaufspräsentation / Angebot mit Animationen, ROI-Rechner, Berechtigungsmatrix, Offline-Sync-Simulation und Architektur-Darstellung |
| `1cati_strategiepapier.docx` | Microsoft Word | Vertrags-/Strategiepapier (gleicher oder ähnlicher Inhalt wie `wmc_report.md`) |
| `WMC_Anforderung_1Çatı.docx` | Microsoft Word | Anforderungskatalog mit den 10 MUST-Anforderungen an die Plattform |

## Wichtiger Hinweis: Kein Code-Repository

Im Gegensatz zu typischen Softwareprojekten fehlen hier folgende Artefakte vollständig:

- Keine `package.json`, `pyproject.toml`, `Cargo.toml`, `pom.xml`, `go.mod` oder ähnliche Manifestdateien
- Kein Source-Code-Verzeichnis (`src/`, `app/`, `lib/` etc.)
- Keine Build-, Test- oder CI/CD-Konfigurationen
- Keine `Dockerfile`, `docker-compose.yml` oder Kubernetes-Manifeste
- Keine Testdateien oder Test-Runner-Konfiguration
- Keine `.env`-Dateien oder Secrets-Management

**Folge:** Es gibt keine ausführbaren Build-, Test- oder Deploy-Befehle. Jegliche weiteren Entwicklungsarbeiten müssten zunächst ein echtes Code-Repository auf Basis der hier dokumentierten Architekturentscheidungen anlegen.

## Geplanter Technologie-Stack (aus den Dokumenten extrahiert)

Die Unterlagen definieren eine **fünf-Schichten-Architektur** mit folgenden Technologie-Komponenten:

### 1. Präsentationsschicht
- **Next.js 15** als PWA-Grundgerüst
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion** (Animationen, laut HTML-Proposal)
- Service Worker für Offline-Fähigkeit

### 2. Kommunikationsschicht
- **Socket.io** für Echtzeit-Chat
- **WebRTC** für VoIP und Video
- **Push API** / Firebase Cloud Messaging für Push-Benachrichtigungen
- **Signal Protocol** für Ende-zu-Ende-verschlüsselte private Chats

### 3. Geschäftslogikschicht
- **Twenty CRM** (Open Source, AGPL-3.0) als CRM-Kern
- **NocoBase** (Open Source, AGPL-3.0) als No-Code/Low-Code-Ebene
- **Supabase** (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **OpenClaw KI-Chatbot**

### 4. Daten- und Infrastrukturschicht
- **PostgreSQL** (über Supabase)
- **Supabase Storage** für Dateien
- **Redis** als Cache
- **Docker / Kubernetes** als Deployment-Plattform

### 5. Integrationsschicht
- **Cal.com** für Kalender und Terminbuchung
- **FullCalendar-React** für Kalenderdarstellung
- **Twilio** für STUN/TURN-Server (WebRTC)
- **Supabase Auth mit TOTP** für Zwei-Faktor-Authentifizierung
- **Plausible + Mixpanel** für Analytics (Phase 4)

## Die 10 MUST-Anforderungen

1. Integriertes CRM (Twenty CRM + Supabase PostgreSQL)
2. Zentrale Kommunikation (Chat / VoIP / Video)
3. Ticketsystem mit Statusverfolgung
4. Multimediale Ticketerfassung (Text, Sprache, Foto, Video)
5. App-interne Telefonie (WebRTC P2P + Twilio)
6. Rollen- & Rechtekonzept (6 Rollen, Supabase RLS + NocoBase RBAC)
7. Kalender & Terminmanagement (Cal.com + FullCalendar)
8. Private geschlossene Chats (Signal Protocol E2E)
9. Offline-Erfassung + Synchronisation (Service Worker + IndexedDB + Background Sync)
10. Web-UI mit 2FA (Next.js PWA + Supabase Auth TOTP)

## Implementierungs-Roadmap (geplant)

| Phase | Zeitraum | Budget | Inhalt |
|-------|----------|--------|--------|
| Phase 1: Grundlage | Monat 1-2 | $18.000 | Supabase-Setup, Auth mit 2FA, 6-Rollen-System, PWA-Grundgerüst, Docker, CI/CD |
| Phase 2: Core CRM | Monat 3-4.5 | $22.000 | Twenty CRM-Integration, Immobilien-Objekte, Ticketsystem, Kalender, Multimedia-Erfassung |
| Phase 3: Kommunikation | Monat 4.5-7 | $25.000 | Socket.io-Chat, WebRTC VoIP/Video, E2E-Chats, Offline-Sync |
| Phase 4: Intelligenz | Monat 7-9 | $15.000 | OpenClaw KI-Chatbot, Analytics, Automatisierungsworkflows, E-Mail-Marketing |
| Phase 5: Launch | Monat 9-10 | $10.000 | UAT, Penetration Testing, Performance-Optimierung, Schulung, Go-Live |
| **Gesamt** | **10 Monate** | **$90.000** | |

## Lizenz- und Kostenhinweise

- **Twenty CRM:** AGPL-3.0, Self-hosted kostenlos (nur Infrastruktur), Cloud $9/User/Monat
- **NocoBase:** AGPL-3.0
- **Supabase:** Apache 2.0

Der Vergleich in den Dokumenten positioniert die Eigenentwicklung ($90.000 initial, $0 Lizenz) gegen proprietäre Lösungen ($200.000+ initial, $50.000-$100.000/Jahr Lizenz).

## Sicherheits- und Datenschutzaspekte (geplant)

- **Row Level Security (RLS)** in Supabase PostgreSQL für datenbankseitige Berechtigungen
- **Supabase Auth mit TOTP** für Zwei-Faktor-Authentifizierung
- **Signal Protocol** für Ende-zu-Ende-verschlüsselte Chats
- **Penetration Testing** als expliziter Bestandteil von Phase 5
- Vertraulichkeit: Alle Dokumente sind als „STRICTLY CONFIDENTIAL“ markiert und ausschließlich für WAMOCON GmbH und Ataberk Estate bestimmt.

## Entwicklungskonventionen (noch nicht anwendbar)

Da kein Quellcode existiert, können hier noch keine konkreten Code-Style-Guidelines, Teststrategien oder Deployment-Prozesse dokumentiert werden. Bei Beginn der Implementierung sollten folgende Punkte basierend auf dem geplanten Stack definiert werden:

- TypeScript-Codestyle für Next.js / React
- API-Konventionen für GraphQL/REST (Twenty CRM) und Supabase Auto-API
- Testpyramide: Unit-Tests (Jest/Vitest), Integrationstests gegen Supabase, E2E-Tests (Playwright)
- CI/CD-Pipeline für Docker-Builds und Deployment
- Secrets-Management für Supabase-, Twilio- und Cal.com-Schlüssel

## Nächste Schritte (laut Strategiepapier)

1. Freigabe Phase-1-Budget ($18.000)
2. Bereitstellung: Domain, Server-Zugang, Ataberk Estate API
3. Benennung technischer und geschäftlicher Ansprechpartner
4. Kickoff-Termin innerhalb von 7 Tagen nach Freigabe

## Hinweis für Agenten

Wenn du als KI-Agent in diesem Verzeichnis arbeitest, beachte:

- **Nicht löschen oder veröffentlichen:** Die Inhalte sind vertraulich.
- **Keine Build-Befehle ausführen:** Es gibt nichts zu bauen, zu testen oder zu deployen.
- **Quelle der Wahrheit:** `wmc_report.md` und `wmc_proposal.html` enthalten den vollständigen aktuellen Planungsstand. Die `.docx`-Dateien sind vermutlich redaktionelle Varianten oder Anlagen.
- **Bei Implementierungsbeginn:** Ein echtes Code-Repository muss neu aufgesetzt werden. Verwende dieses Verzeichnis dann als Anforderungs- und Architekturquelle, nicht als Vorlage für Dateistruktur oder Build-Prozess.
