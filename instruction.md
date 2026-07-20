# instruction.md — Arbeits- und Zustandsleitfaden für 1Çatı (für KI-Coding-Agenten)

> Zweck: Diese Datei ist der **Wiedereinstiegspunkt für zukünftige Phasen**. Beim Weiterarbeiten zuerst diese Datei lesen, dann `docs/SYSTEM-STATE.md` (konsolidierter technischer Stand), dann `CLAUDE.md` (tiefe technische Referenz) und `docs/PROJECT-HANDBOOK.md` (Phasenwahrheit).
> Zuletzt aktualisiert: 16.07.2026 · Branch: `waleri-dev` (deckungsgleich mit `origin/main`, siehe §4) · Code-Stand: `c84f7b2` · Vertraulich.
> Reihenfolge bei Widersprüchen: aktueller **Code** > `docs/SYSTEM-STATE.md` > `docs/PROJECT-HANDBOOK.md` > `CLAUDE.md` > diese Datei.
> Seit 07.07.2026: **Code-Tiefenanalyse** (14 Bereiche) mit korrigierter Phasenwahrheit, **Kundendokumente** (Anforderungsdokument v2 + Kundenversion, Benutzerhandbuch v2 + Kundenversion) und **PowerPoint-Präsentationen** (lang + Pitch) inkl. Design-/Render-Pipeline (§9).
> Seit 10.07.2026: der **parallele Strang (`yash_dev`)** hat 25 Commits auf `main` gebracht — „Cati Training" (Video-Library), Security-Header/CSP, Public-AI-Telemetrie, Emergency-Service-Routing, Live-Dokumenten-Download, Dark-Mode entfernt.
> Seit 11.07.2026: **CEO-Vertriebsphase gestartet.** CEO-OnePager (PPTX+PNG), finale Präsentationsskripte, 21 Heygen-Vertonungsskripte. **⚠ Vor jeder Kunden-/CEO-Aussage §9.1 lesen** (verifizierte vs. verbotene Zahlen — Vorsicht: §9.1 selbst ist Stand 11.07. und nicht mehr vollständig deckungsgleich mit dem Code, siehe §9.2).
> **Seit 16.07.2026 — GROSSES Update, ändert vieles unten:** `origin/main` hat 12 neue Commits gebracht (251 Dateien, +97.344/-12.844 Zeilen) und wurde per Fast-Forward in `waleri-dev` übernommen. Neu: **`docs/SYSTEM-STATE.md`** als konsolidierter „was existiert heute wirklich"-Snapshot (bitte ab sofort zuerst dort nachsehen, nicht nur hier). Migrationen jetzt **0000–0037** (38 Dateien, alle 38/38 auf Supabase Cloud angewendet). **Phasen 10–14 laufen jetzt als „✅ Built"**, nicht mehr „Foundation mit getrennten Schichten" — mehrere in §10 (alt) dokumentierte Lücken sind laut `SYSTEM-STATE.md` geschlossen (Details §10, komplett überarbeitet). **Die `waleri-dev`-Exklusivvorgabe wurde in `CLAUDE.md` offiziell aufgehoben** — neue Arbeit auf Feature-/Fix-Branches, nicht mehr zwingend auf `waleri-dev` (§4). **⚠ Alle in dieser Datei/Session zuvor erzeugten Testartefakte (24-Anwendungsfälle-Priorität, Xray-Testfälle, ISTQB-Dokumente, Fehlertabelle) basieren auf dem Stand VOR diesem Update — vor Weiterverwendung gegen den neuen Code re-verifizieren** (§9.3).

---

## 1. Was ist der aktuelle Stand (Kurz)

1Çatı ist eine Property-Management-/Real-Estate-ERP-Plattform für Ataberk Estate (Referenzobjekt: New Level Premium, Avsallar/Alanya), umgesetzt von WAMOCON. Eine Next.js-App unter `apps/web` vereint öffentliche Produktseiten, Login/Demo, ein rollenbasiertes ERP-Dashboard, ein öffentliches New-Level-Premium-Modul (Registrierung/Meldung/Concierge) und die öffentliche Schulungsseite **„Cati Training"**.

**Projektkontext:** New Level Premium steht kurz vor der İSKÂN-Freigabe (türkische Bezugs-/Wohnungsnutzungsgenehmigung) und damit vor der Inbetriebnahme der Anlage — das ist der aktuelle Vertriebs-Aufhänger.

