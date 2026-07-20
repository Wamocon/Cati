# WAMOCON GMBH

# Anforderungsdokument, Version 2

# 1Çatı, Property-Management- und Real-Estate-ERP für Ataberk Estate

| Feld | Wert |
|---|---|
| Projekt | 1Çatı (Cati), Property-Management- und Real-Estate-ERP-Plattform |
| Auftraggeber | Ataberk Estate, Türkei |
| Umsetzung/Beratung | WAMOCON GmbH |
| Referenzobjekt | New Level Premium, Avsallar/Alanya |
| Plattform-Version | 1Çatı ERP v2.6.0 |
| Dokumentversion | **v2**, löst nicht ab, sondern ergänzt `Anforderungsdokument-1Cati.md` (v1, 04.07.2026); v1 bleibt als historischer Stand erhalten |
| Anlass dieser Version | Vollständige Tiefenanalyse des tatsächlich installierten Codes (14 parallele Funktionsbereich-Audits, Migrationen 0000–0013, alle API-Routen, alle Dashboard-Seiten) und Abgleich gegen das Original-Kundendokument „CRM Kundenanforderungen Premium" sowie das Benutzerhandbuch |
| Implementierungsstand | Phase 1–9 Fundament (Foundation/UAT-reif); Phase 10–14 **Foundation-/Demo-Stand mit UI+API+Datenmodell, aber überwiegend nicht miteinander verbunden** (siehe Kapitel 7, korrigiert gegenüber v1); New-Level-Premium-Modul umgesetzt (Demo-sicher) |
| Erstellt von | WAMOCON GmbH – Projektteam |
| Eingereicht an | Ataberk Estate Geschäftsführung |
| Datum | 07.07.2026 |
| Vertraulichkeit | STRICTLY CONFIDENTIAL |
| Status | Konsolidiertes Anforderungsdokument, Living Document, wird bei jedem Phasenabschluss fortgeschrieben |

---

**Hinweis zur Dokumentenhierarchie:** Dieses Dokument ist die **zweite, tiefer verifizierte Version** des 1Çatı-Anforderungsdokuments. Kapitel 2–5 (Marktanalyse, Wettbewerb, Zielgruppe, Nutzen) sind gegenüber v1 inhaltlich unverändert und werden hier nur zur Vollständigkeit des Dokuments knapp zusammengefasst, für die vollständige Marktanalyse mit allen Quellenbelegen gilt weiterhin `Anforderungsdokument-1Cati.md` (v1). Der eigentliche Neuwert dieser Version liegt in **Kapitel 7** (vollständig neu erhoben, mit Datei- und Zeilenbelegen aus dem tatsächlichen Code), **Kapitel 8** (neu: Einordnung des Demo-Charakters), **Kapitel 9** (neu: Status-Gegenüberstellung gegen das Original-Kundendokument) und **Kapitel 10** (neu: konkrete nächste Schritte). Bei Widerspruch zwischen diesem Dokument und dem tatsächlichen Code gilt gemäß `CLAUDE.md` Abschnitt 0 immer der Code, genau das war die Leitfrage dieser Version.

**Methodik dieser Version:** 14 unabhängige Funktionsbereichs-Audits haben jeweils den tatsächlichen Quellcode (Next.js-Routen, React-Komponenten, Supabase-Migrationen 0000–0013), das Original-Kundendokument (`docs/requirements/CRM Kundenanforderungen Premium de-DE.docx`), das bestehende Anforderungsdokument (v1) und das Benutzerhandbuch gegenübergestellt. Jede Funktion wurde einer von sieben Reifegrad-Kategorien zugeordnet (Legende in Kapitel 8.2). Ergebnis: **v1 war an keiner Stelle falsch, aber an mehreren Stellen zu grob**, insbesondere unterschätzt v1 den Implementierungsstand von Phase 10–14 (dort existieren bereits vollständige, aber untereinander nicht verbundene UI-, API- und Datenbankschichten), während es an anderer Stelle den Reifegrad einzelner Phase-1–9-Funktionen leicht überzeichnet (z. B. Finanz-Buchungserstellung, Medien-Nachweis-Upload, Mitarbeiter-Statuswechsel, siehe Detailbefunde unten).

---

## Kapitel 1: Zusammenfassung

### 1.1 Die Idee, und der heutige Stand

1Çatı ("Ein Dach") ist eine webbasierte Property-Management- und Real-Estate-ERP-Plattform für Ataberk Estate, umgesetzt durch WAMOCON GmbH, für das Referenzobjekt New Level Premium in Avsallar/Alanya (769 Wohneinheiten). Ziel ist die Ablösung der bisherigen manuellen Koordination über Excel, WhatsApp und Vor-Ort-Absprachen durch ein rollenbasiertes, viersprachiges Betriebssystem für Eigentümer, Mieter, Personal, Buchhaltung und Geschäftsführung.

Diese Version korrigiert die Phasen-Einordnung aus v1 an einer entscheidenden Stelle: **Phase 10–14 sind nicht "geplant"/"nicht begonnen"**, wie v1 formulierte. Die Tiefenanalyse zeigt für jede dieser Phasen bereits eine vollständige, RBAC-geschützte Dashboard-Seite, mindestens eine API-Route und eine dedizierte, per Migration angelegte Datenbankstruktur. Der eigentliche Befund ist ein anderer, präziserer: **UI, API und Datenbank existieren für Phase 10–14 parallel, sind aber überwiegend nicht miteinander verdrahtet.** Die Dashboard-Seiten lesen ihre Daten direkt aus statischen TypeScript-Arrays statt aus den eigens dafür angelegten Supabase-Tabellen; die Tabellen selbst bleiben unbefüllt. Das ist ein anderer, spezifischerer Zustand als "nicht begonnen", treffender: **"Demo-Foundation mit getrennten Schichten"**. Die einzige Ausnahme mit tatsächlicher Live-Verdrahtung außerhalb Phase 1–9 ist die generische Audit-Log-Infrastruktur (`logClientAction`), die projektweit, auch in Phase 10–14, echt gegen Supabase schreibt.

Gleichzeitig zeigt die Tiefenanalyse auch für Phase 1–9 (in v1 als "Foundation/UAT-reif" beschrieben) einzelne Funktionen, die diesen Status nicht in vollem Umfang tragen: Es gibt aktuell **keine Möglichkeit, eine neue Finanzbuchung zu erfassen** (das Ledger ist nur ein Lese-/Reporting-Layer), **keinen funktionierenden Foto-/Video-Upload für Service-Nachweise** (nur ein Zähler, keine Datei-Ablage) und **keine automatisierte Verrechnung von Kautionen gegen Schulden**. Diese Einschränkungen widersprechen der Foundation-Einordnung nicht grundsätzlich, sollten aber nicht unter den Tisch fallen, wenn Stakeholder aus "Foundation" ableiten, dass diese Einzelfunktionen bereits vollständig sind.

Wichtige Einordnung, die für dieses Dokument durchgehend gilt: **Foundation ist nicht gleich Produktionsreife, und "im Code vorhanden" ist nicht gleich "im Dashboard sichtbar verbunden".** Kapitel 8 dieses Dokuments macht diese Unterscheidung explizit zum Thema.

### 1.2 Was ist neu gegenüber v1

