# Window 2 – Engagement, Kommunikation, Reporting und CRM

> Stand: 14. Juli 2026  
> Vertraulichkeit: STRICTLY CONFIDENTIAL  
> Owner: Window 2

## Ergebnis und belastbare Readiness-Aussage

Die vier Window-2-Slices sind im Quellstand als persistente Supabase-Vertikalschnitte vorhanden. Sie verwenden keine lokalen Demo-Datensätze als Portal-Wahrheit. Der Quellstand ist dennoch **nicht als produktiv fertig** zu bewerten: Die Migrationen 28–31 wurden in diesem Lauf nicht gegen eine echte Supabase-Instanz ausgerollt. Damit fehlen weiterhin der verlangte Nachweis für Persistenz nach Reload, authentifizierte Cross-Role-/RLS-Ablehnung und echte Parallelitätsprüfungen.

Die drei Manager-Katalog-Blocker haben folgenden binären Stand:

| Use Case | Quellstand-Gate | Laufzeit-Gate |
|---|---|---|
| **UC16 Reports** | **PASS:** `/api/site-management/reports`, Download-Route, DB-Repository, reale Reports-Seite und Migration 30 sind vorhanden. Kein `site-management-data`-/`local-demo-contract`-Pfad speist die Seite. | **OFFEN:** Migration 30, Reload, RLS und konkurrierende Generierung müssen mit realer Auth/DB geprüft werden. Lokale Access-Profile zeigen ehrlich `NO DEMO DATA` und dürfen keine dauerhafte Generierung behaupten. |
| **UC23 Communications** | **PASS:** Seite, API und Repository enthalten weder `site-management-data` noch `local-demo-contract`. Portal-Nachrichten, Threads, Receipts und Outbox liegen in Migration 29. | **OFFEN:** Reale Portal-Persistenz/RLS muss nach Deployment nachgewiesen werden. E-Mail, SMS, WhatsApp und Push bleiben bewusst provider-disconnected. |
| **UC24 Buyer Pipeline** | **PASS:** DB-gestützte `/api/site-management/buyer-pipeline`, Pipeline-Seite, Repository und Migration 31 sind vorhanden; keine Demo-Repository-Abhängigkeit. | **OFFEN:** Migration 31, Reload, Rollenmatrix und echte Concurrent-CAS-/Duplicate-Tests müssen gegen Supabase laufen. Twenty CRM bleibt disconnected; die lokale DB ist autoritativ. |

## Implementierter Umfang und Dateien

### A. Öffentliche QR-Meldung / UC10

- `supabase/migrations/00000000000028_public_qr_reporting.sql`
- `apps/web/lib/public-report.ts`
- `apps/web/lib/public-report-copy.ts`
- `apps/web/lib/public-report-repository.ts`
- `apps/web/app/api/site-management/public-report/route.ts`
- `apps/web/app/[locale]/report/[qrToken]/page.tsx`
- `apps/web/app/[locale]/report/track/page.tsx`
- `apps/web/app/[locale]/dashboard/public-reports/page.tsx`
- `apps/web/app/[locale]/new-level-premium/report-poster/page.tsx`
- `apps/web/components/public-report-form.tsx`
- `apps/web/components/public-report-tracker.tsx`
- `apps/web/components/public-report-review-panel.tsx`
- `apps/web/e2e/api/public-report-functional.spec.ts`
- `apps/web/e2e/public/public-report-functional.spec.ts`
- `apps/web/e2e/operations/public-report-triage-functional.spec.ts`

### B. Kommunikationszentrum / UC23

- `supabase/migrations/00000000000029_portal_communications.sql`
- `apps/web/lib/communications-copy.ts`
- `apps/web/lib/communications-repository.ts`
- `apps/web/app/api/site-management/communications/route.ts`
- `apps/web/app/[locale]/dashboard/communications/page.tsx`
- `apps/web/components/communications/communications-center.tsx`
- `apps/web/e2e/api/communications-functional.spec.ts`
- `apps/web/e2e/operations/communications-functional.spec.ts`

### C. Berichte / UC16

- `supabase/migrations/00000000000030_report_artifacts.sql`
- `apps/web/lib/reporting-copy.ts`
- `apps/web/lib/reporting-repository.ts`
- `apps/web/app/api/site-management/reports/route.ts`
- `apps/web/app/api/site-management/reports/[artifactId]/download/route.ts`
- `apps/web/app/[locale]/dashboard/reports/page.tsx`
- `apps/web/components/reports/reporting-workspace.tsx`
- `apps/web/e2e/api/reporting-artifacts-functional.spec.ts`
- `apps/web/e2e/operations/reporting-functional.spec.ts`