**Laut `docs/SYSTEM-STATE.md` (Stand 16.07.2026 — dort im Detail, hier nur Kurzfassung, von mir NICHT eigenständig nachgeprüft):**
- Typecheck sauber, ESLint 0 Fehler, Produktions-Build sauber.
- **E2E: 376 passed / 4 skipped / 0 failed** (Playwright, chromium).
- **Supabase Cloud: 38/38 Migrationen angewendet**, 127 Tabellen, 442 Funktionen.
- **Alle 6 Rollen mit echtem Passwort-Login end-to-end gegen Cloud verifiziert** (`<role>@cati-demo.com`, Passwörter separat/privat geteilt, nie committen) — zusätzlich zum bekannten Ein-Klick-Access-Profile-Demo-Login. `owner` löst auf echte Einheit **A-097**, `tenant` auf **G-014** auf (echte `unit_residents`-Beziehung, nicht mehr hartkodiert).
- **⚠ Wichtige Methodik-Warnung aus `SYSTEM-STATE.md` selbst:** Die Playwright-Suite läuft nur gegen den lokalen Seed-Fallback (kein echtes Postgres/keine echte RLS). Zwei reale Bugs (plpgsql-Fehler in Migration 25/27, RLS-Rekursion in Migration 37) wurden **nur** durch tatsächliches Anwenden gegen echtes Cloud-Postgres gefunden, nicht durch die 376 grünen Tests. **Konsequenz für uns:** DB-/RLS-Änderungen immer zusätzlich gegen eine echte Postgres-Instanz prüfen, nicht nur gegen die E2E-Suite vertrauen.

