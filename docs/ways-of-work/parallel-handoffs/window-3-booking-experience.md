# Window 3 – Booking, Resident Journey, Offline und Experience

Stand: 14. Juli 2026  
Owner: Window 3  
Status: Implementierung und lokale fokussierte QA abgeschlossen; Produktionsfreigabe bleibt an Clean-DB-/RLS- und echte Persistenznachweise gebunden.

## Kanonische Use-Case-Zuordnung

Window 3 ist direkter Owner von **UC18 – Buchung, Einzug und Auszug**. Dazu gehören der Buchungslebenszyklus, Ressourcenverfügbarkeit, Move-in/Move-out und Handover sowie die dafür benötigten Kalender-, Offline- und Experience-Flows.

Die folgenden Manager-Artefakte gehören ausdrücklich **nicht** zu dieser Window-3-Zuordnung:

- UC02 – 769-Einheiten-Matrix
- UC03 – Realtime-Dashboard
- UC04 – Käufer-/Zugangs-Compliance
- UC08 – Registrierung/KVKK
- UC10 – öffentlicher QR-Poster-Flow

Querschnittsfunktionen aus Window 3 unterstützen diese Bereiche gegebenenfalls technisch, ändern aber nicht deren Ownership oder QA-Nummer.

## Gelieferter Umfang

### Buchung und Ressourcenlebenszyklus

- Migration 32 führt kanonische Buchungsressourcen, Kapazitätseinheiten, zeitlich begrenzte Holds, Puffer, Blackouts, deterministische Wartelisten, Freigaben, Preis-/Kautionswahrheit, Idempotenz, Versionsprüfung, Audit und Outbox ein.
- Der Browser schreibt nicht direkt in `reservations`. Hold, Commit, Warteliste, Entscheidung und weitere Statusänderungen laufen über explizite `SECURITY DEFINER`-Kommandos.
- Ressourcenberechtigung, erforderliche Einheitenbeziehung und Freigabeanforderung werden in den Kommandos ausgewertet.
- Das Workspace-RPC liefert nur passende Einheiten; die UI übergibt die ausgewählte Einheit beim Hold.
- Die Oberfläche unterstützt Hold → Commit, Warteliste, Freigabe, Statusaktionen, Blackouts und Finanzwahrheit in TR/EN/DE/RU.

### Move-in, Move-out und Handover

- Migration 33 verknüpft Termine mit Buchung und Bewohnerbeziehung und ergänzt Reschedule/Cancel/Transition, Checklisteneinträge, Nachweise, Zählerstände, Zustandsprotokoll, Zugangsvorbereitung, Turnover und Kautionsabwicklung.
- Sämtliche Writes bleiben command-only, mit Versions-, Scope-, Idempotenz- und Audit-Prüfung.
- Die UI zeigt Kandidaten, Terminaktionen, Checklisten, Evidence, Meter, Condition, Access, Turnover und Deposit in einem lokalisierten Resident-Journey-Flow.

### Kalender und ICS

- Migration 34 implementiert widerrufbare, opaque Feed-Tokens, rollenbezogene und datensparsame Feeds, stabile `UID`/`SEQUENCE`, Tombstones und Import-Preview.
- Die UI unterstützt Erstellen, einmalige Secret-Anzeige, Rotation, Widerruf mit Grund und ICS-Importvorschau.
- Der rohe englische Repository-Fallback wird auf der türkischen Kalenderseite nicht angezeigt; Start- und Fehlertexte sind lokalisiert.
- Google-/Outlook-/Cal.com-OAuth ist nicht angeschlossen; geliefert ist standardbasierter ICS-Feed/Import.

### Offline/PWA

- Migration 35 nimmt ausschließlich sichere Offline-Kommandos an: Ticket-Erstellung und interner Ticket-Feldvermerk.
- Browser-Queue: IndexedDB, maximal 50 Kommandos, maximal 72 Stunden Alter, maximal 8 KB Payload, Idempotenz, Sequenz/Fingerprint, Backoff, Cross-Tab-Synchronisation und autoritative Konfliktauflösung.
- Der Service Worker cached nur Offline-Shell und statische Assets, niemals geschützte Navigation oder API-Antworten. Auth-/Rollenwechsel und Logout leeren den Cache.
- Die Lösung bleibt eine mobile Web/PWA; es wurde keine native Store-App gebaut.