| Änderung | Kurzbeschreibung |
|---|---|
| Phase 10 (Booking) neu eingeordnet | Nicht "nächster aktiver Build" (so v1), sondern bereits Foundation-Stand: 5 dedizierte DB-Tabellen (inkl. Doppelbuchungsschutz), vollständige, rollengefilterte Kalenderseite, aber UI und DB-Tabellen sind nicht verbunden; Kernfunktion "Reservierung erstellen" fehlt vollständig. |
| Phase 11 (Kommunikation/Dokumente) neu eingeordnet | Nicht "geplant" (so v1), sondern Foundation-Stand mit vollständiger UI; 5 DB-Tabellen angelegt, aber ungenutzt; Dokumenten-Upload ist der am weitesten entwickelte Teilbereich (echter Supabase-Storage-Pfad, aber standardmäßig deaktiviert). |
| Phase 12 (Mobile PWA) neu eingeordnet | PWA-Manifest und Service-Worker sind **bereits live**, nicht "geplant"; Offline-Sync-Dashboard ist Foundation-Demo; Push-Benachrichtigungen sind tatsächlich nicht umgesetzt. |
| Phase 13 (Integrationen) neu eingeordnet | Vollständige Provider-Übersichtsseite existiert bereits; interner Code stuft sich selbst als "ready_for_uat" ein, widerspricht v1s "Geplant"-Einstufung. Kein einziger externer Provider ist real angebunden. |
| Phase 14 (KI-Premium) neu eingeordnet | Weiter fortgeschritten als in v1 dargestellt (vollständige Demo-UI mit 7 Empfehlungsmodi existiert bereits), aber ohne jede echte KI-Berechnung oder DB-Anbindung, UI eilt der eigenen Statusangabe voraus. |
| F-05, F-12 korrigiert | v1 zitierte für Ledger-Unveränderlichkeit und Sicherheits-Hardening durchgängig "Migration 0007", das ist falsch. Die tatsächlichen Belege liegen in Migration 0003 (Ledger-Trigger) bzw. 0010/0011/0013 (Security-Hardening). Migration 0007 behandelt Booking/Communications (Phase 10/11) und hat keinen Bezug zu beiden Punkten. |
| F-08 aufgespalten | Workforce-/SLA-Board ist Foundation-Stand; der darin subsumierte Medien-/Fotonachweis-Workflow ist tatsächlich **nur Datenmodell ohne UI/API** (keine Upload-Möglichkeit), v1 hatte beides pauschal als "Umgesetzt (Foundation)" geführt. |
| Neue, bisher undokumentierte Funde | Käufer-Eignungsprüfung (Compliance-Seite), Leads-/CRM-Ansicht, verwaistes zweites CRM-Datenmodell (toter Code), Demo-Center `/pitch`, zwei tote Komponenten (`SyncBadge`, `useSeedData`), siehe Kapitel 7.7. |
| Neu: Kapitel 8 „Demo" | Reifegrad-Legende plus Erläuterung, was „Demo" bei 1Çatı konkret bedeutet. |
| Neu: Kapitel 9 „Status-Gegenüberstellung" | Zeile-für-Zeile-Abgleich des Original-Kundendokuments gegen den tatsächlichen Demo-Stand. |
| Neu: Kapitel 10 „Nächste Schritte nach der Demonstration" | Konkrete, priorisierte Arbeitspakete pro Funktionsbereich. |

---

## Kapitel 2–5: Marktanalyse, Wettbewerb, Zielgruppe, Nutzen (Kurzfassung, unverändert gegenüber v1)

Diese vier Kapitel wurden für v2 nicht neu recherchiert, da der Auftrag für diese Version die Funktions- und Implementierungsanalyse war, nicht die Marktanalyse. Es besteht kein Anlass, an den Kernaussagen von v1 etwas zu ändern. Zur vollständigen Fassung mit allen 48 Quellenbelegen siehe `Anforderungsdokument-1Cati.md` Kapitel 2–5. Kernaussagen im Überblick:

- **Marktumfeld:** Der Auslandsimmobilienmarkt in Alanya/Antalya schrumpft weiter (Türkei-weit −9,4 % 2025, −27 % im Mai 2026 bei Ausländerverkäufen); Alanya bleibt trotz eines Rückgangs russischer Käufe von 6.640 (2022) auf 1.662 Einheiten (2025) der von russischen Käufern meistgewählte Landkreis der Türkei.
- **Wettbewerb:** Fünf etablierte türkische Site-Management-Anbieter (Apsiyon, Senyonet, Yönetimcell, Aidatım, Siteplus) sowie zwei neue KI-native türkische Wettbewerber (Çardak, Odyosi). Apsiyon ist mit zwei WhatsApp-KI-Assistenten (ASYA/ADA) der stärkste unmittelbare KI-Wettbewerber, deckt aber nicht 1Çatıs Finanz-Ledger-Tiefe ab. Keiner der Wettbewerber kombiniert Ledger-Tiefe, ITSM-artiges Service-Desk, öffentlichen Registrierungskanal und Human-Approval-KI in einem Produkt.
- **Zielgruppe:** Internationale Eigentümer/Mieter (primär DE/RU/UA/IR) plus sechs interne Betriebsrollen bei Ataberk Estate.
- **Nutzen:** Ablösung von Excel/WhatsApp durch zentrale, auditierbare Datengrundlage; für WAMOCON ein wiederverwendbares Referenzmodell für weitere Mandate im Segment.

---

## Kapitel 6: Abhängigkeiten und Machbarkeit (aktualisiert)

Kapitel 6.1–6.3 aus v1 (Architekturprinzip, Vendor-Shortlist, Kanalkosten-Referenz) bleiben inhaltlich gültig und unverändert, siehe `Anforderungsdokument-1Cati.md` Kapitel 6.1–6.3 für die vollständige Vendor-Tabelle und Kostenreferenz.

**Neu in v2, Dokumentations-Drift, der bei dieser Tiefenanalyse aufgefallen ist** (kein Vendor-/Machbarkeitsthema, aber eine Machbarkeitsvoraussetzung für saubere Weiterentwicklung: korrekte interne Referenzdokumentation):

| Dokument | Befund |
|---|---|
| `CLAUDE.md` Abschnitt 4 | Listet nur 7 Migrationsdateien (0000–0006). Tatsächlich existieren 14 Dateien (0000–0013). Migrationen 0007–0013 (Booking/Communications, Mobile/Integrations/AI, Document-Storage, zwei Security-Hardening-Migrationen, Public-Intake, Company-Context) sind in der Agenten-Referenzdokumentation vollständig unsichtbar. |
| `CLAUDE.md` Abschnitt 3.5 | Beschreibt den Locale-Switcher als "manuelle URL-Konstruktion", der tatsächliche Code nutzt den offiziellen `next-intl`-`createNavigation`-Router. |
| `CLAUDE.md` Abschnitt 3.7 | Führt `sync-badge.tsx` als aktiv genutzte Komponente, tatsächlich ist sie toter Code (siehe Kapitel 7.7). |
| `apps/web/.env.example` | Nennt weder `ENABLE_ACCESS_PROFILES`/`ACCESS_PROFILE_ROLE`/`CATI_ALLOW_REMOTE_ACCESS_PROFILES`/`CATI_ENV` (die tatsächlich verwendeten, serverseitigen Variablen) noch den in CLAUDE.md 3.10 erwähnten `TWENTO_API_KEY`-Tippfehler (im Code korrekt `TWENTY_API_KEY`). |
| `Anforderungsdokument-1Cati.md` (v1) F-05, F-12 | Zitieren "Migration 0007" für zwei Funktionen, die tatsächlich in Migration 0003 bzw. 0010/0011/0013 liegen, korrigiert in Kapitel 7 dieser Version. |

**Empfehlung:** Vor der nächsten größeren Weiterentwicklung `CLAUDE.md` Abschnitt 4 (Migrationstabelle) und Abschnitt 3.5/3.7 (Locale-Switcher, Sync-Badge) sowie `apps/web/.env.example` aktualisieren, diese Korrektur ist rein dokumentarisch und unabhängig von den in Kapitel 8.2 (v1) gelisteten 13 Kunden-/Legal-/Vendor-Entscheidungen, die weiterhin unverändert offen sind.

---

## Kapitel 7: Anforderungen und tatsächlicher Implementierungsstand (vollständig neu erhoben)

Dieses Kapitel ersetzt inhaltlich Kapitel 7 aus v1. Jede Funktion trägt eine Reifegrad-Kennzeichnung nach der in Kapitel 8.2 definierten Legende. Alle Aussagen sind mit Datei- und teils Zeilenbelegen aus dem tatsächlichen Code unterlegt (14 unabhängige Audits, Details im Session-Protokoll verfügbar).

### 7.1 Plattform-Fundament: Auth, RBAC, Sicherheit (Phase 3)

| ID | Funktion | Reifegrad |
|---|---|---|
| F-01 | Rollenbasiertes Zugriffsmodell (6 Rollen × 14 Ressourcen × 8 Aktionen) | Foundation, produktionsnah |
| F-02 | Postgres Row Level Security als zweite Verteidigungslinie | Foundation, produktionsnah |
| F-12 | Sicherheits-Hardening (Anti-Privilege-Escalation, RPC-Least-Privilege) | Foundation, produktionsnah, **Migrationsbeleg korrigiert: 0010/0011/0013, nicht 0007** |
| F-13 *(neu)* | Mandanten-/Firmenkontext-Isolation (Company-Scoped RLS über 17 Tabellen) | Foundation, produktionsnah |
| B-03 | Lokale Access-Profile für QA/Demo (Ein-Klick-Login ohne echte Session) | Demo-Foundation, mehrfach server-seitig abgesichert |