### D. Käuferpipeline / UC24

- `supabase/migrations/00000000000031_buyer_pipeline.sql`
- `apps/web/lib/buyer-pipeline-copy.ts`
- `apps/web/lib/buyer-pipeline-repository.ts`
- `apps/web/app/api/site-management/buyer-pipeline/route.ts`
- `apps/web/app/[locale]/dashboard/leads/page.tsx`
- `apps/web/components/buyer-pipeline/buyer-pipeline-workspace.tsx`
- `apps/web/e2e/api/buyer-pipeline-functional.spec.ts`
- `apps/web/e2e/operations/buyer-pipeline-functional.spec.ts`

Es wurden keine Migrationen 20–27 oder 32+, keine gemeinsamen Message-JSON-Dateien und keine Window-1-/Window-3-Implementierungen für diesen Scope geändert. Im gemeinsamen Worktree vorhandene Änderungen außerhalb der obigen Liste gehören nicht zu diesem Handoff.

## Verträge und Zustandsmaschinen

### Öffentliche QR-Meldung

`QR-Platzierung (create/rotate/revoke) → anonyme Meldung → submitted → under_review → awaiting_information | rejected | converted`

- Physische Platzierungen sind site-/zone-gebunden, undurchsichtig und widerrufbar. Es gibt keinen angenommenen Default-Seed.
- Die öffentliche Quittung trennt öffentliche Referenz und privaten Tracking-Token; gespeichert wird nur der Token-Digest. Die anonyme Browser-Mutation endet an der 16-KiB-streambegrenzten Next-API; der zugrunde liegende Submit-RPC ist ausschließlich für `service_role` ausführbar, damit direkte Anon-RPC-Aufrufer Abuse-, Duplicate- und Consent-Digests nicht selbst wählen können.
- Ein versionierter TR/EN/DE/RU-KVKK-Text wird mit Locale und Digest gespeichert. Kontakt ist optional; Identitäts-, Pass- oder biometrische Daten sind ausgeschlossen.
- IP- und User-Agent-Telemetrie werden getrennt gehasht. Feste Advisory-Lock-Reihenfolge schützt Rate-/Duplicate-Prüfung gegen parallele Umgehung.
- Notfallformulierung und Negation werden deterministisch behandelt. Der Nutzer erhält bei Bedarf eine 112-CTA; die Meldung darf nie selbst anrufen, disponieren, Zutritt ändern oder finanzielle Haftung erzeugen.
- Nur menschliche Manager-Triage darf über den bestehenden Ticket-Command genau einmal konvertieren.
- Ein service-role-only Retention-Command anonymisiert fällige Direktdaten und widerruft die Tracking-Autorität. Es wird ausdrücklich kein Cron/Scheduler aktiviert.

### Kommunikationszentrum

`draft → scheduled | queued → portal_delivered | provider_acknowledged → read`, mit `failed`, `retry_wait`, `dead_letter` und `cancelled` in Delivery/Outbox.

- Threads, Teilnehmer, Nachrichten, Portal-Receipts, Anhänge, Templates, Audiences, Consents, Suppressions, Deliveries, Outbox und Provider-Receipts sind normalisiert und RLS-geschützt.
- Effektive Teilnehmer einschließlich Actor/Assignee werden gegen aktuelle Firma, Site-Zuweisung oder Owner-/Tenant-Beziehung validiert.
- Staff liest ausschließlich operative Threads, denen das Profil als `assigned_profile_id` zugeordnet ist, und benötigt zusätzlich aktive Teilnahme sowie eine aktuell gültige Site-Zuweisung.
- Broadcast-Mitglieder werden vor Persistenz einzeln gegen Company/Site/Unit, Beziehung, Consent und Suppression geprüft.
- Worker-Abschluss erfordert Worker-ID plus opaken Claim-Token innerhalb der Lease. Stale Leases propagieren Retry-/Dead-Letter-Status zu Delivery und Message.
- Provider-Event-ID-Replays sind payload- und delivery-gebunden. Provider-Key, Provider-Message-ID und Acknowledgement-Zeit sind nach Bestätigung unveränderlich.
- Externe Channels werden niemals als gesendet/bestätigt angezeigt, bevor ein Provider-Receipt mit Message-ID gespeichert ist.
- Dokumentanhänge transportieren nur IDs und verwenden die bestehende autorisierte private Dokumentgrenze.