**Weiterhin live und verifiziert (Stand 11.07., seither nicht widerlegt):**
- **AI-Gateway** (OpenAI-kompatibel, „sokrates") live: interne CATI-KI (`/api/ai/chat`) und öffentliche Landing-KI (`/api/ai/public-chat`) liefern `source: "local-ai"`.
- **Ein-Klick-Demo ist auf Produktion AKTIV** — `GET /api/access-profile` → `{"enabled":true}`.
- **„Cati Training"** unter `/{locale}/videos` öffentlich, 19 reale Videos aus Supabase Storage (türkisch vertont).
- **Security-Header scharf**: CSP, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `nosniff`. HSTS kommt von Vercel (Edge), **nicht** aus `next.config.ts`.
- **Vercel-Produktion** deployt automatisch von `main`.

**Phasen-Wahrheit (siehe §10 für Details/Historie):** 1–9 Fundament fertig; **10–14 laut `SYSTEM-STATE.md` jetzt „✅ Built"** (Registrierung/Aktivierung, Compliance-Cockpit, Owner-Finance-Visibility, manuelle Zahlungsbuchung, Buyer-Pipeline, QR-Public-Reporting, Report-Artefakte, Zero-Cost-Emergency-Semantik, Booking-/Move-Handover-Lifecycle, Kommunikations-Center, Offline-Sync); 15 (QA/Security/Performance/UAT/Launch) **in Arbeit**. Wichtig: „Built" heißt API+UI+Tests vorhanden, **nicht** automatisch produktions-freigegeben — die offenen Business-/Legal-Entscheidungen aus `PROJECT-HANDBOOK.md` §6 bleiben unverändert offen (§8).

---

## 2. Live-Umgebung & Env-Variablen

**Secrets stehen NIE im Repo.** Werte leben ausschließlich in:
- Lokal: `apps/web/.env.local` (App) und `.env.tooling.local` (Root, AI/Jira/Xray für Skripte) — beide gitignored.
- Vercel: Project `cati` → Settings → Environment Variables (Production + Preview).

Benötigte Keys (Werte aus `.env.local` bzw. Vercel):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
AI_API_URL, AI_API_KEY, AI_CHAT_COMPLETIONS_PATH,
AI_MODEL_FAST, AI_MODEL_REASONING, AI_MODEL_GERMAN_COPY, AI_MODEL_PRO
DOCUMENT_STORAGE_MODE=supabase, SUPABASE_DOCUMENT_BUCKET=cati-documents
ENABLE_ACCESS_PROFILES, CATI_ALLOW_REMOTE_ACCESS_PROFILES   # siehe Demo-Modell §3
SUPABASE_VIDEO_BUCKET, SUPABASE_VIDEO_PREFIX                # ⚠ NICHT in .env.example dokumentiert
# Fuer scripts/jira-xray-uat-import.mjs und scripts/jira-xray-sync.mjs (Root, .env.tooling.local):
JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY, JIRA_PROJECT_NAME
XRAY_BASE_URL (i. d. R. https://xray.cloud.getxray.app), XRAY_CLIENT_ID, XRAY_CLIENT_SECRET
```
Defaults im Code: `SUPABASE_VIDEO_BUCKET = "Demo Videos"`, `SUPABASE_VIDEO_PREFIX = "tr/heygen-2026-07-09"` (`lib/video-library.ts`). `DOCUMENT_STORAGE_MODE` ist Opt-in: ohne Konfiguration läuft der Dokumenten-Pfad im Demo-Modus.

**Migrationen: jetzt 38 Dateien `0000…0037`** (nicht mehr 15). Alle 38 sind laut `SYSTEM-STATE.md` auf Supabase Cloud angewendet. Die frühere `0015`-Kollision ist **behoben** — `video_library` wurde auf `00000000000021_video_library.sql` umnummeriert. Neu seit 16.07.: 0020 (role/ticket-workflow-hardening + RLS-Fix), 0022 (tenant-access-invitations), 0023 (compliance-cockpit), 0024 (owner-finance-visibility), 0025 (registration-activation-workflow), 0026 (manual-payment-posting), 0027 (service-order-evidence), 0028 (public-qr-reporting), 0029 (portal-communications), 0030 (report-artifacts), 0031 (buyer-pipeline), 0032 (booking-resource-lifecycle), 0033 (move-handover-workflow), 0034 (calendar-ics-feeds), 0035 (offline-sync-commands), 0036 (zero-cost-emergency-semantics), 0037 (Fix: `workforce_tasks`↔`staff_members` zirkuläre RLS-Rekursion, 42P17). Schema-Änderungen immer als neue, eindeutig nummerierte Migration + RLS in derselben PR; **bereits angewendete Migrationen nie nachträglich editieren**.

**Offener manueller Schritt (laut `SYSTEM-STATE.md` §7):** `supabase/cloud-privileged-setup.sql` einmalig in Supabase Dashboard → SQL Editor ausführen (zwei Storage-/Realtime-Policies, die die `postgres`-Rolle nicht selbst setzen kann — Defense-in-Depth oberhalb der bereits privaten Bucket-/RLS-Absicherung, optional aber empfohlen).

---

## 3. Demo-/Zugangsmodell (wichtig — jetzt zwei echte Wege)

Gesteuert über `lib/auth.ts::isAccessProfileEnabled()` (muss synchron mit `proxy.ts::accessProfilesEnabledForRequest()` bleiben):

1. **Ein-Klick-Access-Profile (Demo, kein Passwort):** Login-Seite → „Demo başlat" → Rollenkarte wählen → sofortiger Zugriff. Lokal (`next dev`) immer an; remote/Produktion nur mit Doppel-Opt-in `ENABLE_ACCESS_PROFILES=true` **und** `CATI_ALLOW_REMOTE_ACCESS_PROFILES=true` (beide aktuell in Vercel gesetzt → Demo ist live offen). Ideal für Präsentationen/Screenshots, aber **kein Beleg für echte Auth**.
2. **NEU (seit 16.07.): Echte Supabase-Logins mit Passwort**, ein Account je Rolle (`<role>@cati-demo.com`), gegen Cloud verifiziert, `source: "supabase"`. `owner` → Einheit A-097, `tenant` → G-014 (echte Relationsdaten, nicht mehr die alten hartkodierten `A-001/A-054/D-023`/`A-018/A-023`-Sets aus `lib/role-scoped-views.ts` — dieser Datei-Pfad war die Basis für unsere alte UC22-„Owner/Tenant-Scoping ist hartkodiert"-Einstufung, die damit **wahrscheinlich überholt** ist, siehe §9.3). Passwörter **nicht** im Repo — separat/privat erfragen.

`getUserProfile()` (Server) und `proxy.ts` liefern bei beiden Wegen `company_id`. Bei Änderungen beide Stellen synchron halten.

---

## 4. Branch- & Deploy-Workflow (Policy geändert seit 16.07.!)

- **Die frühere Vorgabe „ausschließlich auf `waleri-dev` arbeiten" ist in `CLAUDE.md` offiziell aufgehoben.** Neue Arbeit läuft über die reguläre Konvention: `feature/CATI-123-kurzbeschreibung`, `fix/CATI-123-...`, `chore/...`. `waleri-dev` bleibt nutzbar (aktuell deckungsgleich mit `main`), ist aber kein Zwang mehr.
- `main` ist der Vercel-Produktions-Branch, Push auf `main` = Auto-Deploy (production). Build-Status im Vercel-Dashboard prüfen.
- **Vor jedem Weiterarbeiten:** `git fetch`, dann prüfen ob `origin/main` neue Commits hat (`git rev-list --left-right --count <branch>...origin/main`), ggf. per Fast-Forward übernehmen. Der parallele Strang hat in dieser Session mehrfach sehr große, saubere Fast-Forward-fähige Updates gebracht — vor Beginn einer neuen Aufgabe **immer** zuerst darauf prüfen, sonst arbeitet man an bereits überholten Annahmen (ist uns in dieser Session zweimal passiert, siehe §9.3).
- Nie einen ungetesteten Merge direkt auf `main` drücken.

---

## 5. Verifikations-Gates (vor jedem Push)

```
pnpm --dir apps/web typecheck      # bzw. npx tsc --noEmit in apps/web
pnpm --dir apps/web lint           # npx eslint app components lib --quiet
pnpm --dir apps/web build          # NUR wenn kein dev-Server läuft (sonst .next-Korruption)
pnpm --dir apps/web test:e2e -- --project=chromium
pnpm --dir apps/web test:e2e:structured
```
- **E2E ist bewusst deterministisch** (lokaler Seed-Fallback, `ENABLE_ACCESS_PROFILES=true`) — testet **keine** echte Postgres/RLS (siehe die Methodik-Warnung in §1). Für Migrations-/RLS-Änderungen zusätzlich gegen eine echte Supabase-Instanz verifizieren, nicht nur E2E grün laufen lassen.
- Der Dev-Server belegt `.next`; vor einem Build den Dev-Server stoppen, `.next` löschen, dann bauen.

---

## 6. Architektur-Wegweiser (wo was liegt)

**Für die vollständige, aktuelle Modulliste ab sofort `docs/SYSTEM-STATE.md` als erste Quelle nutzen** (Stand 16.07., inkl. Rollen-/Ressourcen-Tabelle, Cloud-Infrastruktur, Known-Follow-ups) — diese Datei hier hält nur noch die Kernmuster fest, die sich nicht laufend ändern:

- **Supabase-first mit Fallback:** `lib/site-management-repository.ts` — jede Funktion prüft `isSupabaseConfigured()`, sonst lokales Seed. Jede Antwort hat `source: "supabase" | "local-seed"` → beim Debuggen zuerst dieses Feld prüfen. Die Datei ist durch das 16.07.-Update stark gewachsen (+4244/-Zeilen) — viele neue Repository-Module liegen jetzt daneben statt darin (siehe unten).
- **RBAC:** `lib/rbac.ts` (6 Rollen × 14 Ressourcen × 8 Aktionen) muss synchron zu den SQL-RLS-Helpern bleiben. `owner` hat jetzt explizit auch `finance:view` (eigene Einheit) — die alte Aussage „Owner hat keine Finance-Ansicht" ist überholt, siehe `owner-finance-statement.tsx`/`owner-finance-repository.ts`.
- **Neue eigenständige Repository-/UI-Module seit 16.07.** (je Feature ein eigenes `lib/*-repository.ts` + `components/*` statt alles in der einen großen Datei): `booking-lifecycle-repository.ts` + `components/booking-lifecycle/*` (Buchung/Einzug/Auszug/Handover), `manual-payment-repository.ts` + `manual-payment-console.tsx` (Zahlung manuell verbuchen), `service-proof-repository.ts` + `service-proof-panel.tsx` (Foto-/Video-Nachweis), `registration-repository.ts` + `registration-review-panel.tsx` (Registrierung→Konto), `tenant-access-repository.ts` + `tenant-access-live-panel.tsx` (ersetzt die alte, nicht-persistente `tenant-access-panel.tsx` — die ist gelöscht), `buyer-pipeline-repository.ts` + `buyer-pipeline-workspace.tsx` (echte Kaufinteressenten-Pipeline statt der alten `residents`-Umdeutung), `compliance-repository.ts` + `compliance-live-cockpit.tsx`, `communications-repository.ts` + `communications-center.tsx`, `reporting-repository.ts` + `reporting-workspace.tsx`, `owner-finance-repository.ts`/`owner-finance-projection.ts` + `owner-finance-statement.tsx`, `offline-sync-repository.ts` + `offline-sync/offline-experience.tsx`, `role-governance-repository.ts`/`role-governance.ts` + `role-governance-panel.tsx`, `role-dashboard-repository.ts` + `role-focused-live-dashboard.tsx`, `public-report-repository.ts`/`public-report.ts` + `public-report-form.tsx`/`public-report-tracker.tsx`/`public-report-review-panel.tsx`, `ics-calendar.ts` (Kalender-ICS-Feeds), `ticket-workflow.ts`/`ticket-history.ts` (Tickets stark erweitert, `tickets/page.tsx` allein +2587 Zeilen).
- **Gelöschter toter Code (seit 16.07. bereinigt):** `components/sync-badge.tsx`, `hooks/use-seed-data.ts`, `components/tenant-access-panel.tsx` (die Fake-Persistenz-Variante), `components/theme-toggle.tsx`, `components/aurora-background.tsx`, `components/building-illustration.tsx`, `components/erp-product-cloud.tsx`, `components/hyper-frame.tsx`, `components/motion-provider.tsx`, `components/ui/label.tsx`. Wenn eine ältere Doku (auch diese Datei, ältere Fassung) diese Dateien noch als „vorhanden/tot" referenziert: überholt.
- **Zwei KIs:** interne CATI-KI (`app/api/ai/chat`, RBAC-gated) + öffentliche Landing-KI (`app/api/ai/public-chat`, `lib/public-ai-knowledge.ts`, **regelbasierte Themenerkennung per Schlüsselwort, kein echtes Sprachmodell**). Bekannter Robustheits-Punkt (in dieser Session real beobachtet): trifft die Nutzerformulierung keinen hinterlegten Schlüsselbegriff, fällt die Antwort auf eine allgemeine Begrüßung zurück statt auf den fachlich richtigen Textbaustein (z. B. bei KVKK-Fragen) — bei Weiterentwicklung Schlüsselwortlisten robuster/synonymreicher machen. System-Prompts nie so ändern, dass die KI Finanz-/Zugangs-/Berechtigungsaktionen selbst ausführt.
- **New-Level-Premium-Modul:** `app/[locale]/new-level-premium/*`, öffentliche Schreibpfade über RPC `submit_public_intake`. Registrierung: nur owner/tenant/staff öffentlich, admin/manager/accountant serverseitig 403 (per E2E bestätigt).
- **i18n:** 4 Sprachen (tr/en/de/ru), strukturell vollständig (467 Keys je Sprache, keine Lücken gefunden bei Stichprobe). Reihenfolge: tr→en→de→ru.
- **PWA:** `app/manifest.ts` (Name „1Çatı ERP - Ataberk Estate"), Service-Worker `public/sw.js` (jetzt +125 Zeilen erweitert), `public/offline.html` neu. Installierbar ohne App-Store.
- **Cati Training / Video-Library:** unverändert öffentlich unter `/{locale}/videos`, 19 türkisch vertonte Videos, Untertitel-Button vorhanden aber mangels `caption_tracks`-Daten deaktiviert.

---

## 7. Hart erarbeitete Lehren / Gotchas

**Weiterhin gültig:**
1. **Phantom-Dependencies brechen Vercel, nicht den lokalen Build.** Jedes `import "paket"` muss in `apps/web/package.json` **und** `pnpm-lock.yaml` stehen.
2. **Package-Manager ist pnpm** (`packageManager: pnpm@10.0.0`). Lockfile mit `pnpm install --lockfile-only` aktualisieren, nicht `npm install`.
3. **Vercel-Diagnose ohne Dashboard-Zugriff:** temporärer, unbedenklicher Readout (Booleans + `VERCEL_GIT_COMMIT_SHA`) in einer GET-Route, danach entfernen.
4. **Secrets:** `.env*.local` gitignored, nie committen/loggen. Vor Commits `git status` gegen `.env`/Temp-Dateien prüfen.
5. **Bereits angewendete Migrationen sind unveränderlich** — Nachträge immer als neue Migration (historischer Fall: `0006` wurde nachträglich editiert, das war falsch).
6. **Hardcodierte Supabase-Projekt-Ref** `hczmbaqofxyusellxhyp.supabase.co` steht fest im Code (CSP, `video-library.ts`) — sollte bei Projektwechsel über Env laufen.
7. **[.gitattributes NEU]** Seit 16.07. erzwingt `.gitattributes` LF-Zeilenenden plattformübergreifend — auf Windows beim manuellen Editieren darauf achten, keine CRLF wieder einzuschleppen.

**Neu aus dieser Session (16.07. und davor), für künftige Agenten:**
8. **[KRITISCH] Vor jeder neuen Aufgabe `git fetch` + Vergleich gegen `origin/main` durchführen.** In dieser Session gab es zweimal einen großen, unangekündigten Fast-Forward-fähigen Vorsprung von `origin/main` (zuerst 4, dann 12 weitere Commits) durch einen parallelen Arbeitsstrang. Wer das nicht prüft, arbeitet/dokumentiert gegen einen veralteten Codestand — genau das ist uns mit den Test-Dokumenten aus §9.3 passiert.
9. **[HOCH] Testartefakte veralten schnell in einem aktiv weiterentwickelten Repo.** Priorisierungstabellen, Testfall-Sammlungen (Excel/Word/Screenshots) sind Momentaufnahmen. Vor Weitergabe an Kunde/Entwickler immer Datum/Commit-Stand der zugrunde liegenden Code-Analyse gegen den aktuellen HEAD prüfen (siehe §9.3 für den konkreten Fall dieser Session).
10. **[MITTEL] Auto-Mode-Classifier blockiert neue Schreibvorgänge auf der produktiven Demo-Datenbank**, wenn sie wie „echte, aber unangekündigte Testdaten anlegen" aussehen (z. B. ein fabriziertes Notfall-Ticket). Für Screenshot-/Beweis-Dokumentation grundsätzlich **bestehende, bereits vorhandene Datensätze verwenden statt neue anzulegen**; wo das nicht geht, den Nutzer vorher explizit fragen.
11. **[MITTEL] Muster für Screenshot-Dokumentation mit nummerierten Klick-Markern:** Playwright (`playwright` Paket, in `apps/web/node_modules` vorhanden) headless gegen die Live-URL, `page.evaluate()` injiziert einen absolut positionierten, nummerierten Kreis an der `boundingBox()` des Zielelements, Screenshot, Marker wieder entfernen, dann klicken. Skripte müssen als `.cjs` in `apps/web/` liegen (Node-Modul-Auflösung + `"type":"module"` in `package.json` erzwingt sonst ESM). JPEG mit `quality:70-75` statt PNG hält Word-/Excel-Dateien klein. Ergebnis-Dokumente per `python-docx`/`openpyxl` bauen. Nach Gebrauch `.tmp-*`-Skripte/Screenshots aus `apps/web/` wieder entfernen (ins Scratchpad archivieren, nicht committen).
12. **[MITTEL] Ausgefüllte Word-Testprotokolle programmatisch auslesen:** Statusmarkierungen per Farb-Highlight (`python-docx`, `run.font.highlight_color`) werden von Word beim Bearbeiten oft in mehrere Runs aufgesplittet — die Zuordnung „welche der 4 Status-Checkboxen wurde markiert" braucht eine Offset-Berechnung gegen den bekannten Vorlagentext, nicht nur den Run-Text selbst.
13. **[NIEDRIG] Im Arbeitsverzeichnis liegt eine offenbar unvollständige Browser-Download-Datei** `docs/requirements/Nicht bestätigt 314475.crdownload` (unversioniert) — sieht nach einem abgebrochenen Download aus, kein Deliverable. Vor dem nächsten Commit-Sweep prüfen/aufräumen.

---

## 8. Nächste Phasen (Roadmap) — grundlegend aktualisiert seit 16.07.

**Phasen 10–14 sind laut `docs/SYSTEM-STATE.md` jetzt „✅ Built"** (API+UI+Tests vorhanden). Der Fokus verschiebt sich damit von „Lücken schließen" auf:

1. **Phase 15 (aktiver Schwerpunkt):** QA/Security/Performance/UAT mit echten Daten, Training, Launch/Hypercare — laut `SYSTEM-STATE.md` „🔶 In progress".
2. **Cloud-Nacharbeit:** `supabase/cloud-privileged-setup.sql` im Supabase Dashboard ausführen (§2).
3. **Re-Validierung statt Neubau:** Die in dieser Session dokumentierten „Lücken" (Buchung, manuelle Zahlungsbuchung, Foto-/Video-Nachweis, Registrierung→Konto, Owner/Tenant-Scoping, Kommunikations-Versand, Kaufinteressenten-Pipeline) haben laut Commit-Historie jetzt jeweils ein eigenes Modul + eigene Migration bekommen (§6) — **vor jeder weiteren Aussage darüber den tatsächlichen Funktionsstand neu verifizieren**, nicht die alten Befunde aus §10 fortschreiben.
4. **Weiterhin offen, nicht durch Code allein lösbar** (`docs/PROJECT-HANDBOOK.md` §6, unverändert seit 11.07.): Zahlungsanbieter, Zugangssystem-Vendor, KBS-Rechtsfreigabe, Datenretention, Bankabgleich, native App vs. PWA, historische Datenmigration, Produktions-UAT-Sign-off. Diese Entscheidungen blockieren die Produktivsetzung unabhängig vom Implementierungsstand.

---

## 9. Kundendokumente & Präsentationen

### 9.1 Design-/Render-Pipeline und belastbare Zahlen (Stand 11.07., ⚠ teilweise überholt)

Die Render-Werkzeuge (HTML→PDF/PNG via Playwright, PPTX via `python-pptx`, DOCX via `scripts/build-docx-from-md.py`) und die CI/Marken-Vorgaben aus der Vorversion dieser Datei gelten technisch weiter unverändert — für die exakten Schritte siehe Git-Historie dieser Datei (`git log -p -- instruction.md`, Stand 11.07.) oder `docs/requirements/option-3-ai-site-crm/`.

**Die „belastbare Zahlen"-Tabelle vom 11.07. (769 Einheiten, 7 Blöcke, 6/14/8 Rollen/Ressourcen/Aktionen, 13 Dashboard-Bereiche, 19 Trainingsvideos, 4 Sprachen, 15 ERP-Phasen) bleibt gültig**, da diese Werte sich durch das 16.07.-Update nicht verändert haben (kurz gegengeprüft). Die „NIEMALS verwenden"-Liste (212.298, 6.000 Deals, HSTS-im-Code, Foto/Video-Tickets) gilt ebenfalls weiter — **außer** Foto-/Video-Nachweis: dafür existiert jetzt laut §6/§10 ein eigenes Modul (`service-proof-panel.tsx`), das **vor** einer erneuten Kundenaussage aber erst funktional nachgeprüft werden muss, nicht einfach als „jetzt vorhanden" übernehmen.

### 9.2 Neue Kundendokumente seit 15.07.2026 (von mir NICHT gegengeprüft)

Der parallele Strang hat folgende, offenbar kundenfertige Deliverables hinzugefügt (Dateinamen tragen das Datum 2026-07-15):
- `docs/1Cati-Consolidated-Management-Demo-Readiness-Cost-Pack-2026-07-15.docx`
- `docs/1Cati-Demo-Readiness-Management-Audit-2026-07-15.docx`
- `docs/1Cati-Executive-All-Costs-One-Pager-2026-07-15.html`
- `docs/requirements/option-3-ai-site-crm/1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx`
- `docs/requirements/option-3-ai-site-crm/1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html`
- `docs/requirements/option-3-ai-site-crm/1Cati-OnePager-CEO-TR-Executive.pptx`
- `docs/ways-of-work/implementation/option-3-ai-site-crm/local-demo-readiness-management-audit-2026-07-15.md`
- `docs/ways-of-work/parallel-handoffs/window-2-engagement.md`, `window-3-booking-experience.md`
- `docs/ways-of-work/plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md`

**Ich habe diese Dokumente inhaltlich noch nicht gelesen/verifiziert.** Vor Verwendung gegenüber dem Kunden: Zahlen gegen §9.1/Code prüfen, wie es die eigene Regel dieser Datei für alle Kundendokumente vorschreibt.

### 9.3 Diese Session: Business-Abnahmetest-Artefakte (⚠ vor Weiterverwendung neu verifizieren)

In der Session vor diesem Update wurden folgende Artefakte gebaut, **basierend auf dem Codestand vor dem 16.07.-Merge**:
- Eine 24-Anwendungsfälle-Prioritätentabelle (Prio 1/2/3) für eine CEO-Live-Demo, inkl. 10 vorbereiteter CEO-Fragen mit Live-Beweis-Anleitung.
- `scripts/data/1cati-uat-test-cases.json` + `scripts/jira-xray-uat-import.mjs` (41 Xray-Testfälle, Test Set + Test Plan, Jira/Xray-Verbindung erfolgreich getestet — `--check`/`--dry-run`/`--live` Modi, siehe Datei-Kommentar). **Noch nicht `--live` ausgeführt.**
- `docs/test/1Cati-24-Anwendungsfaelle-Testfaelle.docx` — ISTQB-Testfälle mit nummerierten Screenshots je Anwendungsfall (vom Nutzer bereits einmal manuell ausgeführt und mit Status/Notizen versehen).
- `docs/test/1Cati-24-Anwendungsfaelle-Fehlertabelle.xlsx` — daraus extrahierte Fehlertabelle (6 „failed", 1 „in Work", 2 offen) zur Entwickler-Validierung.

**Alle vier Punkte basieren auf dem Stand vor dem 16.07.-Merge.** Mehrere dort als „bekannte Lücke" (Prio 3, UC18–UC24) oder als „Fehler" dokumentierte Punkte könnten durch die neuen Module aus §6 bereits geschlossen sein (z. B. UC22 Owner/Tenant-Scoping — jetzt echte `unit_residents`-Relation statt hartkodierter Sets; UC13 Mieterzugriff-Fake-Persistenz — Komponente ersetzt). **Vor Weiterverwendung (Kunde, Entwickler, nächster Xray-Import) diese vier Artefakte gegen den aktuellen Code neu verifizieren**, nicht ungeprüft als aktuell ausliefern. Diese Dateien liegen aktuell **unversioniert** im Arbeitsverzeichnis (`git status` zeigt sie als `??`) — noch nicht committet.

---

## 10. Phasen-Historie (07.07.–16.07.2026) — komprimiert, Details in Git-Historie

Diese Datei enthielt bis 11.07. einen ausführlichen Abschnitt „Code-Tiefenanalyse" mit einer Liste realer funktionaler Lücken (keine Reservierung anlegen, keine Finanzbuchung erfassen, kein Foto-/Video-Upload, kein Admin-Triage-Rückweg, hartkodiertes Owner/Tenant-Scoping, kein Push). **Diese Lücken-Liste ist durch das 16.07.-Update mutmaßlich größtenteils geschlossen** (siehe §6 für die neuen Module, §8 Punkt 3 für die Konsequenz: neu verifizieren statt fortschreiben). Der volle historische Text der alten Analyse bleibt über `git log -p -- instruction.md` abrufbar und wird hier nicht dupliziert, um diese Datei nicht mit überholtem Stand zu bloaten.

**Aktuelle Quelle der Wahrheit für Feature-/Phasenstatus: `docs/SYSTEM-STATE.md`, Abschnitt 4 („Feature areas").**

---

## 11. Schnellreferenz

- Lokal starten: `cd apps/web && npm.cmd run dev -- -p 3000` → `http://localhost:3000/tr` (Access-Profile lokal automatisch an)
- Live-Produktion: `https://cati-blond.vercel.app` (Push auf `main` deployt)
- **Wichtige Routen:** `/tr` (Landing) · `/tr/videos` („Cati Training") · `/tr/new-level-premium` · `/tr/pitch` (Demo-Center) · `/tr/login` · `/tr/dashboard`
- **Live-Statuschecks (read-only):** `curl -s .../api/access-profile` → Demo-Flag
- **Vor jeder neuen Aufgabe:** `git fetch` + Vergleich gegen `origin/main` (§4), dann `docs/SYSTEM-STATE.md` lesen (Stand jetzt aktueller als diese Datei für Feature-Fragen).
- **Vertriebs-/CEO-Material:** §9 · **vor jeder Zahl gegenüber Kunde/CEO → §9.1 lesen**, neue Dokumente §9.2 vor Verwendung inhaltlich prüfen.
- **Jira/Xray:** `scripts/jira-xray-sync.mjs` (15-Phasen-Sync, bestehend) und `scripts/jira-xray-uat-import.mjs` (neu, diese Session, §9.3) — beide immer erst mit `--dry-run`/`--check`, nie ungefragt `--live`.
- Kanonische Doku-Reihenfolge: diese Datei → `docs/SYSTEM-STATE.md` → `CLAUDE.md` → `AGENTS.md` → `docs/PROJECT-HANDBOOK.md` → `docs/requirements/option-3-ai-site-crm/` (BRD/PRD/TRD/Security/QA/Vendor).