**F-01/F-02, RBAC + RLS als doppelte Verteidigungslinie.** `lib/rbac.ts` definiert 6 Rollen (admin/manager/accountant/staff/owner/tenant), 14 Ressourcen und 8 Aktionen. Jede API-Route prüft serverseitig `hasPermission`/`hasAnyPermission`, zusätzlich erzwingt `app/[locale]/dashboard/layout.tsx` einen Redirect *vor* dem Rendern, wenn die Rolle die Zielressource nicht sehen darf. Auf Datenbankebene erzwingt Postgres RLS dieselbe Hierarchie über SQL-Helper (`current_user_role_level()`, `is_admin_role()`), die die Rolle bewusst aus der `profiles`-Tabelle lesen, **nicht** aus dem JWT (`user_metadata` ist clientseitig manipulierbar). Beide Schichten sind echter, funktionierender Code, kein Mock.

**F-12, Sicherheits-Hardening.** Migration 0003 hatte den Signup-Trigger `handle_new_user()` zwischenzeitlich so geändert, dass die Rolle aus `raw_user_meta_data->>'role'` gelesen wurde, theoretisch hätte sich damit jeder Nutzer per Signup direkt als `admin` registrieren können. Migrationen 0010 und 0013 beheben das (Rolle wieder hart auf `tenant`), zusätzlich verhindert ein `BEFORE UPDATE`-Trigger, dass Nutzer ihre eigene Rolle/Firma/Büro-Zuordnung selbst ändern. Migration 0011 entzieht drei sensiblen SECURITY-DEFINER-RPCs (`search_operational_records`, `get_site_dashboard_snapshot`, `get_phase4_site_data`) den `anon`/`PUBLIC`-Zugriff. Dies ist eine dokumentierte, real behobene Schwachstelle, v1 hatte den korrekten Sachverhalt beschrieben, aber mit dem falschen Migrationsverweis "0007" (dort liegt tatsächlich Booking/Communications).

**F-13 (neu), Mandantenisolation.** Jede firmengebundene Tabelle (17 insgesamt, u. a. `sites`, `units`, `residents`, `finance_ledger_entries`, `service_tickets`) erhält per generischer Policy-Schleife: Lesen nur bei `company_id = current_user_company_id()`, Schreiben nur ab Rollenlevel Manager. Diese Funktion ist weder vom Kunden gefordert (Kundenanforderung beschreibt ein Einzelobjekt) noch in v1 als eigener Punkt geführt, eine vorausschauende Architekturentscheidung für künftige Mehrfirmen-/Mehrstandort-Skalierung.

**B-03, Access-Profile/Demo-Login.** Ausführlich in Kapitel 8 behandelt.

### 7.2 Kern-Datenmodell: Standort/Block/Etage/Wohnung (Phase 4)

| ID | Funktion | Reifegrad |
|---|---|---|
| F-03a | DB-Domänenmodell Standort→Block→Etage→Wohnung inkl. RLS | Foundation, produktionsnah |
| F-03b | Phase-4-API mit echter Supabase-RPC + lokalem Fallback | Foundation + Fallback (aktuell lokal-seed im Demo-Deploy) |
| F-03c | Daire-Matrix-Hauptansicht (Metrik-Karten, Block-Grid, Haupttabelle) | **Demo-Foundation, struktureller Bruch:** liest direkt aus Seed-Daten, ruft die eigene Live-API nicht auf |
| F-03d | `Phase4LiveOperations`-Komponente (Realtime, echte Quellen-Unterscheidung) | Foundation + Fallback, real live-fähig |
| F-03e | Import-Center (Batches, Findings, Datenqualität) | Foundation-Stand, Demo-Anzeige |
| F-03f | Import-Preview/-Commit | Foundation (Audit-Log), **kein echter Datenimport**, reine Freigabeanfrage |
| N-13 *(neu)* | Verkaufs-/Preis-Quellenmodell (`sale_status`, `price_source`) | Foundation, mit echten Quelldaten für Preis/Nummerierung |

Der wichtigste Einzelbefund dieses Bereichs: **Auf derselben Seite (`/dashboard/listings`) laufen zwei technisch getrennte Datenpfade.** Die sichtbaren Metrik-Karten, das 769-Zellen-Grid und die Haupttabelle importieren `flats`/`getBlockOverview()` **direkt** aus der statischen Seed-Datei, ohne jeden Bezug zur eigens dafür gebauten, echt funktionierenden API `/api/site-management/phase4` (die real gegen die SECURITY-DEFINER-RPC `get_phase4_site_data` läuft und rollenbeschränkt ist). Nur die eingebettete `Phase4LiveOperations`-Komponente ruft diese API tatsächlich auf, inklusive Realtime-Abo auf 11 Tabellen bei `source: "supabase"`. Das Backend ist also nachweislich funktionsfähig, die Hauptansicht der Seite nutzt es schlicht nicht. Dies ist der Prototyp für ein Muster, das sich in mehreren Modulen wiederholt (siehe 7.3–7.6): **echtes, funktionierendes Backend + Demo-Frontend, die parallel statt verbunden laufen.**

### 7.3 Finanzen, Zahlungen, Kautionen, Schuldner-Restriktionen (Phase 6–7)

| ID | Funktion | Reifegrad |
|---|---|---|
| F-05 | Finanz-Ledger-Anzeige (Live-Ledger-Karte) | Foundation + Fallback für den **Lesepfad**; **keine Schreib-/Buchungsfunktion im gesamten Code** |
| F-05b | Buchungsunveränderlichkeit gebuchter Einträge | Foundation, produktionsnah, **Migrationsbeleg korrigiert: 0003, nicht 0007** |
| F-05c | Finanzübersicht-Kopfbereich (KPI-Karten, Cashflow, Schuldenalterung) | **Demo-Foundation, struktureller Bruch:** Server Component ohne jeden Fetch, immer Seed-Daten |
| F-06 | Zahlungs-/Depot-/Mutabakat-Kontrollzentrum | Gemischt: Restriktions-/Mutabakat-Queue echt Foundation+Fallback; Zahlungsplan-Teil **strukturell nie live** (keine DB-Tabelle) |
| F-14 *(neu)* | Verkaufsraten-/Zahlungsplan ("Satış ödeme planı") | Nur TypeScript-Datenmodell, kein Supabase-Gegenstück möglich |
| F-15 *(neu)* | Kautionsverwaltung (Depot-Lifecycle) | Demo-Foundation, mit **Schema-Diskrepanz** (DB kennt 5 Status, UI/Seed kennen andere 5) und **ohne automatische Verrechnung** |
| F-16 *(neu)* | Schuldner-Restriktionsentscheidungen mit Human-Approval-Gate | Foundation als Empfehlung; **keine Ausführung** (keine echte Zugangs-/Reservierungssperre) |
| F-17 *(neu)* | Freigabe-Workflow für Finanzaktionen (Export, Mutabakats-Review) | Audit-Log real; **keine ausführende Logik** (kein echter Export) |

Dies ist der Bereich mit dem größten Abstand zwischen Anzeige und tatsächlicher Buchhaltungsfunktion. Die "Finanz-Ledger-Engine" (F-05) ist, präzise beschrieben, ein **Lese-/Reporting-Layer über bereits per Migration/Seed vorhandene Daten**, keine Zeile Code im gesamten `apps/web`-Baum legt eine neue Buchung an. Das widerspricht dem Konzept einer "Engine" im eigentlichen Sinn nicht grundsätzlich (Immutability und RBAC/RLS-Schutz sind real und produktionsnah umgesetzt), relativiert aber die Aussage "Umgesetzt (Foundation)" aus v1: Foundation gilt für Anzeige, Schutz und Protokollierung, nicht für die Buchungserfassung selbst. Zusätzlich besteht eine **latente RBAC/RLS-Inkonsistenz**: `lib/rbac.ts` gewährt der Rolle `accountant` (Level 60) `finance:create/update/approve`, die generische RLS-Schreibpolicy verlangt aber Level ≥ 70, aktuell folgenlos, da ohnehin kein Schreibpfad existiert, aber vor jeder künftigen Buchhaltungs-Schreibfunktion zu korrigieren.

Die von der Kundenanforderung explizit verlangte automatische Verrechnung ("Miete: Schulden des Eigentümers werden automatisch abgezogen, Restbetrag überwiesen"; "Dienstleistungsauftrag: bei Guthaben wird abgelehnt, sonst abgezogen") ist **nicht umgesetzt**, es existiert keine Code-Funktion, die bei Zahlungseingang automatisch gegen ein Konto verrechnet.

### 7.4 Service-Katalog, Tickets, Workforce, Medien-Nachweis (Phase 8–9)