### Reports

`queued → generating → ready | failed`; Kommentar: `pending_human_review → approved | rejected`.

- Serverseitige CSVs entstehen aus Finance-, Unit-, Ticket- oder Compliance-Quellen in einem durch Tabellenlocks stabilisierten DB-Snapshot.
- Artifact-Metadaten und Payload sind unveränderlich: Scope/Filter, Generatorversion, Timestamp, Row Count, Byte Count, SHA-256, Quellen, Metriken und Limitierungen.
- CSV-Zellen werden gegen Spreadsheet-Formeln geschützt; Download prüft SHA-256 und Byte-Länge erneut.
- Der interne DB-Pfad ist auf 50.000 Zeilen begrenzt; größere Exporte/Object Storage bleiben provider-ready.
- Commentary ist deterministisch aus expliziten Metriken geerdet und benötigt menschliche CAS-Prüfung. Replays werden erneut gegen aktuellen Artifact-/Request-Scope autorisiert.
- Request-Bodies werden beim Streamen bei 32 KiB abgebrochen; Source-Joins binden Company und Site explizit.
- Inkonsistente Finance-/Ticket-/Compliance-Referenzen auf eine Unit außerhalb derselben Company/Site werden vor der Request-Erzeugung fail-closed als HTTP 409 `REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT` abgelehnt; hierfür entsteht bewusst kein Artifact und kein History-Eintrag.

### Käuferpipeline

`new → contacted → qualified → viewing → offer → reservation → due_diligence → won | lost`; `won` und `lost` sind final.

- Prospect, Interessen, Stage-History, Consent-History, Notes, Conversion-Links und ein gemeinsames action-bound Command-Ledger sind persistent.
- CAS-Versionierung schützt Transition, Note, Update und Conversion. Ein Idempotency-Key kann pro Actor nicht zwischen Command-Typen wiederverwendet werden.
- E-Mail und Telefon erhalten getrennte, stabil sortierte Advisory Locks und getrennte aktive Unique-Indizes; ein Match auf unterschiedliche Prospects wird abgelehnt.
- Consent erlaubt nur `pending → granted → withdrawn` mit zulässigen No-op-Schritten. Grant-Evidence bleibt nach Withdrawal unverändert erhalten; History ist append-only.
- Conversion verlinkt genau einmal auf einen bereits existierenden Registration-/Reservation-Datensatz und erzeugt keine Schattenkopie.
- Das Workspace lädt ausschließlich company-/site-gescopte Unit-Optionen ohne sensible Zusatzfelder. Create unterstützt eine Primary Unit; Edit unterstützt bis zu 20 persistierte Unit-Interessen.
- GET gibt zur Consent-Evidence nur `consentEvidenceRecorded` und Version, niemals den Digest, zurück. Bei `granted → granted` und Withdrawal bleibt die serverseitige Evidence ohne erneute Eingabe erhalten; nur `pending → granted` verlangt Version plus Digest.

## Security-/RLS-Nachweis im Quellstand

- Alle **Portal**-Mutationen prüfen reale Auth; kontrollierte lokale Access-Profile liefern dafür eine ehrliche `REAL_AUTH_REQUIRED`-/Unavailable-Antwort. Die öffentliche QR-Submission ist absichtlich account-free, aber an einen opaken Placement-Token, Origin-/Body-/Abuse-Prüfungen und den serverseitigen service-role-only RPC gebunden.
- RLS-Policies und Security-Definer-Commands prüfen Company plus Site/Unit/Relationship; sensible Tabellen erlauben Clients keine Direktmutation.
- Replay-Pfade laden den aktuellen Datensatz erneut und prüfen den aktuellen Scope, bevor ein historisches Ergebnis zurückgegeben wird.
- Die drei authentifizierten APIs verwenden `private, no-store`; die öffentliche QR-API verwendet `no-store` plus `no-referrer`. Mutationen prüfen Origin, streambegrenzte Body-Größe, Typen, UUIDs, Idempotency und CAS, soweit anwendbar.
- Append-only Trigger schützen Workflow-, Consent-, Review-, Provider- und Audit-Evidence.
- Service-Worker-Funktionen für Retention, Outbox und Provider-Receipts sind auf `service_role` beschränkt.

