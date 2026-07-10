# instruction.md — Arbeits- und Zustandsleitfaden für 1Çatı (für KI-Coding-Agenten)

> Zweck: Diese Datei ist der **Wiedereinstiegspunkt für zukünftige Phasen**. Beim Weiterarbeiten zuerst diese Datei lesen, dann `CLAUDE.md` (tiefe technische Referenz) und `docs/PROJECT-HANDBOOK.md` (Phasenwahrheit).
> Zuletzt aktualisiert: 10.07.2026 · Branch: `waleri-dev` (= `main`, siehe Deploy-Workflow) · Code-Stand: `35f5637` · Vertraulich.
> Reihenfolge bei Widersprüchen: aktueller **Code** > `docs/PROJECT-HANDBOOK.md` > `CLAUDE.md` > diese Datei.
> Seit 07.07.2026: **Code-Tiefenanalyse** (14 Bereiche) mit korrigierter Phasenwahrheit (§10), **Kundendokumente** (Anforderungsdokument v2 + Kundenversion, Benutzerhandbuch v2 + Kundenversion) und **PowerPoint-Präsentationen** (lang + Pitch) inkl. Design-/Render-Pipeline (§9).
> Seit 10.07.2026: der **parallele Strang (`yash_dev`)** hat 25 Commits auf `main` gebracht — neu sind **„Cati Training" (Video-Library)**, **Security-Header/CSP**, **Public-AI-Telemetrie + NDJSON-Streaming**, **Same-Language-Chat**, **Emergency-Service-Routing**, **Live-Dokumenten-Download** sowie **Dark-Mode entfernt**. Details in §6/§7; **⚠ Migrations-Kollision `0015` beachten (§7.7)**.

---

## 1. Was ist der aktuelle Stand (Kurz)

1Çatı ist eine Property-Management-/Real-Estate-ERP-Plattform für Ataberk Estate (Referenzobjekt: New Level Premium, Avsallar/Alanya), umgesetzt von WAMOCON. Eine Next.js-App unter `apps/web` vereint öffentliche Produktseiten, Login/Demo, ein rollenbasiertes ERP-Dashboard, ein öffentliches New-Level-Premium-Modul (Registrierung/Meldung/Concierge) und die öffentliche Schulungsseite **„Cati Training"**.