| ID | Funktion | Reifegrad |
|---|---|---|
| F-07a | Service-Katalog (Preis, SLA, Schuldenpolitik) | Foundation + Fallback, produktionsnah für Lesepfad |
| F-07b | Service-Order-Kontrolle | **Gemischt:** Lesepfad echt, aber **kein Schreibpfad**, bei Ticket-Freigabe wird keine `service_orders`-Zeile erzeugt |
| F-07c | Ticket-Erstellung als Freigabe-Workflow | Foundation + Fallback, produktionsnah |
| F-07d | Servis-Talepleri-Dashboard (SLA, Priorität, RBAC) | Foundation + Fallback, **mit hartcodiertem Demo-Unit-Scoping** für Owner/Tenant |
| F-08a | Workforce-Tasks/SLA-Board | Foundation-Stand (Lesepfad), **kein Zuweisungs-/Statuswechsel-Schreibpfad im UI** |
| F-08b *(korrigiert, war Teil von F-08)* | Medien-/Fotonachweis-Workflow | **Nur Datenmodell, keine erreichbare UI/API.** `media_reports`-Tabelle mit RLS existiert, wird aber nirgends per SELECT/INSERT angesprochen; UI zeigt nur eine Zähler-Zahl, kein Upload |
| F-18 *(neu)* | KI-/Freigabewarteschlange für Serviceaktionen | Foundation, produktionsnah (kein LLM beteiligt, deterministische Risikoklassifikation) |

Der wichtigste Korrekturbedarf gegenüber v1: **F-08 war zu pauschal.** Das Workforce-/SLA-Board selbst ist echte Foundation (Migration + Repository-Query + UI, real funktionierender Lesepfad mit Fallback). Der darin mitgeführte Medien-/Fotonachweis ist dagegen die einzige Funktion in diesem Bereich, die tatsächlich **nur als Datenbanktabelle** existiert, es gibt keinen Dateiupload, keine Kamera-Komponente und keine API-Route, die je eine `media_reports`-Zeile erzeugt. Die UI-Kachel "Medya kanıtı" zeigt ausschließlich eine Zahl aus Ticket-Metadaten.

Ebenfalls neu identifiziert: Der von der Kundenanforderung geforderte Ablauf "Bestellung → Kontostand prüfen → Bezahlung → Auftrag erstellen → abschließen → Bericht erstellen" (Kundendokument Abschnitt 6.2/12.1) ist als **Anzeige/Ableitung** vorhanden, nicht als geschlossene Transaktionskette: Bei Ticket-Freigabe entsteht kein `service_orders`-Datensatz, Bestellungen werden stattdessen aus Ticket-Feldern abgeleitet.

### 7.5 Booking, Kommunikation, Mobile PWA, Integrationen, KI-Premium (Phase 10–14, grundlegend neu bewertet)

Dies ist der Bereich mit der größten Korrektur gegenüber v1. **Keine dieser fünf Phasen ist "geplant"/"nicht begonnen"**, für jede existiert bereits eine vollständige, RBAC-geprüfte Dashboard-Seite, mindestens eine API-Route und ein per Migration angelegtes Datenmodell. Der eigentliche, präzisere Befund: **Foundation-Stand mit getrennten, nicht verbundenen Schichten.**

| ID | Funktion (Phase) | Reifegrad |
|---|---|---|
| W-01a (10) | Reservierungs-/Belegungsübersicht | Demo-Foundation, 10 fest kodierte Buchungen, kein DB-Bezug |
| W-01b (10) | Move-in-Readiness-Board, Checkout-/Turnover-Aufgaben, Access-Handoff-Queue, Deposit-Settlement-Queue | Demo-Foundation je einzeln; **5 dedizierte DB-Tabellen (Migration 0007) inkl. Doppelbuchungsschutz existieren, werden aber von keiner dieser Funktionen gelesen/geschrieben** |
| W-01c (10) | „Reservierung erstellen" | **Nicht umgesetzt**, keine UI, keine API, obwohl von der Kundenanforderung explizit verlangt (Abschnitt 8, Szenario 12.2) |
| W-01d (10) | Booking-Operations-API | Demo-Foundation, **von der Dashboard-UI nicht aufgerufen**, Route deklariert sich selbst als `source: "local-demo-contract"` |
| W-02a (11) | Kommunikations-Postfach, Gäste-Journey-Messaging, Benachrichtigungsregeln, Vorlagen-Bibliothek | Demo-Foundation je einzeln; **5 dedizierte DB-Tabellen (Migration 0007) existieren, werden aber von keiner Kommunikationsfunktion genutzt** |
| W-02b (11) | Dokumenten-Vault, Dokumentenpaket-Board | Demo-Foundation, vollständige rollenbasierte Anzeige |
| W-02c (11) | Sicherer Dokumenten-Upload | **Foundation + Fallback, echter Supabase-Storage-Pfad, aber standardmäßig deaktiviert** (Migration 0009, benötigt `DOCUMENT_STORAGE_MODE=supabase` + Service-Role-Key; ohne beides werden Uploads nur validiert, nie gespeichert) |
| W-03a (12) | PWA-Manifest & Installierbarkeit | **Live**, funktioniert bereits ohne weitere Abhängigkeit |
| W-03b (12) | Service-Worker/App-Shell-Cache | **Live**, echter, global registrierter Service Worker, kein Mock |
| W-03c (12) | Offline-Sync-Dashboard & API | Demo-Foundation, explizit selbst-deklariert (`source: "local-demo-contract"`) |
| W-03d (12) | Push-Benachrichtigungen | **Nicht umgesetzt** |
| W-04a (13) | Provider-Integrationsübersicht (9 Kategorien) | Demo-Foundation, **0 echte externe Provider-Verbindungen** |
| W-04b (13) | Integrations-API-Route | Foundation, **von der eigenen UI nicht genutzt** |
| W-05/06/07 (14) | KI-Premium-Empfehlungen (7 Modi) & Bild-Workflows (4 Konzepte) | **UI ohne Backend**, vollständig hartcodierte Demo-Texte inkl. erfundener Konfidenzwerte, kein LLM-Aufruf, DB-Tabellen (Migration 0008) ungenutzt |

**Zentrale, wiederkehrende Beobachtung für Phase 10–14:** Migrationen 0007 und 0008 legen insgesamt **15 dedizierte Datenbanktabellen** für genau diese fünf Phasen an (u. a. `reservation_availability_blocks`, `booking_readiness`, `turnover_work_items`, `access_handoff_requests`, `deposit_settlements`, `message_threads`, `notification_rules`, `notification_deliveries`, `message_templates`, `document_packets`, `mobile_web_capabilities`, `offline_sync_jobs`, `integration_providers`, `ai_recommendations`, `ai_image_workflows`), **keine davon wird von der Anwendung gelesen oder beschrieben.** Alle zugehörigen Dashboard-Seiten arbeiten stattdessen mit statischen TypeScript-Arrays. Bemerkenswert ist zugleich, dass sich das System intern (`phaseDeliveryRecords`, sichtbar in der Dashboard-Phasenkarte) selbst für Phase 10–13 bereits als **"ready_for_uat"** einstuft, das ist eine rein manuell gepflegte Selbstauskunft ohne automatisierte Rückkopplung zum tatsächlichen Code- oder Testzustand und widerspricht damit sowohl v1s "Geplant" als auch der hier präziseren Einordnung "Foundation mit getrennten Schichten". Einzige Ausnahme mit echter, durchgängiger Live-Verdrahtung über alle fünf Phasen: die generische Audit-Protokollierung (`logClientAction`/`log_client_action`-RPC), die für Freigabe-/Review-Aktionen in jeder dieser Phasen tatsächlich gegen Supabase schreibt.

### 7.6 New-Level-Premium-Modul (Erweiterung über den ursprünglichen Auftrag hinaus)

Gegenüber v1 im Kern bestätigt, mit einer wichtigen Ergänzung: der fehlende Rückweg nach Einreichung.

| ID | Funktion | Reifegrad |
|---|---|---|
| N-01 | Öffentliche AIDA-Landingpage | Umgesetzt, demo-sicher |
| N-02 | Kontofreie Registrierung (Owner/Tenant/Staff) mit harter Rollen-Allowlist | Foundation + Fallback, produktionsnah für den Schreibpfad |
| N-03 | Identitätsprüfung (IDV-Gateway) | Demo-simuliert; **auch mit echtem Provider würden aktuell keine Dokumentfotos/Selfies übertragen**, kein Upload-Feld im Formular |
| N-05 | Öffentlicher Meldekanal | Foundation + Fallback, produktionsnah für den Schreibpfad |
| N-06 | QR-Code-Poster | Live, aber **von der Landingpage aus nicht verlinkt**, nur über direkte URL/QR-Code erreichbar |
| N-08 | KVKK-/KBS-bewusste Aufbewahrungsfrist | Nur Datenmodell/Queueing, kein automatisierter Löschjob, keine echte Behördenübermittlung |
| N-09 | Datenblinder öffentlicher KI-Concierge | Foundation, demo-sicher, verifiziert konstruktionsbedingt datenblind |
| N-11 | Zeitzugang-Verwaltungspanel (Tenant Access Grants) | UI ohne Backend, reine Client-Simulation, **keine Persistenz** (bestätigt v1) |
| N-12 | Interesse-/Eskalations-Analytics | Foundation + Fallback, **kein Auswertungs-UI vorhanden** (reiner Schreibpfad) |
| N-14 *(neu)* | Feedback-Loop für den öffentlichen Concierge | Foundation + Fallback |
| N-15 *(neu)* | Admin-seitige Triage/Freigabe eingehender Registrierungen/Meldungen | **Nicht umgesetzt** |