### Integrationswahrheit

- Die Settings-/Integration-Ansicht unterscheidet `live`, `degraded`, `provider_ready`, `blocked` und `disabled`.
- Supabase wird aktiv geprüft und nur bei erfolgreichem Probe als live ausgewiesen.
- Nicht konfigurierte Drittanbieter werden nicht als produktiv dargestellt.

## Sicherheitsvertrag

### Reservation-Projektion in Migration 32

- Kein tabellenweites `SELECT` für `authenticated` auf `public.reservations`.
- Explizite, bewohnergeeignete Column-Allowlist: `id`, `company_id`, `site_id`, `unit_id`, `resource_name`, `check_in_at`, `check_out_at`, `status`, `approval_status`, `created_at`, `updated_at`.
- Ausgeschlossen sind insbesondere `request_fingerprint`, `idempotency_key`, `notes`, `created_by` und interne Workflow-/Truth-Metadaten.
- Genau eine authentifizierte Reservations-Policy bleibt bestehen: `SELECT` über `current_user_can_view_reservation(id)`.
- `INSERT`, `UPDATE` und `DELETE` bleiben für Browserrollen entzogen.
- Legacy-Lese- und Schreibpfade im Site-Management verwenden jetzt den rollenprojizierten Booking-Workspace bzw. die Buchungskommandos; es bleibt dort kein direktes `from("reservations")`.

### Legacy-Tabellen in Migration 33

- Auf `turnover_work_items`, `access_handoff_requests` und `deposit_settlements` werden nur `SELECT`-Policies angelegt.
- Die sechs früheren `legacy_insert`-/`legacy_update`-Policies wurden entfernt.
- Migration 33 wiederholt defensiv `REVOKE INSERT, UPDATE, DELETE` für alle drei Tabellen.
- Unterstützte `SECURITY DEFINER`-Kommandos bleiben explizit ausführbar; interne Helper sind für Browserrollen nicht ausführbar.

## Exakte QA-Nachweise

### TypeScript und Lint

- `pnpm typecheck -- --pretty false` im Web-Workspace: **PASS**, Exit 0.
- Fokussiertes ESLint über alle Window-3-Komponenten, Routen, Libraries, Tests und den angepassten Site-Management-Adapter: **PASS**, Exit 0, keine Findings.

### Funktionaler Browservertrag

Datei: `apps/web/e2e/operations/window3-calendar-offline-functional.spec.ts`

- Ergebnis: **6/6 bestanden in 23,0 s** (Chromium, 1 Worker, vorhandener Server auf Port 3117).
- Abgedeckt: stabile ICS-UID/Reihenfolge, Escaping/Folding/Europe-Istanbul, Update/Cancel/Duplicate/Stale/Conflict/Privacy, Offline-Validierung/Receipt/Conflict, IndexedDB-Hard-Reload, Service-Worker-Purge bei Rollenwechsel/Logout, Cross-Tab-Exactly-Once-Replay und autoritative Konfliktauflösung sowie türkische Fail-Closed-Ansichten bei 360 px ohne horizontalen Overflow.

### Statische Migration-Security

Dateien:

- `apps/web/e2e/api/booking-handover-security-functional.spec.ts`
- `apps/web/e2e/api/tenant-access-phase-security-functional.spec.ts`

Ergebnis des abschließenden gemeinsamen Laufs: **10/10 bestanden in 4,2 s** (5/5 Window-3 plus 5/5 bestehender Migration-22-Exploit-Gate, Chromium, 1 Worker, Port 3117). Zusätzlich meldete die unabhängige Koordination nach Stabilisierung denselben Umfang mit **10/10 in 1,7 s**.

Die fünf Window-3-Regressions prüfen:

1. Keine tabellenweite Reservations-SELECT-Freigabe; sensible Spalten fehlen in der Allowlist.
2. Genau eine authentifizierte, reine SELECT-RLS-Policy über `current_user_can_view_reservation`; Reservations-DML bleibt entzogen.
3. Migration 33 erzeugt nur SELECT-Policies auf den drei Legacy-Tabellen.
4. Migration 33 wiederholt DML-REVOKEs und vergibt später kein Browser-DML.
5. Die verkettete Reihenfolge 22 → 32 → 33 → 34 → 35 führt Rechte/Policies nicht wieder ein; öffentliche Commands und private Helper bleiben korrekt getrennt.

### SQL-/pgTAP-Vertrag

Datei: `supabase/tests/booking_handover_security.sql`

- Plan: **66 Assertions**.
- Deckt RLS-Flags, Tabellen-/Spaltenprivilegien, exakte Policies, direkte DML-Fehler `42501`, Command-EXECUTE-Grants, Anon-Denial und Helper-Revoke ab.
- Status: **nicht ausgeführt**, weil in dieser Umgebung weder eine konfigurierte Supabase-Datenbank noch `psql`/Supabase CLI bzw. ein nutzbarer Docker-Daemon verfügbar war. Die Zahl 66 ist daher ein geplanter Contract, kein behaupteter Pass-Count.

## Persistenz nach Reload

- **Lokal bewiesen:** Die Offline-IndexedDB-Queue behält nach echtem Browser-Hard-Reload dieselbe Command-ID und denselben Body; der Playwright-Nachweis ist im 6/6-Lauf enthalten.
- **Im Code umgesetzt, aber nicht produktionsbewiesen:** Booking- und Handover-Mutationen lesen nach dem Command den autoritativen Workspace erneut und zeigen den Verifikationsstatus an.
- **Offener Release-Gate:** Echte Supabase-Persistenz nach Server-/Browser-Reload wurde nicht verifiziert, weil Migrations 32–35 hier nicht gegen eine Clean DB angewendet werden konnten. Dieser Punkt darf bis zum Live-Nachweis nicht als abgeschlossen bezeichnet werden.

## Verbleibende Produktions-Release-Gates

Migrationsreihenfolge auf einer frischen, produktionsnahen Datenbank anwenden: **22 → 32 → 33 → 34 → 35**. Danach den pgTAP-Vertrag und dieselben Assertions erneut nach allen späteren Migrationen ausführen.

Mindestens nachzuweisen:

- `has_table_privilege('authenticated', 'public.reservations', 'SELECT') = false`.
- `has_column_privilege` ist für `request_fingerprint`, `idempotency_key`, `notes`, `created_by` und interne Metadaten false.
- Sichere Allowlist-Spalten sind nur bei wahrer `current_user_can_view_reservation(id)` sichtbar; Cross-Unit-/Cross-Company-Lesen liefert keine Zeilen.
- Accountant kann Bewohner-Reservationen, Notizen und Fingerprints ohne expliziten redaktierten Vertrag nicht lesen.
- Keine INSERT-/UPDATE-/DELETE-Policies und keine Browser-DML-Privilegien auf Turnover/Access/Deposit; direkter DML-Versuch liefert `42501`.
- Autorisierte Commands funktionieren, stale Versionen und Cross-Scope-Akteure werden abgewiesen und jeder akzeptierte Command erzeugt ein Audit-Event.
- Reale Konkurrenztests für letzten Slot, Kapazitätseinheiten, Puffer, Overnight, Blackout, Wartelistenpromotion und doppelte Idempotency.
- Widerrufene ICS-Tokens und Privacy-Projektionen gegen die echte Datenbank verifizieren.
- Booking/Handover-Daten nach Browser- und Server-Reload erneut lesen und vergleichen.

Diese Gates sind verpflichtend; die statischen 10/10-Tests ersetzen sie nicht.

## Drittanbieter- und Provider-Grenzen

Folgende Integrationen bleiben `provider_ready`, `blocked` oder `disabled`, bis Verträge, API-Schlüssel, Freigaben, Consent-/Retention-Regeln und Live-E2E-Nachweise vorliegen:

- Google Calendar, Outlook und Cal.com OAuth; aktuell nur ICS-Feed/Import.
- Zahlung, Refund und Bank-API; Finanzzustand wird angezeigt, aber keine echte Geldbewegung ausgelöst.
- SMS- und E-Mail-Zustellung.
- Dokument-Storage/S3 und produktiver Evidence-Bucket.
- Physischer Zugang, Kamera und Schließsysteme.
- Twenty-/weitere externe Synchronisation.

Die aktuelle QA-Umgebung hatte außerdem keine erreichbare Supabase-Instanz; deshalb sind auch interne Datenbankpfade nur statisch bzw. lokal/mocked bewiesen.

## UX-, Accessibility- und Performance-Status

- Türkische Kalender- und Offline-Fehlerzustände sind lokalisiert und fail-closed.
- Der fokussierte Chromium-Lauf bestätigt bei 360 px keinen horizontalen Overflow; Touch-Ziele, Fokusdarstellung und Reduced-Motion-Verhalten sind in den neuen Oberflächen berücksichtigt.
- Es wurde kein Lighthouse-Lauf durchgeführt; Lighthouse-/Performance-Budgets bleiben ein separates Release-Gate.

## Demo-Readiness

| Slice | Lokale Demo | Produktionsstatus |
| --- | --- | --- |
| Booking/Ressourcen | lokal darstellbar; TypeScript/Lint und statischer Contract grün; echter Browser-/DB-Workflow offen | nicht freigegeben bis Clean-DB-, Konkurrenz- und Reload-Nachweis |
| Move-in/out/Handover | lokal darstellbar; TypeScript/Lint und statischer Contract grün; echter Browser-/DB-Workflow offen | nicht freigegeben bis Live-RLS-, Audit- und Persistenznachweis |
| Kalender/ICS | Feed-/Import-Demo bereit | OAuth-Provider nicht angeschlossen; Token-/Privacy-Live-Test offen |
| Offline/PWA | lokale Offline- und Reload-Demo bereit | produktiver Server-Replay und echte Supabase-Persistenz offen |

## Übergabe an Manager / Window 1

- Migrations 32–35 nach Migration 22 in einer Clean-DB-/Staging-Umgebung anwenden.
- `supabase/tests/booking_handover_security.sql` ausführen und den **tatsächlichen** pgTAP-Pass-Count protokollieren.
- Die oben aufgeführten `has_*_privilege`, direkte-DML-, Cross-Scope-, Accountant-, Command-, Audit-, Konkurrenz- und Reload-Szenarien gegen diese Umgebung ausführen.
- Supabase-Umgebungsvariablen und nur freigegebene Provider konfigurieren; der Integrationsstatus darf erst nach einem erfolgreichen Probe auf `live` wechseln.
- UC18 als Window-3-Artefakt in den 24-Use-Case-Manager-Nachweis aufnehmen. UC02/03/04/08/10 bleiben bei ihren kanonischen Ownern.

## Relevante Dateien

- `supabase/migrations/00000000000032_booking_resource_lifecycle.sql`
- `supabase/migrations/00000000000033_move_handover_workflow.sql`
- `supabase/migrations/00000000000034_calendar_ics_feeds.sql`
- `supabase/migrations/00000000000035_offline_sync_commands.sql`
- `supabase/tests/booking_handover_security.sql`
- `apps/web/lib/booking-lifecycle-repository.ts`
- `apps/web/lib/move-handover-repository.ts`
- `apps/web/lib/ics-calendar.ts`
- `apps/web/lib/offline-queue.ts`
- `apps/web/components/booking-lifecycle/`
- `apps/web/app/api/site-management/booking-lifecycle/`
- `apps/web/app/api/site-management/move-handover/`
- `apps/web/app/api/site-management/calendar-feeds/`
- `apps/web/app/api/site-management/offline-sync/`
- `apps/web/e2e/operations/window3-calendar-offline-functional.spec.ts`
- `apps/web/e2e/api/booking-handover-security-functional.spec.ts`