Dieser Abschnitt ist ein **Quellcode-/Vertragsnachweis**, kein Ersatz für einen ausgeführten RLS-Test mit echten Benutzer-Sessions.

## Interne Funktion vs. externe Provider-Abhängigkeit

| Slice | Intern persistierbar nach Migration | Bewusst extern/disconnected |
|---|---|---|
| QR Intake | Platzierung, Submission, Tracking, Manager-Triage, Ticket-Link, Retention-Command | Retention-Scheduler; keine automatische Dispatch-/Call-/Access-/Payment-Aktion |
| Communications | Portal-Threads, Portal-Nachrichten, Read-State, Audit und Outbox | E-Mail, SMS, WhatsApp, Push Provider/Keys/Webhooks |
| Reports | DB-CSV, Metadaten, Checksum, History, Download, grounded Commentary | Object Storage und Bulk-Export-Provider |
| Buyer Pipeline | Lokale Supabase-Pipeline ist autoritativ | Twenty CRM Sync/Adapter |

## Fokus-QA und Ergebnis

Der lokale Playwright-Harness leert die Supabase-Umgebungsvariablen absichtlich. Deshalb prüfen Browser-Mocks Interaktion, Layout und API-Verträge, während lokale Access-Profile beweisen, dass ohne reale DB keine erfundene Persistenz erscheint. Sie beweisen **nicht** Reload-Persistenz oder RLS in Supabase.

Ausgeführte fokussierte Command-Sets, auf die sich die Ergebnisse beziehen:

```powershell
# UC16 – vor dem letzten 23514-Guard erfolgreich
pnpm --filter cati-web exec eslint "app/[locale]/dashboard/reports/page.tsx" "app/api/site-management/reports/route.ts" "app/api/site-management/reports/[artifactId]/download/route.ts" "components/reports/reporting-workspace.tsx" "lib/reporting-copy.ts" "lib/reporting-repository.ts" "e2e/api/reporting-artifacts-functional.spec.ts" "e2e/operations/reporting-functional.spec.ts"

# UC23 – finaler API-Stand und Operations-UI
pnpm exec eslint e2e/api/communications-functional.spec.ts app/api/site-management/communications/route.ts lib/communications-repository.ts
pnpm exec playwright test e2e/api/communications-functional.spec.ts --project=chromium
pnpm exec playwright test e2e/operations/communications-functional.spec.ts --project=chromium

# UC24 – vor dem letzten Interest-/Consent-Follow-up erfolgreich
pnpm --filter cati-web typecheck
pnpm --filter cati-web exec playwright test e2e/api/buyer-pipeline-functional.spec.ts --project=chromium
pnpm --filter cati-web exec playwright test e2e/operations/buyer-pipeline-functional.spec.ts --project=chromium
```

Nach Wiederherstellung des Runners sind mindestens diese finalen Gates zu wiederholen:

```powershell
pnpm --filter cati-web typecheck
pnpm --filter cati-web build
pnpm --filter cati-web exec eslint "app/[locale]/report" "app/[locale]/dashboard/public-reports" "app/[locale]/dashboard/communications/page.tsx" "app/[locale]/dashboard/reports/page.tsx" "app/[locale]/dashboard/leads/page.tsx" "app/api/site-management/public-report" "app/api/site-management/communications" "app/api/site-management/reports" "app/api/site-management/buyer-pipeline" "components/public-report-form.tsx" "components/public-report-tracker.tsx" "components/public-report-review-panel.tsx" "components/communications" "components/reports" "components/buyer-pipeline" "lib/public-report.ts" "lib/public-report-copy.ts" "lib/public-report-repository.ts" "lib/communications-copy.ts" "lib/communications-repository.ts" "lib/reporting-copy.ts" "lib/reporting-repository.ts" "lib/buyer-pipeline-copy.ts" "lib/buyer-pipeline-repository.ts" "e2e/api/public-report-functional.spec.ts" "e2e/public/public-report-functional.spec.ts" "e2e/operations/public-report-triage-functional.spec.ts" "e2e/api/communications-functional.spec.ts" "e2e/operations/communications-functional.spec.ts" "e2e/api/reporting-artifacts-functional.spec.ts" "e2e/operations/reporting-functional.spec.ts" "e2e/api/buyer-pipeline-functional.spec.ts" "e2e/operations/buyer-pipeline-functional.spec.ts"
pnpm --filter cati-web exec playwright test e2e/api/public-report-functional.spec.ts e2e/public/public-report-functional.spec.ts e2e/operations/public-report-triage-functional.spec.ts e2e/api/communications-functional.spec.ts e2e/operations/communications-functional.spec.ts e2e/api/reporting-artifacts-functional.spec.ts e2e/operations/reporting-functional.spec.ts e2e/api/buyer-pipeline-functional.spec.ts e2e/operations/buyer-pipeline-functional.spec.ts --project=chromium
```