Der wichtigste neue Befund: Registrierung, Meldekanal und QR-Poster sind technisch funktionierende, Ende-zu-Ende-getestete Schreibpfade (Playwright-Coverage vorhanden), aber das Modul ist ein **reiner Intake-Trichter**. Es gibt keine Dashboard-Seite, die eingehende Registrierungs- oder Meldeanfragen auflistet; selbst der generische Freigabe-Endpunkt bewirkt für diese Aktionstypen inhaltlich nichts außer einem Status-Flag (`materializeApprovedTicketRequest()` gibt für Nicht-Ticket-Typen `null` zurück). Der in Marketing-Copy und v1 suggerierte Rückweg, Prüfung → Freigabe → tatsächlicher Zugang bzw. Ticket, endet im Code an der Warteschlangen-Zeile.

### 7.7 Basisfunktionalitäten (aktualisiert)

| ID | Funktion | Reifegrad |
|---|---|---|
| B-01 | Zweischichtiges i18n-System (next-intl + Business-Copy) | Live, solide über Foundation hinaus (Message-Parität verifiziert, E2E-Turkish-Leakage-Guard) |
| B-02 | Dunkel-/Hell-Modus | Live, **mit Einschränkung:** manueller Umschalter existiert nur im Dashboard, öffentliche Seiten (Landing, Platform, Pitch, Login/Signup) folgen nur passiv dem System-Farbschema |
| B-03 | Lokale Access-Profile | Demo-Foundation, mehrfach abgesichert (siehe Kapitel 8) |
| B-04 | Interner KI-Assistent | Foundation, deterministischer Fallback ohne aktives Gateway im Standarddeploy |
| B-05 | Responsive Web-App-Architektur | Umgesetzt als Web-App; PWA-Hardening siehe 7.5/W-03 |
| B-06 | Playwright-E2E-Testsuite | **Umfangreicher als in v1/CLAUDE.md dargestellt:** tatsächlich 20 Spec-Dateien (nicht 6), inkl. RBAC-Rollentrennung, OpenAPI-Contract-Checks, KI-Concierge-Verhalten, über 90 Einzeltests |
| B-07 *(neu)* | Zentrales, tokenbasiertes Design-System (Tailwind v4 CSS-first) | Live, konsequent für Light/Dark genutzt |
| B-08 *(neu)* | Dashboard-Kommando-Leiste (globale Suche/Filter) | Demo-Foundation, Index aus statischen Arrays, RBAC-Filterung echt |

### 7.8 Bisher undokumentierte Zusatzfunde (weder in v1 noch im Benutzerhandbuch erfasst)

Diese Funktionen existieren nachweislich im Code, waren aber in keinem der drei geprüften Referenzdokumente (v1, Benutzerhandbuch, Kundenanforderung) beschrieben:

- **Käufer-Eignungs-Vorprüfung** (`/dashboard/compliance`, unterer Bereich): Vertriebs-Vorqualifizierung von Kaufinteressenten (Budget, Bezirksprüfung, Gutachtenpflicht) mit explizitem Hinweis "keine Rechtsgarantie". Demo-Foundation, reine Vertriebs-/New-Level-Premium-Zusatzfunktion.
- **Leads-/CRM-Ansicht** (`/dashboard/leads`, „Müşteri Adayları"): Zeigt trotz des Namens keine echte Lead-Pipeline, sondern die bestehenden `residents`-Datensätze in CRM-Aufmachung (Risiko, WhatsApp-Präferenz, „AI-Kommunikationspriorität"). Kein eigenständiges Lead-Datenmodell.
- **Verwaistes zweites CRM-Datenmodell** (`lib/seed-data.ts`, `hooks/use-seed-data.ts`): Ein vollständiges, aber komplett unverdrahtetes zweites `Lead`/`Deal`-Datenmodell mit echten Feldern wie Quelle/Temperatur/Budget, genau die Felder, die das Benutzerhandbuch (Kapitel 4.3) fälschlich der aktiven Leads-Seite zuschreibt. Wird von keiner Datei außer sich selbst importiert, toter Code.
- **Zwei tote UI-Komponenten:** `SyncBadge` (soll Live/Poll-Sync-Status anzeigen, wird aber nirgends eingebunden, die tatsächliche Sync-Anzeige läuft über `LiveErpSimulation`) und `useSeedData` (Hook auf das oben genannte verwaiste Datenmodell).
- **Demo-Center `/pitch`:** Vollständige, viersprachige Vertriebs-/Präsentationsseite (Preismodell €5/Nutzer/Monat, 7 Kaufargumente, 6 Rollenkarten, 8-Kapitel-Ablaufplan) mit eigenem E2E-Test. Weder im Kundenauftrag noch in v1 erfasst; die dort genannte Preisangabe ist in keinem geprüften Dokument rückverfolgbar.

### 7.9 Scope-Abgrenzung (unverändert gegenüber v1)

Siehe `Anforderungsdokument-1Cati.md` Kapitel 7.5, weiterhin gültig: Alle in 7.1–7.8 gelisteten Punkte sind lauffähig mit deterministischen Seed-Daten und ohne Abhängigkeit von einer produktiven Supabase-Cloud-Instanz. Echte Behördenübermittlung, echter IDV-Provider, jede Zahlungs-/Bank-/Zugangshardware-Integration und jede "Live"-KI-Automatisierung bleiben explizit nicht produktionsscharf, unabhängig vom Code-Reifegrad.

---

## Kapitel 8: Demo, Einordnung und Reifegrad-Legende

### 8.1 Was „Demo" bei 1Çatı konkret bedeutet

Wenn dieses Dokument oder das Produkt selbst von „Demo" spricht, ist damit ein präzise definierter, technischer Zustand gemeint, keine grobe Umschreibung von „noch nicht fertig". Der Demo-Modus von 1Çatı funktioniert wie folgt:

1. **Zugang ohne echten Login:** Über lokale Access-Profile kann jede der 6 Rollen per Klick aktiviert werden, ohne Supabase-Auth-Session. Dieser Modus ist ausschließlich für lokale QA oder eine ausdrücklich isolierte, rein synthetische Remote-Preview bestimmt. Auf einer Produktionsumgebung bleibt er unabhängig von Konfigurationsflags immer gesperrt; ein Client-Demo mit echten oder produktionsnahen Daten verwendet echte Authentifizierung.
2. **Deterministische Seed-Daten statt echter Kundendaten:** Ohne konfigurierte Supabase-Cloud-Instanz (oder wenn eine Abfrage fehlschlägt) liefert praktisch jedes Modul deterministische, vorab definierte Beispieldaten (der 769-Einheiten-Referenzdatensatz für New Level Premium, Beispiel-Tickets, Beispiel-Buchungen usw.). Diese Daten sind realistisch, aber nicht echt, Namen, Salden und Historien sind synthetisch generiert.
3. **Kein Vollzug sensibler Aktionen:** Zahlungen werden nicht gebucht, Zugänge werden nicht gesperrt, Identitäten werden nicht wirklich geprüft, Behördenmeldungen werden nicht übermittelt, KI trifft keine autonomen Entscheidungen. Jede sensible Aktion endet, by design, in einer Freigabe-Warteschlange (`client_action_requests`) statt in einer sofortigen Ausführung.
4. **Audit-Protokollierung ist die einzige durchgängig „echte" Schreibfunktion:** Unabhängig vom Modul schreibt praktisch jede Nutzerinteraktion (Freigabe anfordern, Aktion protokollieren) tatsächlich einen Datensatz, entweder echt in Supabase (`log_client_action`-RPC) oder in einen lokalen In-Memory-Fallback, wenn keine Cloud-Instanz konfiguriert ist.

#### 8.1.1 Die Absicherung des Demo-Zugangs im Detail

Der Ein-Klick-Demo-Zugang ist kein einfacher Schalter, sondern eine zentral ausgewertete Fail-Closed-Policy:

- Eine Produktionsumgebung (`VERCEL_ENV=production` oder `CATI_ENV=production`) lehnt Access-Profile immer ab; kein Flag kann diese Sperre aufheben.
- Eine Remote-Preview benötigt gleichzeitig `ENABLE_ACCESS_PROFILES=true`, `CATI_ALLOW_REMOTE_ACCESS_PROFILES=true` und `CATI_DEMO_DATA_ISOLATED=true`.
- Sobald in dieser Preview eine Supabase-Datenebene konfiguriert ist, bleibt der Zugang gesperrt. Damit können anonyme Rollenprofile nicht mit echten Profilen, Finanzdaten oder Bewohnerdaten verbunden werden.
- Lokale Entwicklung bleibt testbar; ein lokaler Production-Build benötigt die explizite serverseitige QA-Freigabe `ENABLE_ACCESS_PROFILES=true`.
- `apps/web/lib/access-profile-policy.ts` ist die einzige Policy-Quelle und wird von Auth, Proxy und den funktionalen Sicherheitsverträgen gemeinsam verwendet. Dadurch gibt es keine driftende Doppelimplementierung.

### 8.2 Reifegrad-Legende (angewendet in Kapitel 7 und 9)

| Kategorie | Bedeutung |
|---|---|
| **Live** | Echte, produktionsfähige Funktion ohne Fallback-Notwendigkeit (z. B. PWA-Manifest, OpenAPI-Spezifikation, i18n-System). |
| **Foundation + Fallback** | Es existiert eine echte Supabase-Anbindung **und** ein deterministischer lokaler Fallback; das Antwortobjekt unterscheidet `source: "supabase" | "local-seed"` korrekt. Im aktuellen Demo-Deploy meist im Fallback-Zweig aktiv. |
| **Demo-Foundation** | Funktionierender, nicht-triviale Code (RBAC-Prüfung, Filterlogik, UI real vorhanden), aber Daten oder Ausführung sind strukturell an statische Seed-Arrays gebunden, auch bei konfigurierter Supabase-Instanz würde sich nichts ändern. |
| **UI ohne Backend** | Sichtbare Oberfläche vorhanden, aber keine echte Schreib-, Berechnungs- oder Speicherlogik dahinter (reiner Platzhalter/Mock). |
| **Nur Datenmodell** | Migration/Tabelle inkl. RLS existiert in Supabase, wird aber von keiner Anwendungszeile gelesen oder beschrieben. |
| **Nicht umgesetzt** | Kein Code-Beleg gefunden, auch keine Teilimplementierung. |
| **Toter Code** | Komponente/Modul existiert im Repository, wird aber von keiner anderen Datei im Produktcode importiert oder verwendet. |

### 8.3 Warum diese Unterscheidung für die Präsentation wichtig ist

Bei einer Live-Demonstration wirken viele Bereiche gleich überzeugend, unabhängig von ihrem tatsächlichen Reifegrad, eine vollständig gerenderte Kalenderseite mit realistischen Buchungen sieht in einer Präsentation identisch aus, ob sie aus Supabase oder aus einem statischen Array kommt. Genau deshalb enthält Kapitel 7 dieses Dokuments für **jede** Funktion eine explizite Reifegrad-Angabe: Damit Stakeholder-Erwartungen (Kunde, Geschäftsführung, künftige Vertriebsgespräche) exakt auf dem tatsächlichen Stand aufsetzen und nicht auf dem visuellen Eindruck der Demo. **Jede Aussage in einer Verkaufs- oder Stakeholder-Präsentation, die über den in Kapitel 7 dokumentierten Reifegrad hinausgeht, ist eine Überzeichnung und sollte vor der Präsentation korrigiert werden.**

---

## Kapitel 9: Status-Gegenüberstellung, Original-Kundenanforderung vs. Demo-Umsetzung