**Live und verifiziert (Stand 10.07.2026, geprüft gegen `https://cati-blond.vercel.app`):**
- **Supabase Cloud** (Projekt-Ref `hczmbaqofxyusellxhyp`) ist angebunden und befüllt (769 units, Blocks/Floors, Tickets, Finanz-Ledger, Service-Orders, `client_action_requests` etc.). Die App liest/schreibt echte Cloud-Daten (`source: "supabase"`).
- **AI-Gateway** (OpenAI-kompatibel, „sokrates") ist live: interne CATI-KI (`/api/ai/chat`) und öffentliche Landing-KI (`/api/ai/public-chat`) liefern `source: "local-ai"`.
- **Ein-Klick-Demo ist auf Produktion AKTIV** — live geprüft: `GET /api/access-profile` → `{"enabled":true}`, `/tr/dashboard` liefert 200 ohne Login-Redirect. (⚠ `docs/PROJECT-HANDBOOK.md` behauptet „Access profiles: disabled for cloud/production" — **das ist veraltet**, der Code + die Vercel-Flags sind maßgeblich.)
- **„Cati Training"** unter `/{locale}/videos` ist öffentlich (ohne Login), 19 reale Videos aus Supabase Storage.
- **Security-Header sind scharf** (live geprüft): CSP, HSTS-preload, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, Permissions-Policy, `nosniff`, `no-store` auf `/api`, `/{locale}/dashboard`, `/{locale}/login`.
- **Vercel-Produktion** deployt automatisch von `main`.

**Phasen (korrigiert durch die Tiefenanalyse vom 07.07.2026, siehe §10):** 1–9 als Fundament fertig (mit einzelnen dokumentierten Lücken); New-Level-Premium-Modul umgesetzt; **10–14 sind NICHT „nicht begonnen", sondern „Foundation mit getrennten Schichten"** — für jede Phase existieren bereits UI + API + DB-Schema, sind aber überwiegend nicht miteinander verdrahtet (UI liest statische Arrays statt der dafür angelegten Supabase-Tabellen). Details und Belege: §10 dieser Datei, `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati-v2.md`, `docs/PROJECT-HANDBOOK.md` §3.1.

---

## 2. Live-Umgebung & Env-Variablen

**Secrets stehen NIE im Repo.** Werte leben ausschließlich in:
- Lokal: `apps/web/.env.local` (App) und `.env.tooling.local` (Root, AI für Skripte) — beide gitignored.
- Vercel: Project `cati` → Settings → Environment Variables (Production + Preview).

Benötigte Keys (Werte aus `.env.local` bzw. Vercel):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
AI_API_URL, AI_API_KEY, AI_CHAT_COMPLETIONS_PATH,
AI_MODEL_FAST, AI_MODEL_REASONING, AI_MODEL_GERMAN_COPY, AI_MODEL_PRO
DOCUMENT_STORAGE_MODE=supabase, SUPABASE_DOCUMENT_BUCKET=cati-documents
ENABLE_ACCESS_PROFILES, CATI_ALLOW_REMOTE_ACCESS_PROFILES   # siehe Demo-Modell §3
SUPABASE_VIDEO_BUCKET, SUPABASE_VIDEO_PREFIX                # ⚠ NICHT in .env.example dokumentiert
```
Defaults im Code: `SUPABASE_VIDEO_BUCKET = "Demo Videos"`, `SUPABASE_VIDEO_PREFIX = "tr/heygen-2026-07-09"` (`lib/video-library.ts`). `DOCUMENT_STORAGE_MODE` ist **Opt-in**: ohne `=supabase` + Service-Role + Bucket läuft der Dokumenten-Pfad im Demo-Modus (`demo-object-store`); in Produktion ohne Konfiguration wirft er bewusst.

Migrationen: inzwischen **17 Dateien `0000…0015`** (nicht mehr 0013). Neu: `0014_default_company_context` (Default-Company + `profiles.company_id`-Backfill), `0015_emergency_service_catalog_phase`, `0015_video_library`. **⚠ Zwei Dateien teilen den Versionspräfix `0015` — siehe §7.7, vor jedem `db reset` fixen.** Schema-Änderungen immer als neue, **eindeutig nummerierte** Migration + RLS in derselben PR; **bereits angewendete Migrationen nie nachträglich editieren** (ist bei `0006` passiert, §7.8).

---

## 3. Demo-/Zugangsmodell (wichtig)

Gesteuert über `lib/auth.ts::isAccessProfileEnabled()` (muss synchron mit `proxy.ts::accessProfilesEnabledForRequest()` bleiben — beide enthalten dieselbe, duplizierte Logik):

- **Lokal (`next dev`): Access-Profile sind seit 07/2026 IMMER an.** Neuer Kurzschluss `if (localDevelopment) return true`, wobei `localDevelopment = NODE_ENV !== "production" && !VERCEL_ENV && !VERCEL_URL && CATI_ENV !== "production"`. `ENABLE_ACCESS_PROFILES` wird lokal **nicht mehr benötigt**.
- **Echt-Auth (Default remote):** Ohne Flags → Dashboard verlangt echten Supabase-Login.
- **Ein-Klick-Demo remote/Produktion:** `ENABLE_ACCESS_PROFILES=true` **und** `CATI_ALLOW_REMOTE_ACCESS_PROFILES=true` (Doppel-Opt-in) schalten frei (dokumentierte Ausnahme gemäß CLAUDE.md-Sicherheitsregel #5). **Beide Flags sind aktuell in Vercel gesetzt → Demo ist live offen** (verifiziert: `/api/access-profile` → `{"enabled":true}`). Der Login-Button `data-testid="demo-full-access"` meldet ohne Passwort als `admin` an; das Repository nutzt dann die Service-Role für echte Cloud-Daten.
- **Wieder sperren:** `CATI_ALLOW_REMOTE_ACCESS_PROFILES` in Vercel entfernen → Produktion ist sofort wieder echt-Auth.
- **Rest-Risiko:** Ein Nicht-Vercel-Host, der versehentlich mit `NODE_ENV != "production"` läuft (fehlkonfiguriertes `next start`), öffnet die Profile automatisch. Auf Vercel unkritisch, bei Eigen-Hosting beachten.

`getUserProfile()` (Server) und `proxy.ts` (Middleware-Guard für `/dashboard`) hängen an dieser Logik. Bei Änderungen beide Stellen synchron halten. `UserProfile` trägt jetzt zusätzlich `company_id` (nötig für Live-Dokumenten-Storage).

---

## 4. Branch- & Deploy-Workflow

- Gearbeitet wird auf **`waleri-dev`**. `main` ist der Vercel-Produktions-Branch.
- **`origin/main` läuft häufig durch einen parallelen Strang voraus.** Vor dem Nach-`main`-Bringen: `git fetch`, dann `origin/main` in `waleri-dev` mergen (Konflikte auf dem eigenen Branch lösen, verifizieren), dann `git push origin waleri-dev` und Fast-Forward `git push origin waleri-dev:main`. Nie einen ungetesteten Merge direkt auf `main` drücken.
- **Push auf `main` = Vercel-Auto-Deploy** (production). Build-Status im Vercel-Dashboard prüfen.

---

## 5. Verifikations-Gates (vor jedem Push)

```
pnpm --dir apps/web typecheck      # bzw. npx tsc --noEmit in apps/web
pnpm --dir apps/web lint           # npx eslint app components lib --quiet
pnpm --dir apps/web build          # NUR wenn kein dev-Server läuft (sonst .next-Korruption)
pnpm --dir apps/web test:e2e -- --project=chromium
pnpm --dir apps/web test:e2e:structured    # Funktions-Suite inkl. api/security-observability-functional.spec.ts
```
- **E2E ist bewusst deterministisch:** `playwright.config.ts` leert im `webServer.env` das AI-Gateway und Supabase (→ deterministischer Fallback + lokale Seed-Daten) und setzt `ENABLE_ACCESS_PROFILES=true`. Nicht gegen die Live-Cloud/-AI testen (nicht-deterministisch, langsam).
- Der Dev-Server (`npm.cmd run dev -- -p 3000`) belegt `.next`; vor einem Build den Dev-Server stoppen (Port 3000 killen), `.next` löschen, dann bauen. Danach ggf. Dev-Server neu starten.

---

## 6. Architektur-Wegweiser (wo was liegt)

- **Supabase-first mit Fallback:** `lib/site-management-repository.ts` — jede Funktion prüft `isSupabaseConfigured()`, sonst `lib/site-management-data.ts` (Seed). Jede Antwort hat `source: "supabase" | "local-seed"` → beim Debuggen zuerst dieses Feld prüfen.
- **RBAC:** `lib/rbac.ts` (6 Rollen × 14 Ressourcen × 8 Aktionen) muss synchron zu den SQL-RLS-Helpern (`supabase/migrations/00000000000001_rbac.sql`) bleiben.
- **Zwei KIs (verbunden):** interne CATI-KI (`app/api/ai/chat`, `lib/ai-responses.ts`, RBAC-gated) + öffentliche Landing-KI (`app/api/ai/public-chat`, `lib/public-ai-knowledge.ts`, datenblind). Landing-Fragen fließen via `logPublicAiInterest` → `client_action_requests` als Interesse-Analytics zurück ins CATI. Gateway: `lib/local-ai.ts` (austauschbar, OpenAI-kompatibel). System-Prompts nie so ändern, dass die KI Finanz-/Zugangs-/Berechtigungsaktionen selbst ausführt — nur empfehlen.
- **New-Level-Premium-Modul:** `app/[locale]/new-level-premium/*`, `components/new-level-premium/*`, Landing-Concierge `components/site-concierge.tsx` (auf Startseite `page="home"` und NLP), QR-Poster `report-poster/page.tsx` (nutzt `qrcode`), öffentliche Schreibpfade über RPC `submit_public_intake` (allowlisted, anonym, write-only). Registrierung: nur owner/tenant/staff öffentlich, admin/manager/accountant serverseitig 403.
- **i18n:** 4 Sprachen (tr/en/de/ru). `messages/*.json` (next-intl) + `lib/business-copy.*.ts` (Freitext-Dictionaries, Lookup via `localizeBusinessCopy`). Reihenfolge bei Sprachaufzählungen: tr→en→de→ru.
- **Demo-Center:** `app/[locale]/pitch/page.tsx` (`data-testid="demo-center-page"`).
- **Theme:** ⚠ **Dark-Mode wurde entfernt.** `components/theme-provider.tsx` setzt `forcedTheme="light"`, `enableSystem={false}`; `globals.css` erzwingt `color-scheme: light` und blendet Scrollbars global aus. `components/theme-toggle.tsx` existiert noch, ist aber **toter Code** (nirgends importiert) — ebenso wurde der eigenständige Logout-Button aus der Topbar entfernt (Logout nur noch im Dropdown). Sidebar bleibt sticky + intern scrollbar (`dashboard-sidebar.tsx`).

### Neue Module (Stand 10.07.2026)

- **„Cati Training" / Video-Library** — `app/[locale]/videos/page.tsx`, Player `components/video-library-player.tsx`, Logik `lib/video-library.ts`. **Öffentlich ohne Login** (`proxy.ts` schützt nur `/dashboard`). Navbar-Key `nav.videos` heißt in **allen 4 Sprachen** „Cati Training" (mit Pulse-Indikator). 19 reale MP4s im **öffentlichen** Supabase-Bucket `Demo Videos`, Prefix `tr/heygen-2026-07-09` — **türkisch gesprochen**, nur Titel/Beschreibungen sind lokalisiert. **Playlist/Metadaten sind hartkodiert** (`fallbackVideoSeeds`, `storageVideoCopy`), *nicht* DB-getrieben: `getVideoLibrary()` fragt die Tabelle `video_library` ab, die **nie befüllt** ist → immer Public-URL-Fallback. `source` ist hier `"supabase" | "fallback"` (nicht `"local-seed"`) und meldet „supabase", sobald URLs auflösen — **kein Beleg für DB-Anbindung**. Authoring-Tools (Playwright-Recorder → mp4 → Upload) in `apps/web/scripts/record-*`, `convert-heygen-*`, `upload-demo-video-assets.mjs` (`pnpm record:playlist`, `pnpm upload:demo-videos`) — Einmal-Tools, nicht Teil der App, nicht in CI. E2E: `e2e/video-library.spec.ts`.
- **Security-Header** — `next.config.ts` setzt global CSP, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, COOP/CORP, Permissions-Policy, `nosniff`; plus `no-store` + `noindex` auf `/api/:path*`, `/{locale}/dashboard/:path*`, `/{locale}/login/:path*`. **CSP ist bewusst aufgeweicht:** `script-src 'unsafe-inline' 'unsafe-eval'` (Next.js-Runtime) — Framing-Schutz hart, XSS-Schutz nur teilweise. Referenz: `docs/security/AI-SECURITY-OBSERVABILITY.md`.
- **Public-AI-Telemetrie & Datenschutz** — `lib/public-ai-chat.ts`. **Rohfragen anonymer Besucher werden NICHT gespeichert:** nur eine über `redactedTelemetryPreview()` maskierte (E-Mail/Telefon/Unit/Passwort) und auf 180 Zeichen gekürzte Vorschau. Telemetrie ist fire-and-forget (800 ms Budget) und persistiert **nur bei konfiguriertem Supabase**. Sicherheits-Metadaten `public-ai-safety-v2` (grounding/drift/privateDataSafe/flags) bzw. intern `operations-ai-safety-v2` sind **Heuristiken (Regex/Formeln), kein ML**.
- **Streaming** — `app/api/ai/public-chat/stream/route.ts`: **NDJSON, kein SSE** und **kein echtes Token-Streaming**. Die deterministische Antwort wird vorab vollständig berechnet und dann in 96-Zeichen-Chunks gestreamt (reiner UX-Tippeffekt).
- **Same-Language-Chat** — `lib/language-detection.ts`: Die KI antwortet in der Sprache der Nutzernachricht, nicht der UI-Locale (reine Begrüßungen überschreiben die Locale nicht; Kyrillisch → `ru`). Intern zusätzlich Nachgeschalteter Guard `isLikelySameLanguage()` → bei falscher LLM-Sprache deterministischer Fallback (`source: "deterministic-language-guard"`).
- **Prompt-Injection / Human-Approval** — `hasPromptInjectionSignal()` (öffentlich + intern) und `sensitiveActionSignal()` (intern, mehrsprachig pay/refund/deposit/access/role) setzen `humanApprovalRequired`. KI-Tickets sind stets `modelExecution: "draft_only"` → nur `client_action_request`, nie Direktausführung. **Beim Ändern der System-Prompts nicht abschwächen.**
- **Emergency-Service-Routing** — `lib/site-management-repository.ts` (`emergencyScenarios`, `detectEmergencyScenario()`, `emergencyProviderQueue()`) + Migration `0015_emergency_service_catalog_phase` (8 Notfall-Katalogeinträge). Deterministische, **mehrsprachige Keyword→Katalog**-Zuordnung mit **Pflicht-Manager-Freigabe**. Bei Freigabe erzeugt `materializeApprovedTicketRequest()` jetzt real `service_ticket` + `service_order` + `workforce_task` + `notification` (bei Live-Supabase echte DB-Writes). ⚠ `notificationChannel` (Push/SMS) ist **reine Metadaten — kein echter SMS-/Push-/Vendor-Versand.** Keine produktive 24/7-Notfallleitung.
- **Dokumenten-Download (live-fähig)** — `app/api/site-management/documents/[documentId]/file/route.ts`: RBAC-gated (`documents:view`), liefert **60-Sekunden Signed URL** aus Bucket `cati-documents`; owner/tenant nur eigene Uploads. Greift **nur** bei `DOCUMENT_STORAGE_MODE=supabase` (sonst 404 „not attached yet"). UI ist verdrahtet (`dashboard/documents/page.tsx`).
- **Navigation/Landing** — neuer Navbar-Punkt `videos`; Anker `#modules`→`#workflows`, `#contacts`→`#contact` (Section-IDs entsprechend umbenannt), Active-State-Highlighting; „New Level Premium" wird jetzt lokalisiert dargestellt.

---

## 7. Hart erarbeitete Lehren / Gotchas

1. **Phantom-Dependencies brechen Vercel, nicht den lokalen Build.** Lokales `node_modules` kann Pakete enthalten, die nicht in `package.json` stehen (z. B. war `qrcode` so). Vercels sauberes `pnpm install` findet sie nicht → „Module not found". Regel: jedes `import "paket"` muss in `apps/web/package.json` deklariert **und** in `pnpm-lock.yaml` sein. Prüf-Einzeiler: externe Imports vs. deklarierte Deps abgleichen.
2. **Package-Manager ist pnpm** (`packageManager: pnpm@10.0.0`, `pnpm-lock.yaml`, Workspaces). Lockfile mit `pnpm install --lockfile-only` aktualisieren (nicht `npm install` — das pflegt die falsche Lockfile). corepack fehlt in der Bash; `npx --yes pnpm@10.0.0 …` funktioniert.
3. **Vercel-Diagnose ohne Dashboard-Zugriff:** temporär einen unbedenklichen Readout (Booleans + `VERCEL_GIT_COMMIT_SHA`, keine Secret-Werte) in eine GET-Route legen und die Live-URL pollen, um deployten Commit/Flags zu sehen — danach wieder entfernen.
4. **Produktions-Access-Profile-Sperre:** Auf Vercel ist `VERCEL_ENV=production`; nur das Doppel-Opt-in aus §3 hebt die Sperre auf.
5. **Merges nach `main`:** wegen des parallelen Strangs regelmäßig 3-Wege-Merge nötig; „theirs/ours"-Blends können Dateien durch Hunk-Interleaving zerbrechen — bei breiten Konflikten lieber die self-konsistente Version einer Seite pro Datei nehmen und danach mit tsc/build erzwingen.
6. **Secrets:** `.env*.local` sind gitignored; niemals Werte committen/loggen/nach außen senden. Vor Commits `git status` gegen `.env`/Temp-/`verify-*`-Dateien prüfen.
7. **[KRITISCH] Migrations-Versionskollision `0015`.** `00000000000015_emergency_service_catalog_phase.sql` und `00000000000015_video_library.sql` teilen denselben Versionspräfix. Supabase identifiziert Migrationen über die **Versionsnummer** (PK in `supabase_migrations.schema_migrations`), nicht über den Dateinamen. Folge: `supabase db reset` bricht mit `duplicate key … schema_migrations_pkey` ab, **oder** `db push` überspringt die zweite still → `video_library`-Tabelle + Bucket werden nie erstellt. **Fix vor dem nächsten Reset:** eine Datei auf `00000000000016_video_library.sql` umnummerieren, dann `supabase migration list` + sauberen `db reset` verifizieren.
8. **[HOCH] Bereits angewendete Migration wurde nachträglich editiert.** `00000000000006_service_operations_phase_08_09.sql` bekam 8 Notfall-Zeilen nachgeschoben. Bestands-DBs führen `06` nicht erneut aus (sie bekommen die Zeilen nur über den `15_emergency`-Upsert), frische Resets führen beide aus → **Migrations-Drift + geänderter Datei-Checksum**. Regel: angewendete Migrationen sind unveränderlich; Nachträge immer als neue Migration.
9. **[MITTEL] Video-Bucket-Inkonsistenz.** Migration `0015_video_library` legt einen **privaten** Bucket `video-library` (+ Signed-URL-Design) an — der laufende Code nutzt aber den **öffentlichen** Bucket `Demo Videos` mit Public-URLs. Der Signed-URL-Zweig wird nie erreicht, solange die Tabelle leer ist. Die Video-Seite hängt an manuellem Storage-Setup; `SUPABASE_VIDEO_BUCKET`/`SUPABASE_VIDEO_PREFIX` fehlen in `.env.example`.
10. **[MITTEL] Hardcodierte Supabase-Projekt-Ref.** `hczmbaqofxyusellxhyp.supabase.co` steht fest im Code (`next.config.ts` CSP img/media-src, `lib/video-library.ts`). Kein Secret (öffentliche URL), aber committeter Hardcode — sollte über Env laufen, sonst bricht ein Projektwechsel CSP + Videos.
11. **[NIEDRIG] Toter Code:** `components/theme-toggle.tsx` (Dark-Mode entfernt), zusätzlich weiterhin `components/sync-badge.tsx` und `hooks/use-seed-data.ts` + `lib/seed-data.ts`.
12. **[DOKU-DRIFT] `docs/PROJECT-HANDBOOK.md` ist an zwei Stellen falsch:** es nennt Migrationen nur bis `0013` (real: `0015`) und behauptet „Access profiles: disabled for cloud/production runtime" — live ist der Demo **aktiv** (`{"enabled":true}`). `CLAUDE.md` §4 nennt sogar nur bis `0006`. Bei Gelegenheit nachziehen.

---

## 8. Nächste Phasen (Roadmap)

Reihenfolge und Akzeptanzkriterien: `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` + `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`.
- **Phase 10:** Booking/Move-in/Checkout (Reservierung, Kaution, Reinigung, Zugangsaktivierung, Schadensabwicklung).
- **Phase 11:** Kommunikation, Benachrichtigungen, Dokumente (mit Berechtigungsprüfung).
- **Phase 12:** Mobile-PWA-Hardening (Manifest, Offline, Push).
- **Phase 13:** Externe Integrationen (Payment/Bank/SMS/Access-Adapter, Retry-Queue, Health-Dashboard) — Vendor-Entscheidungen offen (`Third-Party-Integration-And-Vendor-Plan.md`).
- **Phase 14:** KI-Premium-Layer (grounded Assistant → Predictive Risk/Briefings → Advanced Analytics), Aktions-Automatisierung bleibt provider-/legal-gated.
- **Phase 15:** QA, Security/RLS-Review, Performance, UAT mit echten Daten, Training, Launch/Hypercare.

**Priorisierte Quick-Wins vor Neuentwicklung (aus §10):** Der größte sichtbare Fortschritt für den geringsten Aufwand ist **reine Verdrahtung** — bereits fertige, getestete Backends an bereits gebaute UIs anschließen (Daire-Matrix-Hauptansicht, Finanzübersicht-Kopf, Reports/Compliance/Settings/Booking/Communications an ihre eigenen, ungenutzten API-Routen). Erst danach die echten funktionalen Lücken schließen (Reservierung anlegen, Finanzbuchung erfassen, Medien-Upload, Admin-Triage für NLP-Registrierungen).

Offene, nicht durch Code lösbare Entscheidungen (Kunde/Legal/Vendor): `docs/PROJECT-HANDBOOK.md` §6 (Zahlungsanbieter, Zugangssystem, KBS-Rechtsfreigabe, Datenretention, Bankabgleich, native App vs. PWA, historische Migration, Produktions-UAT).

---

## 9. Kundendokumente & Präsentationen (Design-/Render-Pipeline)

In dieser Session entstanden **kundenfertige Deliverables** und die Werkzeuge, um sie neu zu erzeugen. Alle liegen unter `docs/requirements/option-3-ai-site-crm/` bzw. `docs/user-handbook/`.

**Deliverables:**
- **Interne, code-verifizierte Fassung (mit Statusdetails):** `Anforderungsdokument-1Cati-v2.md` (+ `.docx`, auch in `apps/web/public/`) und `docs/user-handbook/1Cati-Benutzerhandbuch-v2.md` (+ `.docx`). Diese enthalten Reifegrad-Legende, Zeile-für-Zeile-Abgleich der Original-Kundenanforderung und die §10-Befunde. **Nicht für den Kunden** (enthalten Statusfeinheiten).
- **Kundenversionen (ohne interne Infos, im 1CATI-CI):** `1Cati-Anforderungsdokument-Kundenversion.html` + `.pdf` und `docs/user-handbook/1Cati-Benutzerhandbuch-Kundenversion.html` + `.pdf`. Standalone (kein „Fortführungs"-Bezug), alle Kapitel, keine Code-/Migrations-/Interna. HTML ist die editierbare Quelle → PDF via Chromium.
- **Präsentationen (1CATI-CI, Echtbilder, Ataberk-Co-Branding):** `1Cati-Anforderungsdokument-Praesentation.pptx` (lang, 33 Folien) und `…-Praesentation-Pitch.pptx` (Pitch, 12 Folien).

**Original-Kundenanforderung** (Referenz für Abgleiche): `docs/requirements/CRM Kundenanforderungen Premıum de-DE.docx` (Original-Spezifikation des Kunden).

**CI / Marken-Vorgaben** (aus `apps/web/app/globals.css`): Primär-Petrol `#066B63`, Tief-Petrol `#044F49`, Gold-Akzent `#B9822B`/`#E2B75D`, Ink `#101820`, BG `#F7F9F8`; Schrift **„Aptos", "Segoe UI"**. Motive: Aurora-Radials (Petrol/Gold), Verlaufslinie Petrol→Gold, Gebäude-Silhouette (aus `components/building-illustration.tsx`). 1CATI-Logo aus `components/cati-logo.tsx` (Haus-Mark).

**Ataberk-Logo:** von `https://ataberkestate.com/themes/custom/kibmak2/images/logo.svg` (= ataberkhomes.com, identisch) — „ATABERK REAL ESTATE", Blau `#2E7EC4` + Weiß. Weiß-Anteil braucht dunklen/Petrol-Hintergrund → in den Decks als Co-Brand-Badge auf einem Tief-Petrol-Chip mit Goldrand oben rechts auf jeder Folie. WAMOCON bleibt Fußzeile, 1CATI oben links.

**Echtbilder New Level Premium:** `docs/requirements/option-3-ai-site-crm/Foto New Level Premium/` (Gesamt = Luftaufnahme/Cover, oben = Draufsicht, Seite = Meerblick/Abschluss). Cover/Abschluss = Foto + Petrol-Verlaufsüberzug (Composite via Chromium), plus eigene „Referenzobjekt"-Folie mit oben+Seite.

**Render-Werkzeuge (Windows, verifiziert):**
- **HTML → PDF:** Headless-Chromium via `@playwright/test` (in `apps/web` installiert). Ein-Datei-Skript nach `apps/web/.render-pdf.mjs` legen (dort löst ESM `@playwright/test` auf), `page.pdf({format:"A4", printBackground:true, preferCSSPageSize:true})`. Nach Gebrauch löschen.
- **HTML → PNG (Assets/Composites):** analog `apps/web/.render-png.mjs`, `page.screenshot({omitBackground})`, `deviceScaleFactor:2`.
- **PPTX bauen:** `python-pptx` (1.0.2 vorhanden). Helper-Muster im Session-Scratchpad (`build_pptx.py`/`build_pitch.py`): `slide()`, `header()`, `ataberk_badge()`, `add_table()` mit Status-Pillen, `cards_2x2()`, `kpi_row()`, `callout()`, `footer()`. Vollflächen-Hintergründe als **JPG q88** einbetten (nicht PNG) → Deck 24 MB → 1,5 MB.
- **PPTX → PDF (zur Sicht-Prüfung):** PowerPoint-COM via PowerShell (`New-Object -ComObject PowerPoint.Application; $pres.SaveAs($pdf, 32)`; 32 = ppSaveAsPDF). Danach mit PyMuPDF (`fitz`) einzelne Seiten rastern und ansehen.
- **DOCX aus Markdown:** `python scripts/build-docx-from-md.py <md> --output <docx> --title "…"`.
- **Wichtig bei python-pptx-Strings:** deutsche Anführungszeichen „…" im Python-`"…"`-String terminieren ihn — Guillemets »…« verwenden.

**Governance:** `docs/README.md`, `docs/PROJECT-HANDBOOK.md` und `docs/requirements/option-3-ai-site-crm/README.md` verweisen bereits auf v1/v2. Bei Doku-Änderungen dort und in `AGENTS.md`/`CLAUDE.md` nachziehen. Regel bleibt: keine generierten QA-Artefakte im Repo; Markdown ist die editierbare Quelle, PDF/DOCX/PPTX sind Exporte.

---

## 10. Ergebnisse der Code-Tiefenanalyse (07.07.2026) — korrigierte Phasenwahrheit

14 unabhängige Bereichs-Audits gegen den echten Code (Migrationen 0000–0013, alle API-Routen, alle Dashboard-Seiten). Kernbefunde für die Weiterarbeit:

**Wiederkehrendes Muster („Foundation mit getrennten Schichten"):** Für Phase 10–14 existieren UI + API + DB-Tabellen, aber sie sind meist **nicht verbunden** — die Dashboard-Seiten importieren statische Arrays aus `lib/site-management-data.ts` statt ihre eigenen, bereits gebauten API-Routen zu fetchen; die per Migration 0007/0008 angelegten Tabellen (15 Stück, u. a. `reservation_availability_blocks`, `booking_readiness`, `turnover_work_items`, `message_threads`, `notification_rules`, `document_packets`, `integration_providers`, `ai_recommendations`) werden von keiner Codezeile gelesen/geschrieben. Einzige durchgängig echte Live-Schreibfunktion überall: `logClientAction` (Audit-Trail via RPC `log_client_action`).

**Echte funktionale Lücken (kein Schreibpfad vorhanden):**
- **Keine Reservierung/Buchung anlegen** (`/dashboard/calendar` zeigt 10 feste Demo-Buchungen; kein Formular/keine API) — von der Kundenanforderung explizit gefordert (Abschnitt 8/12.2). Auffälligste Lücke.
- **Keine Finanzbuchung erfassen** — `finance_ledger_entries` hat keinen Insert/Update im gesamten `apps/web`; das „Ledger" ist reiner Lese-/Reporting-Layer (Immutability-Trigger ist real). Automatische Kautions-/Schuldenverrechnung fehlt ebenfalls.
- **Kein Foto-/Video-Upload** für Service-Nachweise — Tabelle `media_reports` (Migration 0006) existiert mit RLS, aber keine UI/API; UI zeigt nur einen Zähler.
- **Kein Admin-Triage-Rückweg** für NLP-Registrierungen/Meldungen — Einreichung landet in `client_action_requests`, aber `materializeApprovedTicketRequest()` gibt für Nicht-Ticket-Typen `null` zurück (keine Profil-/Ticket-Materialisierung); keine filternde Dashboard-Ansicht.
- **Owner/Tenant-Scoping ist Demo-statisch:** hartkodierte Unit-Sets in `lib/role-scoped-views.ts` (z. B. `"A-001","A-054"`), nicht aus echten `unit_residents`-Beziehungen. Vor produktivem Mandanten-Scoping ersetzen. Teilweise sicherheitsrelevant (Offline-Sync-Freigabe nutzt es).
- **Toter Code:** `components/sync-badge.tsx` und `hooks/use-seed-data.ts` (+ `lib/seed-data.ts`, ein zweites, unverdrahtetes Lead/Deal-Modell) — nirgends importiert. `/dashboard/leads` zeigt trotz Namens keine echte Lead-Pipeline, sondern `residents` in CRM-Aufmachung.
- **PWA teilweise live:** Manifest (`app/manifest.ts`) + Service-Worker (`public/sw.js`) funktionieren bereits; Offline-Schreibsync und Push sind **nicht** umgesetzt.
- **Dokumenten-Upload** ist der am weitesten entwickelte Phase-11-Teil (echter Supabase-Storage-Pfad, Migration 0009), aber ohne `DOCUMENT_STORAGE_MODE=supabase` + Service-Role-Key im „Alles verwerfen"-Modus (meldet dennoch Erfolg).

**Doku-Korrekturen (bei nächster Pflege umsetzen):**
- `CLAUDE.md` §4 listet nur Migrationen 0000–0006 — real existieren (Stand 10.07.2026) **17 Dateien bis `0015`**. Nachtragen; ebenso `docs/PROJECT-HANDBOOK.md`, das noch „bis 0013" sagt.
- `Anforderungsdokument-1Cati.md` (v1) F-05/F-12 zitieren „Migration 0007" für Ledger-Immutability bzw. Security-Hardening — falsch: Immutability liegt in **0003**, Hardening in **0010/0011/0013**. In v2 bereits korrigiert.
- `CLAUDE.md` §3.5 (Locale-Switcher „manuelle URL-Konstruktion") und §3.7 (`sync-badge.tsx` „aktiv genutzt") stimmen nicht mit dem Code überein.
- **RBAC/RLS-Latenz:** `lib/rbac.ts` gibt `accountant` (Level 60) `finance:create/update/approve`, die generische RLS verlangt aber Level ≥ 70 → vor der ersten echten Buchhaltungs-Schreibfunktion angleichen (sonst 403 in Produktion).

### Stand-Update 10.07.2026 — was der parallele Strang seither geschlossen hat

**Geschlossen (nicht mehr als Lücke führen):**
- **Service-Order-/Workforce-Erzeugung bei Freigabe.** `materializeApprovedTicketRequest()` legt jetzt bei Manager-Freigabe real `service_ticket` + `service_order` + `workforce_task` + `notification` an (echte DB-Writes bei Live-Supabase). Der frühere Befund „bei Ticket-Freigabe entsteht kein `service_orders`-Datensatz" ist damit **erledigt**.
- **Dokumenten-Download.** Neue RBAC-gated Route mit 60-Sekunden-Signed-URL; `0014_default_company_context` behebt den fehlenden Company-Kontext, der Live-Uploads blockierte. Weiterhin **Opt-in** (`DOCUMENT_STORAGE_MODE=supabase`), Default bleibt Demo.

**Weiterhin offen (unverändert gültig):**
- Keine **Reservierung/Buchung anlegen** (auffälligste Lücke, vom Kunden explizit gefordert).
- Keine **Finanzbuchung erfassen**; keine automatische Kautions-/Schuldenverrechnung.
- Kein **Foto-/Video-Upload** für Service-Nachweise (`media_reports` weiterhin ohne UI/API) — nicht zu verwechseln mit der neuen Video-Library, die ist reines Marketing/Schulung.
- Kein **Admin-Triage-Rückweg** für NLP-Registrierungen/Meldungen.
- **Owner/Tenant-Scoping** weiterhin hartkodiert in `lib/role-scoped-views.ts`.
- **Push-Benachrichtigungen** weiterhin nicht umgesetzt (auch das Emergency-Routing versendet nichts — `notificationChannel` ist Metadaten).

Vollständige Detailtiefe je Funktion: `Anforderungsdokument-1Cati-v2.md` Kap. 7 (mit Datei-/Zeilenbelegen) und Kap. 9 (Abgleich Kundenanforderung). **Achtung:** Die Kundendokumente/Präsentationen aus §9 beschreiben den Stand vom 07.07.2026 und kennen „Cati Training", Security-Header und Emergency-Routing **noch nicht** — vor erneuter Kundenauslieferung aktualisieren.

---

## 11. Schnellreferenz

- Lokal starten: `cd apps/web && npm.cmd run dev -- -p 3000` → `http://localhost:3000/tr` (Access-Profile lokal automatisch an)
- Live-Produktion: `https://cati-blond.vercel.app` (Push auf `main` deployt)
- **Wichtige Routen:** `/tr` (Landing) · `/tr/videos` („Cati Training", öffentlich) · `/tr/new-level-premium` (öffentl. Registrierung/Meldung) · `/tr/pitch` (Demo-Center) · `/tr/login` · `/tr/dashboard`
- **Live-Statuschecks (read-only):** `curl -s .../api/access-profile` → Demo-Flag · `curl -sI .../tr | grep -i 'content-security\|x-frame'` → Security-Header
- Video-Pipeline (manuell, lokal): `pnpm --dir apps/web record:playlist` → `pnpm --dir apps/web upload:demo-videos` (braucht `SUPABASE_SERVICE_ROLE_KEY`)
- Verbindungscheck (read-only): kurzes Node-Skript mit `@supabase/supabase-js` (Service-Role) gegen Cloud + `fetch` gegen AI-Gateway — druckt nie Secret-Werte.
- Kanonische Doku: `CLAUDE.md`, `AGENTS.md`, `docs/PROJECT-HANDBOOK.md`, `docs/security/AI-SECURITY-OBSERVABILITY.md`, `docs/requirements/option-3-ai-site-crm/` (BRD/PRD/TRD/Security/QA/Vendor/Anforderungsdokument).