| Gate | Ergebnis am 14.07.2026 |
|---|---|
| Exakte Präsenz- und Forbidden-Dependency-Gates für UC16/UC23/UC24 | PASS |
| UC10: focused ESLint, Typecheck, Diff-/Privilege-/Reader-Checks | PASS nach service-role-/Streaming-Härtung |
| UC10 Chromium Playwright | 20/21 PASS; einziger Fehler war ein anschließend test-only korrigierter mehrdeutiger Locator. Kein Re-Run nach Korrektur wegen gemeinsamem Server-/Runner-Freeze. |
| UC16: focused ESLint + Typecheck | PASS vor dem letzten 23514-Integrity-Guard; der notwendige Post-Guard-Re-Run startete wegen Approval-Usage-Limit und anschließendem Exec-Helper-Setupfehler nicht. |
| UC16 Chromium Playwright | Im finalen Quellstand NICHT AUSGEFÜHRT. |
| UC23 API Chromium Playwright | PASS, 18/18 nach Staff-Scope-Härtung. |
| UC23 Operations Chromium Playwright | PASS, 5/5 vor der reinen SQL-/Static-Staff-Nachhärtung; UI-Produktcode blieb dabei unverändert. |
| UC24 API/UI Chromium Playwright | Vor dem letzten Interest-/Consent-Follow-up PASS (API 3/3, UI 6/6). Der Post-Follow-up-Re-Run startete wegen des Exec-Helper-/Usage-Limits nicht; diese Zahlen sind daher kein Nachweis des finalen Diffs. |
| Finaler gesamter Typecheck / Build | NICHT AUSGEFÜHRT nach den letzten UC16-/UC24-Patches; der Runner scheiterte vor Command-Start am Usage-Limit beziehungsweise Setup-Refresh. Frühere vollständige Typechecks waren PASS. |
| Window-2 Playwright, Mobile Chrome | Als eigenes Projekt im finalen Stand NICHT AUSGEFÜHRT; einzelne Chromium-Specs enthalten explizite 390×844-/Vier-Locale-Prüfungen. |
| Reale Migration 28–31 + Reload/RLS/Concurrency | NICHT AUSGEFÜHRT – Release-Blocker für „complete“ |

## Abdeckung des Manager-Katalogs mit 24 Use Cases