Diese Tabelle stellt jeden Abschnitt des Original-Kundendokuments (`docs/requirements/CRM Kundenanforderungen Premium de-DE.docx`, „Technische Spezifikation, Verwaltungssystem für Wohnanlagen (CRM Premium)") dem tatsächlichen Demo-Implementierungsstand gegenüber. Legende: **Vollständig** = die Anforderung ist im Demo-Stand vollständig sichtbar/nutzbar (nicht zu verwechseln mit produktionsscharf, siehe Kapitel 8); **Teilweise** = ein Teil ist umgesetzt, ein explizit benannter Teil fehlt; **Nicht umgesetzt** = kein Code-Beleg; **Übererfüllt** = 1Çatı bietet hier mehr, als der Kunde angefordert hat.

| Kundenanforderung (Abschnitt) | Status | Beleg / Einschränkung |
|---|---|---|
| 1. Zweck des Systems (Einzelplattform, 769 Wohnungen) | **Vollständig** | Zentrale Plattform mit echtem 769-Einheiten-Referenzdatensatz umgesetzt. |
| 2.1 Core: Standort→Block→Wohnung, Beziehungen | **Vollständig** | Vollständiges DB-Schema mit RLS, echte Foundation-API (Kap. 7.2). |
| 2.2 Financial Engine (Kontoführung, Saldenverwaltung, Abrechnung, Inkasso, Kaution, automatische Verrechnung) | **Teilweise** | Kontoführung/Saldenanzeige ja; **Abrechnung/Inkasso-Erfassung und automatische Verrechnung fehlen** (Kap. 7.3). |
| 2.3 Operations (Aufgaben, Dienste, Personal, Lager) | **Teilweise** | Aufgaben/Dienste als Foundation; Lagerverwaltung explizit „optional nach MVP" beim Kunden, nicht umgesetzt, aber auch nicht Pflicht. |
| 2.4 Client-Ebene (Web-Admin-Panel, native Mobile App) | **Teilweise** | Web-Admin-Panel vollständig; **native Mobile App nicht umgesetzt**, stattdessen PWA (Kap. 7.5, W-03a/b bereits live). |
| 3. Benutzerrollen (6 Rollen mit spezifischen Rechten) | **Übererfüllt** | 6 Rollen exakt wie gefordert, zusätzlich granular in 14 Ressourcen × 8 Aktionen aufgelöst (Kap. 7.1). |
| 4.1 Wohnung (ID, Block, Etage, Typ, Status) | **Vollständig** | Umgesetzt, Statuswerte granularer als gefordert. |
| 4.2 Nutzer (ID, Typ, Kontaktdaten, Dokumente, Zuordnung) | **Teilweise** | Kontaktdaten/Rollenzuordnung ja; Dokumente liegen in einem separaten Modul (Kap. 7.5, W-02b). |
| 4.3 Persönliches Konto (Guthaben, Währung, Transaktionsverlauf) | **Teilweise** | Anzeige ja; keine Möglichkeit, eine neue Transaktion anzulegen. |
| 4.4 Transaktion (Art, Betrag, Datum, Quelle, Status) | **Teilweise** | Datenmodell und Anzeige vollständig; Erfassung fehlt. |
| 4.5 Dienstleistung (Name, Preis, Anbieter, SLA) | **Vollständig** | Service-Katalog vollständig, sogar mit zusätzlichen Kategorien. |
| 4.6 Auftrag/Task (Typ, Priorität, Status, Zuständiger, Foto-/Videobericht) | **Teilweise** | Task-Board vollständig; **Foto-/Videobericht nur Datenmodell, kein Upload möglich** (Kap. 7.4, F-08b). |
| 4.7 Buchung (Wohnung, Zeitraum, Status, Zahlungen) | **Teilweise** | Anzeige/Board vollständig; **Buchung erstellen nicht umgesetzt** (Kap. 7.5, W-01c). |
| 4.8 Kaution (Betrag, Status) | **Teilweise** | Anzeige ja; Statusmodell weicht zwischen DB und UI ab, keine automatische Verrechnung (Kap. 7.3, F-15). |
| 5.1–5.2 Guthabenarten, Haupttransaktionen | **Teilweise** | Alle vier Guthabenarten abgebildet; Transaktionserfassung fehlt (s. o.). |
| 5.3 Finanzregeln (Dienstleistung: Saldo>0→Ablehnung; Miete: automatischer Abzug; Kaution: Sperrung/Verwendung/Rückerstattung) | **Teilweise** | Die *Erkennung* der Regeln ist als Empfehlung mit Human-Approval-Gate umgesetzt (Kap. 7.3, F-16); die *automatische Ausführung* (Verrechnung, Sperrung) ist **nicht umgesetzt**. |
| 5.4 Einschränkungen (Schulden→Buchungssperre/Kartendeaktivierung/Dienstsperrung) | **Teilweise** | Entscheidungsempfehlung ja; tatsächliche Sperrung/Deaktivierung **nicht umgesetzt**. |
| 6.1–6.2 Dienstverwaltung (Katalog, Ablauf) | **Teilweise** | Katalog vollständig; Ablauf „Bestellung→Prüfung→Zahlung→Auftrag→Bericht" nur als Anzeige/Ableitung, nicht als geschlossene Transaktionskette (Kap. 7.4). |
| 7. Aufgabenverwaltung (Erstellen, Zuweisung, SLA, Foto-/Videobericht) | **Teilweise** | Erstellen/SLA-Überwachung ja; Zuweisung/Statuswechsel im UI nicht verdrahtet; Foto-/Videobericht fehlt (s. o.). |
| 8. Vermietung & Reservierung (Kalender, Reservierung erstellen, Zahlungskontrolle, automatische Aufgaben) | **Teilweise** | Kalender/Board vollständig (Kap. 7.5); **Reservierung erstellen fehlt vollständig**, vom Kunden explizit gefordert. |
| 9. Kommunikation (Chat, Team-Chat, Push/E-Mail/SMS) | **Teilweise** | Vollständige UI-Struktur (Postfach, Vorlagen, Regeln) vorhanden; **kein Kanal ist tatsächlich live**, kein echter Versand. |
| 10. Mobile App (Login, Guthaben, Zahlung, Chat, Benachrichtigungen, Dokumente, Transaktionsverlauf) | **Teilweise** | Als PWA (nicht native) mit denselben Funktionen über den Browser abgedeckt; Push fehlt. |
| 11. Integrationen (Zahlung/Banken, Identität, Zugang, Kameras) | **Teilweise** | Vollständige Provider-Übersichtsseite für alle vier Kategorien; **0 echte externe Verbindungen** (Kap. 7.5, W-04). |
| 12.1 Szenario Dienstleistungsauftrag | **Teilweise** | Freigabe-/Protokollteil echt; automatische Zuweisung/Benachrichtigung/Auftragserzeugung fehlt. |
| 12.2 Szenario Mieter-Einzug | **Teilweise** | Konzeptionell im Readiness-Board abgebildet; keine echte Buchung als Ausgangspunkt vorhanden (da „Reservierung erstellen" fehlt). |
| 12.3 Szenario Auszug | **Teilweise** | Checkout-/Turnover-Board vorhanden; unterliegende Datenkette nicht verbunden. |
| 12.4 Szenario Zahlungsverzug | **Teilweise** | Erkennung/Benachrichtigungs-Konzept ja; Einschränkungsvollzug fehlt (s. 5.4). |
| 13. Berichterstattung (Finanzberichte, Schuldenliste, Serviceberichte, Mitarbeiterleistung, täglicher Cashflow) | **Teilweise** | Finanz-/Schulden-/Servicereports vorhanden; **kein eigenes Mitarbeiterleistungs-Reportcard**; Cashflow ist **monatlich**, nicht täglich aggregiert. |
| 14. Dashboard (Einnahmen, Ausgaben, Schulden, Aufgaben, KPI) | **Teilweise** | Schulden/Aufgaben/KPI live-fähig (mit Fallback); **Einnahmen-/Ausgaben-Kacheln sind strukturell immer Seed-Daten**, auch bei aktiver Supabase-Anbindung. |
| 15. Systemanforderungen (API-first, RBAC, Protokollierung, Skalierbarkeit, Fehlertoleranz) | **Vollständig** | RBAC/RLS/Audit-Log echt und produktionsnah; API-first-Prinzip an einigen Stellen inkonsistent (mehrere API-Routen existieren parallel zur UI, ohne von ihr genutzt zu werden, s. Kap. 7.5). |
| 16. MVP (Kern, Finanzen, Dienste+Aufgaben, einfache Mobile App) | **Teilweise** | Kern/Dienste/Aufgaben als Foundation vorhanden; Finanzen ohne Erfassungsfunktion; Mobile App als PWA statt nativ. |

**Zusammenfassende Einordnung dieser Tabelle:** Von den 27 bewerteten Abschnitten ist **keiner** als "Nicht umgesetzt" einzustufen, für jeden Abschnitt existiert mindestens eine sichtbare, funktionierende Teilumsetzung. Gleichzeitig ist **kein einziger Abschnitt vollständig produktionsscharf** im Sinne einer geschlossenen, automatisch ausführenden Transaktionskette; die wiederkehrende Lücke ist durchgängig dieselbe: **Anzeige/Empfehlung ja, automatischer Vollzug (Buchung, Sperrung, Versand, Verrechnung) nein.** Das ist konsistent mit dem projektweiten Human-Approval-Prinzip (Kapitel 1.2, B-04), es ist keine zufällige Lücke, sondern eine bewusste Sicherheitsentscheidung, sollte aber gegenüber dem Kunden nicht als "vollständig erfüllt" kommuniziert werden, ohne diesen Vorbehalt zu nennen.

---

## Kapitel 10: Nächste Schritte nach der Demonstration

Diese Liste ist nach Aufwand/Nutzen priorisiert und trennt bewusst zwischen **Verdrahtungsarbeit** (Backend existiert bereits, muss nur an die UI angeschlossen werden, relativ schneller Gewinn) und **Neuentwicklung** (es existiert noch kein Code-Pfad).

### 10.1 Sofort möglich, reine Verdrahtung bereits existierender Backends (kein Vendor/Legal-Vorbehalt)

1. **Daire-Matrix-Hauptansicht an `/api/site-management/phase4` anschließen** (Kap. 7.2, F-03c), die Live-API und die RPC existieren bereits und funktionieren nachweislich in der eingebetteten `Phase4LiveOperations`-Komponente derselben Seite.
2. **Finanzübersicht-Kopfbereich von Seed-Daten auf `getDashboardSnapshot()`/`getFinanceLedgerData()` umstellen** (Kap. 7.3, F-05c), beide Funktionen liefern bereits echte Live-Daten mit Fallback, werden von diesem Seitenbereich nur nicht aufgerufen.
3. **Reports-, Compliance- und Settings-Seiten auf ihre eigenen, bereits existierenden API-Routen umstellen** statt direkt aus Seed-Daten zu importieren (`/api/site-management/phase-status`, `/api/ai/premium`, `/api/site-management/integrations`, `/api/site-management/booking-operations`, `/api/site-management/communications`, `/api/site-management/document-packets`), alle sind bereits RBAC-geschützt und lauffähig, werden aber von keiner Dashboard-Seite tatsächlich per `fetch` aufgerufen.
4. **F-05/F-12-Migrationsverweise in `CLAUDE.md` und in v1 korrigieren** (Kap. 6), reine Dokumentenpflege, kein Code-Risiko.
5. **`SyncBadge`- und `useSeedData`-toten Code entfernen** oder bewusst archivieren (Kap. 7.8), reduziert Verwechslungsgefahr für künftige Agenten/Entwickler.

### 10.2 Kurzfristige Neuentwicklung, kein Vendor-Vorbehalt, aber neue Schreibpfade nötig

6. **„Reservierung erstellen"-Formular + API-Route bauen** (Kap. 7.5, W-01c; Kap. 9, Abschnitt 8), von der Kundenanforderung explizit gefordert und aktuell die auffälligste funktionale Lücke im gesamten System.
7. **Finanzbuchungserfassung** (neue Buchungszeile anlegen, mit Immutability-Trigger als Schutz danach), schließt die Lücke aus Kap. 7.3, F-05.
8. **Foto-/Video-Upload für Service-Nachweise** an die bereits bestehende `media_reports`-Tabelle anschließen (Kap. 7.4, F-08b), Tabelle und RLS existieren bereits, es fehlt nur die Upload-Komponente und die zugehörige API-Route (kann sich an `document-storage.ts`/Migration 0009 als Vorbild orientieren, dort existiert dasselbe Muster bereits für Dokumente).
9. **Admin-Triage-Oberfläche für New-Level-Premium-Registrierungen/Meldungen** (Kap. 7.6, N-15), die Daten landen bereits in `client_action_requests`, es fehlt nur eine filternde Dashboard-Ansicht plus eine echte Materialisierungsfunktion (Profil-/Resident-Anlage bzw. Ticket-Konvertierung) anstelle des aktuellen `null`-Rückgabewerts.
10. **RBAC/RLS-Inkonsistenz bei `accountant`-Finanzrechten beheben** (Kap. 7.3), vor Punkt 7 zu klären, sonst schlägt die erste echte Buchhaltungs-Schreibfunktion in Produktion an der RLS-Policy fehl.

### 10.3 Abhängig von Kunden-/Legal-/Vendor-Entscheidung (siehe weiterhin `Anforderungsdokument-1Cati.md` Kapitel 8.2, unverändert offen)

11. Zahlungsanbieter, Bankabgleich, SMS-/E-Mail-/Push-Provider, Zugangssystem-Hardware, ohne diese Entscheidungen bleibt Phase 11–13 zwangsläufig auf Demo-Stand, unabhängig vom Entwicklungsaufwand.
12. Echter IDV-Provider inkl. Dokument-/Selfie-Upload (Kap. 7.6, N-03), erfordert zusätzlich eine neue Upload-Komponente, die aktuell nicht existiert.
13. Rechtliche Freigabe der KBS-/KVKK-Einordnung durch einen lizenzierten türkischen Anwalt (Kap. 7.6, N-08), Voraussetzung, bevor aus dem reinen Queueing eine echte Behördenübermittlung werden darf.
14. Produktions-UAT mit echten Kundendaten für alle in Kapitel 9 als „Teilweise" markierten Abschnitte.

### 10.4 Empfehlung zur Reihenfolge

Die Punkte in 10.1 liefern den größten sichtbaren Fortschritt für den geringsten Aufwand, da in jedem Fall nur eine bereits vorhandene, getestete Backend-Funktion an eine bereits vorhandene UI angeschlossen wird, kein neues Risiko, kein neuer Datenfluss. Punkt 6 (Reservierung erstellen) sollte vorgezogen werden, da es die einzige explizit vom Kunden geforderte Funktion ist, die aktuell vollständig fehlt. Punkte 11–14 sind terminlich nicht durch Entwicklungsgeschwindigkeit steuerbar (Meta-Business-Verifizierung allein benötigt laut Kapitel 6.3 der v1 bereits 1–6 Wochen) und sollten unabhängig vom Entwicklungsfortschritt parallel angestoßen werden.

---

## Kapitel 11: Chancen und Risiken (unverändert gegenüber v1)

Siehe `Anforderungsdokument-1Cati.md` Kapitel 8 für die vollständige Fassung inkl. Begründungen. Die 13 dort gelisteten offenen Kunden-/Legal-/Vendor-Entscheidungen sind zum Stand dieser Version **unverändert offen**. Ergänzend aus dieser Tiefenanalyse: Keines der in Kapitel 7 identifizierten technischen Nacharbeitsthemen (fehlende Reservierungserstellung, fehlende Finanzbuchungserfassung, fehlender Medien-Upload, nicht verbundene Phase-10–14-Backends) stellt ein Risiko im Sinne einer Fehlentscheidung dar, es sind bekannte, klar benannte Arbeitspakete (Kapitel 10), keine verdeckten Mängel.

---

## Kapitel 12: Umsetzungsplan (aktualisiert)

Kapitel 9.1 aus v1 (Entwicklungsansatz) bleibt unverändert gültig. Die Fahrplan-Tabelle (v1 Kapitel 9.2) wird durch die präzisere Einordnung aus Kapitel 7 dieser Version ersetzt:

| Phase | Fokus | Status (korrigiert) |
|---|---|---|
| 1–9 | Discovery, UX/RBAC-Design, Plattform-Fundament, Site-/Unit-Modell, Nutzerverwaltung, Finanz-Ledger, Zahlungs-/Schuldnerkontrollen, Service-Katalog, Task-/SLA-/Feldreporting | Foundation/UAT-reif, mit dokumentierten Einzel-Einschränkungen (Kapitel 7.1–7.4: keine Finanzbuchungserfassung, kein Medien-Upload, kein automatischer Restriktionsvollzug) |
| New-Level-Premium-Modul | Öffentliche Landingpage, Registrierung, Meldekanal, Identitätsprüfung, Zeitzugang, öffentlicher KI-Concierge | Umgesetzt (Demo-sicher) als reiner Intake-Trichter; Admin-Triage-Rückweg fehlt (Kapitel 7.6, 10.2) |
| 10 | Booking, Move-in, Checkout | **Foundation-Stand mit getrennten Schichten** (korrigiert von „nächster aktiver Build"); Kernfunktion „Reservierung erstellen" fehlt |
| 11 | Kommunikation, Benachrichtigungen, Dokumente | **Foundation-Stand mit getrennten Schichten** (korrigiert von „Geplant"); Dokumenten-Upload am weitesten entwickelt, aber standardmäßig deaktiviert |
| 12 | Mobile PWA Hardening | **PWA-Shell bereits live**; Offline-Sync Foundation-Demo; Push nicht umgesetzt (korrigiert von „Geplant") |
| 13 | Externe Integrationen | **Foundation-Stand, intern bereits „ready_for_uat" eingestuft** (korrigiert von „Geplant"); 0 echte Provider-Verbindungen, Vendor-Entscheidungen weiterhin offen |
| 14 | KI-Premium-Layer, Advanced Analytics | **Vollständige Demo-UI bereits vorhanden** (korrigiert von „Geplant"); keine echte KI-Berechnung, DB-Tabellen ungenutzt |
| 15 | QA, Security, Performance, UAT, Training, Launch | Security-Hardening-Teilaspekt bereits umgesetzt (Migrationen 0010/0011); übrige Bestandteile (vollständiges UAT, Performance, Training, Launch-Runbook) weiterhin zu planen |

**Realistische Einordnung (aktualisiert):** Der aktuelle Stand ist ein funktionsfähiges, mit deterministischen Seed-Daten lauffähiges Implementierungsfundament, nicht nur für Phase 1–9, sondern der Sache nach für **alle 15 Phasen**, wenn auch mit unterschiedlicher Verdrahtungstiefe. Der nächste sinnvolle Entwicklungsschwerpunkt ist nicht "Phase 10 von Null beginnen", sondern **die bereits gebauten Backend-Bausteine der Phasen 10–14 mit ihren bereits gebauten Dashboard-Seiten zu verbinden** (Kapitel 10.1), das ist messbar weniger Aufwand als Neuentwicklung und liefert den größten Sprung zwischen Demo-Eindruck und tatsächlicher Funktionstiefe.

---

## Quellenverzeichnis

Für die vollständige Marktanalyse-Quellenliste (48 Einträge, Kapitel 2–5) siehe `Anforderungsdokument-1Cati.md`, Abschnitt „Quellenverzeichnis", unverändert gültig, hier nicht wiederholt.

### Neue Quellen dieser Version, interne Code- und Dokumentbelege

Alle Aussagen in Kapitel 7, 8, 9 und 10 dieser Version basieren auf direkter Prüfung des tatsächlichen Repository-Zustands zum 07.07.2026 (Branch `waleri-dev`), namentlich:

- Alle 14 Supabase-Migrationsdateien: `supabase/migrations/00000000000000_initial_schema.sql` bis `00000000000013_profile_company_context.sql`
- Alle `apps/web/app/api/site-management/*`- und `apps/web/app/api/ai/*`-Routen (25 Dateien)
- Alle 13 Dashboard-Unterseiten (`apps/web/app/[locale]/dashboard/*`) sowie deren zentrale Datenquelle `apps/web/lib/site-management-data.ts` und `apps/web/lib/site-management-repository.ts`
- `apps/web/lib/rbac.ts`, `apps/web/lib/auth.ts`, `apps/web/proxy.ts`, `apps/web/lib/role-scoped-views.ts`, `apps/web/lib/action-catalog.ts`
- `apps/web/app/[locale]/new-level-premium/*`, `apps/web/lib/new-level-premium-data.ts`, `apps/web/lib/identity-verification.ts`
- `apps/web/e2e/**/*.spec.ts` (20 Spec-Dateien) als Funktionsnachweis
- Original-Kundendokument: `docs/requirements/CRM Kundenanforderungen Premium de-DE.docx`
- Vorversion: `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati.md` (v1, 04.07.2026)
- Benutzerhandbuch: `docs/user-handbook/1Cati-Benutzerhandbuch.docx` (Stand 01.07.2026)

### Interne Referenzdokumente (unverändert gegenüber v1)

- `docs/PROJECT-HANDBOOK.md`, `docs/requirements/option-3-ai-site-crm/{BRD,PRD,TRD}.md`
- `docs/requirements/option-3-ai-site-crm/{Security-Compliance-Plan,Data-Migration-Plan,QA-UAT-Launch-Plan}.md`
- `docs/requirements/option-3-ai-site-crm/{Third-Party-Integration-And-Vendor-Plan,Source-Register}.md`
- `docs/offers/{new-level-premium-landing-page-offer,kbs-identity-legal-brief,ki-premium-layer-offer}.md`
- `CLAUDE.md`, `AGENTS.md`