| UC | Window-2-Abdeckung | Präzise Aussage |
|---|---|---|
| UC01 Rollenbasierter Zugriff | Unterstützend | Die vier Slices erzwingen Server-Auth/RLS. Login und globale Rollen-Navigation gehören nicht zu Window 2. |
| **UC02 769-Unit-Live-Matrix** | **Nur unterstützend** | `unit_inventory` kann reale Unit-Zeilen exportieren. Die Live-Matrix und der Nachweis exakt 769 aktueller Einheiten wurden nicht geändert und sind durch Window 2 **nicht behoben**. |
| UC03 Realtime Dashboard | Unterstützend | QR-, Communications- und Buyer-Views besitzen Realtime-Invalidierung plus Polling-Recovery; das zentrale Dashboard wurde nicht geändert. |
| UC04 Compliance Cockpit | Unterstützend | Compliance ist eine echte Report-Quelle; das Cockpit selbst bleibt Window 1. |
| UC05 Finanztransparenz | Unterstützend | Finance-CSV und finance-scoped Kommunikation sind vorhanden; Payment-/Owner-Finance-UI wurde nicht geändert. |
| UC06 Service Ticket E2E | Unterstützend | Menschliche QR-Konvertierung nutzt genau einmal den bestehenden Ticket-Command; Ticket-Lifecycle bleibt außerhalb dieses Scopes. |
| UC07 Notfallerkennung | Unterstützend | Öffentliche QR-Meldung besitzt deterministische Safety-/Negation-Prüfung und eine nutzerinitiierte 112-CTA. |
| **UC08 Öffentliche Registrierung + KVKK** | **Nur unterstützend** | QR-Intake speichert versionierte KVKK-Evidence; Buyer kann auf bestehende Registration verlinken. Die öffentliche Registrierung wurde nicht geändert und ist durch Window 2 **nicht behoben**. |
| UC09 Trainingsvideos | Keine | Nicht im Window-2-Scope. |
| **UC10 Vor-Ort-QR-Meldung** | **Direkt** | Voller Window-2-Slice. Die nackte URL `/tr/new-level-premium/report-poster` zeigt ehrlich Setup/Platzierungsauswahl; eine exakte Poster-URL entsteht erst aus einem real provisionierten Site-/Zone-Token. Keine erfundene globale QR-ID. |
| UC11 Öffentliche KI | Keine | Nicht im Window-2-Scope. |
| UC12 Interne KI | Unterstützend | Report-Kommentar ist ausschließlich metrikbasiert, zeigt Quellen/Limits und verlangt Human Review; der interne AI-Assistant wurde nicht geändert. |
| UC13 Mitarbeitende/Rollen | Keine | Keine globale Staff-/Role-Verwaltung in Window 2. |
| UC14 Mehrsprachigkeit | Unterstützend | Feature-lokale Copy für TR/EN/DE/RU in allen vier Slices. |
| UC15 Sichere Dokumente | Unterstützend | Communications akzeptiert nur Dokument-IDs über die bestehende autorisierte File Boundary; Dokumentverwaltung selbst bleibt außerhalb. |
| **UC16 Reports** | **Direkt** | Persistente Report-Requests/Artifacts, CSV, Checksum, History, Download und Human-Review-Commentary. Runtime-Nachweis bleibt offen. |
| UC17 Ehrliche Integrationen | Unterstützend | Externe Channels, Storage/Bulk und Twenty werden sichtbar als provider-ready/disconnected bezeichnet. |
| UC18 Booking/Move-in/out | Unterstützend | Buyer verlinkt auf eine bestehende Reservation; Kalender und Handover wurden nicht geändert. |
| UC19 Manuelle Zahlung | Unterstützend | Finance-Report ist read-only; Payment Posting wurde nicht geändert. |
| UC20 Service-Nachweis | Keine | Nicht im Window-2-Scope. |
| UC21 Registrierungsaktivierung | Unterstützend | Buyer kann auf eine bestehende Registration verlinken; Aktivierungsworkflow bleibt Window 1. |
| UC22 Owner-Unit-Zuordnung | Unterstützend | Communications-RLS prüft aktuelle Owner-/Tenant-Beziehungen; Zuordnungs-UI/-Command wurde nicht geändert. |
| **UC23 Communications Center** | **Direkt** | Persistent Portal + Outbox + Consent/Suppression + Provider-Truth. Externe Anbieter bleiben disconnected; Runtime-Nachweis bleibt offen. |
| **UC24 Buyer Pipeline** | **Direkt** | Persistente lokale Pipeline mit CAS, History, Consent, Dedupe und link-only Conversion. Twenty bleibt disconnected; Runtime-Nachweis bleibt offen. |

Direkt abgedeckt sind damit **UC10, UC16, UC23 und UC24**. Alle anderen Einträge oben sind ausdrücklich nur unterstützend oder nicht betroffen; insbesondere werden UC02 und UC08 nicht als durch Window 2 behoben ausgegeben.

## Offene Integrations- und Release-Schritte für Window 1 / Betrieb

1. Migrationen 28–31 in einer kontrollierten Supabase-Umgebung ausrollen und für Admin, Manager, Accountant, Staff, Owner, Tenant und anonymen Nutzer echte Allow/Deny-Sessions ausführen.
2. Pro Slice Reload-Persistenz, Realtime plus Polling-Fallback und konkurrierende Idempotency/CAS-Szenarien mit zwei Sessions testen.
3. `PUBLIC_REPORT_SECURITY_SECRET` mit mindestens 32 zufälligen Bytes sowie den server-only `SUPABASE_SERVICE_ROLE_KEY` setzen; reale Sites/Zonen durch Manager provisionieren und erst dann Poster drucken.
4. Einen kontrollierten Retention-Scheduler nur nach Retention-/Operations-Freigabe an den service-role-only Command anbinden.
5. Externe Communications-Provider erst nach Verträgen, Keys, Consent-Mapping, Webhook-Signaturprüfung und Retry-/Dead-Letter-Runbook aktivieren.
6. Object Storage/Bulk Export und Twenty CRM erst nach Provider-Freigabe aktivieren. Bis dahin bleiben interne DB-Artefakte beziehungsweise die lokale Buyer-Pipeline autoritativ.
7. Falls gewünscht, die neue Manager-Seite `/[locale]/dashboard/public-reports` in der gemeinsamen Navigation verlinken; Window 2 hat Navigation/RBAC nicht eigenmächtig erweitert.

## Explizites Demo-Verdikt

- **Interner Portalpfad:** production-shaped und DB-backed im Quellstand; keine Seed-/Local-Demo-Wahrheit. Ohne reale Auth/DB absichtlich unavailable.
- **Externe Zustellung/Provider:** nicht verbunden und nicht als live/sent/synced bezeichnet.
- **Abnahme:** Source-ready für Integration und Live-DB-QA, aber nach der ursprünglichen Definition noch **nicht feature-complete**. Zusätzlich zu Reload-/Cross-Role-/Concurrency-Belegen müssen die nach den letzten UC16-/UC24-Patches ausgefallenen Lint-/Typecheck-/Browser-/Build-Gates nachgeholt werden.

## Abschlussaktualisierung: Tiefen-QA und Demo-Readiness

Diese Aktualisierung ersetzt die älteren, oben protokollierten Runner-Platzhalter. Der Window-2-Quellstand ist nach den folgenden Nacharbeiten eingefroren:

- UC10: Die einmalig ausgegebene Referenz und der private Tracking-Token werden direkt in einen eingebetteten Status-Check übernommen. Der Nutzer muss beide Werte nicht mehr kopieren; Token und Referenz bleiben aus URL, `localStorage` und `sessionStorage` heraus. `PUBLIC_REPORT_SECURITY_SECRET` ist nun in `apps/web/.env.example` als unabhängiges server-only Secret dokumentiert.
- UC23: Ein leerer echter Workspace ist kein Dead End mehr. Admin, Manager und Accountant können einen Portal-Thread nur mit mindestens einem serverseitig zulässigen Empfänger anlegen. Der Kandidaten-RPC ist Company-/Site-/Unit-/Relationship-gescopet, Manager bleiben auf zugewiesene Sites beschränkt, Accountant kann keine Staff-Kandidaten enumerieren, Owner/Tenant bleiben view/reply-only, und caller-only Threads werden in UI, API und SQL abgelehnt. Mark-read behandelt Non-2xx nicht mehr als lokalen Erfolg.
- UC24: Unit-Interest-Drafttypen und Consent-Edit wurden bereinigt. Duplicate-Matches behaupten nicht mehr, ein neuer Käufer sei angelegt worden; die UI zeigt stattdessen eine wahrheitsgemäße Existing-Match-Meldung.

### Finale technische Gates

| Gate | Finales Ergebnis |
|---|---|
| `pnpm --filter cati-web typecheck` | **PASS** |
| `pnpm --filter cati-web build` | **PASS**; Next.js 16 Production Build inklusive aller UC10/16/23/24 Pages und APIs |
| Fokussiertes ESLint über alle Window-2 Pages, APIs, Repositories, Komponenten und Specs | **PASS** |
| Vollständiges App-ESLint | **FAIL außerhalb Window 2**: ein `react-hooks/set-state-in-effect`-Fehler in `components/offline-sync/offline-experience.tsx`; zusätzlich vier Warnungen in Dashboard/Recording-Code |
| Finale neun Window-2-Specs, Chromium + Pixel 5 | Initial **132/134 PASS**; die zwei identischen Fehler waren ein test-only Regex-False-Positive, das TypeScripts optionales Property-Zeichen `?` als URL-Query interpretierte. Nach Eingrenzung auf echte Navigation-/Storage-Sinks lief die betroffene Spec **12/12 PASS**. Damit sind alle **134 Szenarien grün**. |
| UC23 separat | Chromium API+UI **26/26 PASS**; Mobile Operations **7/7 PASS**; Forbidden-Dependency-Gate ohne Treffer |
| UC24 nach Duplicate-/Interest-Fix | Chromium + Mobile **18/18 PASS** |
| Sechs lokale Rollenprofile | Chromium **25/25 PASS**; Pixel 5 **25/25 PASS** |

Zwei gemeinsame Navigationstests bleiben als Testkatalog-Probleme bekannt: `Ileti` matcht das korrekte türkische `İletişim` nicht, und `Offline|Sync|Queue|Senkron` matcht `Çevrimdışı/eşitle` nicht. Die Seiten renderten korrekt. Ebenso erwartet das Legacy-`language.spec.ts` noch `Customer & Owner CRM`, während die kanonische Überschrift `Buyer pipeline` lautet. Diese shared Tests wurden von Window 2 nicht eigenmächtig geändert.

Ein unabhängiger UC23-Reviewer konnte seine Dateileser wegen `helper_unknown_error: setup refresh had errors` nicht starten. Diese Prüfung ist daher **tool-blocked/inconclusive** und wird nicht als unabhängiger Security-Pass ausgegeben. Die finalen UC23-Guards sind jedoch im oben genannten Root-Typecheck, Build, ESLint und Desktop-/Mobile-Matrixlauf enthalten.

### Rollen- und Business-Sicht

- Admin und Manager: UC10-Triage, UC16, UC23 und UC24 gemäß Site-/Company-Scope.
- Accountant: Finance-Reports und Finance-Kommunikation; keine Staff-Kandidaten im neuen Compose-Verzeichnis.
- Staff: nur zugewiesene operative UC23-Threads.
- Owner/Tenant: ausschließlich relationship-gescopte UC23 View/Reply-Flows; keine globale Compose- oder Reporting-/Buyer-Berechtigung.
- Anonymous: nur UC10 über einen real provisionierten, opaken QR-Placement-Token.

Die lokale Access-Profile-Demo prüft Navigation, UI, Rollenfilter und ehrliche Unavailable-States. Sie kann UC16/23/24 absichtlich **nicht** als persistiert vorspielen, weil das lokale Profil Zero-UUID und keinen realen Company-/Site-Scope besitzt.

### Aktuelles Demo-Go/No-Go

**No-Go für einen unrestricted Kunden-/Produktionsdemo-Termin.** Gründe:

1. Auf der aktuell deployten Vercel-Version sind Remote-QA-Profile gegen live Supabase aktiviert. Es wurden nur Status-/Count-Metadaten bestätigt, keine Datensätze oder PII gelesen. Window 1 besitzt die fail-closed Remediation; Window 2 hat weder Auth-/Proxy-Dateien noch Deployment/Environment verändert. Nach Redeploy müssen `/api/access-profile`, anonyme Dashboard-Zugriffe und anonyme Site-Management-APIs erneut geprüft werden.
2. Das Deployment ist gegenüber diesem Quellstand veraltet: UC16-/UC24-APIs und die UC10-Managerseite fehlen dort, und UC23 liefert noch `local-demo-contract`. Dieser Produktionsstand erfüllt die binären Window-2-Claims nicht.
3. Reale Migration 28–31, Persistenz nach Reload, Cross-Role-/Cross-Site-RLS, zweite Session sowie parallele CAS-/Idempotency-Fälle sind noch nicht ausgeführt.
4. Ein isolierter lokaler DB-Test ist derzeit nicht sicher startbar: Supabase CLI/psql fehlen, Docker Engine antwortet nicht, und das Repository ist mit einem realen Supabase-Projekt verlinkt. Die vorhandenen `--linked`-Scripts dürfen für QA nicht verwendet werden. Erforderlich ist ein unlinked Temp-Projekt mit Migrationen 00–31 und synthetischen Multi-Role-Fixtures.
5. `/dashboard/public-reports` ist vorhanden, aber nicht in der gemeinsamen Navigation verlinkt. Diese Shared-Navigation liegt außerhalb Window-2-Ownership.

Weitere P1-Business-Friktion für die nächste Iteration: Buyer-Handoff verlangt noch eine rohe Registration-/Reservation-UUID; ein erstmaliger KVKK-Grant verlangt eine freigegebene Consent-Version plus Digest; Reports benötigen fachlich bestätigte Türkei-Tagesgrenzen; Public Triage kann Kategorie/Alter/Locale/Ticket-History deutlicher zeigen; Buyer-Workspace- und Communications-History-Limits müssen in der UI transparent gemacht werden.

Externe E-Mail/SMS/WhatsApp/Push-Provider, Twenty Sync, Bulk-Object-Storage, automatische Emergency-/Access-/Payment-Aktionen und ein Retention-Scheduler bleiben bewusst disconnected. Diese Provider-Grenzen verhindern die interne Portal-Persistenz nach Migration nicht, dürfen aber nicht als live zugestellt oder synchronisiert bezeichnet werden.
