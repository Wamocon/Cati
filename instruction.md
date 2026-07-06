# instruction.md — Arbeits- und Zustandsleitfaden für 1Çatı (für KI-Coding-Agenten)

> Zweck: Diese Datei ist der **Wiedereinstiegspunkt für zukünftige Phasen**. Beim Weiterarbeiten zuerst diese Datei lesen, dann `CLAUDE.md` (tiefe technische Referenz) und `docs/PROJECT-HANDBOOK.md` (Phasenwahrheit).
> Zuletzt aktualisiert: 06.07.2026 · Branch: `waleri-dev` (= `main`, siehe Deploy-Workflow) · Vertraulich.
> Reihenfolge bei Widersprüchen: aktueller **Code** > `docs/PROJECT-HANDBOOK.md` > `CLAUDE.md` > diese Datei.

---

## 1. Was ist der aktuelle Stand (Kurz)

1Çatı ist eine Property-Management-/Real-Estate-ERP-Plattform für Ataberk Estate (Referenzobjekt: New Level Premium, Avsallar/Alanya), umgesetzt von WAMOCON. Eine Next.js-App unter `apps/web` vereint öffentliche Produktseiten, Login/Demo, ein rollenbasiertes ERP-Dashboard und ein öffentliches New-Level-Premium-Modul (Registrierung/Meldung/Concierge).

**Live und funktionsfähig (Stand 06.07.2026):**
- **Supabase Cloud** ist angebunden und befüllt (769 units, Blocks/Floors, Tickets, Finanz-Ledger, Service-Orders, `client_action_requests` etc.). Die App liest/schreibt echte Cloud-Daten (`source: "supabase"`).
- **AI-Gateway** (OpenAI-kompatibel, „sokrates") ist live: interne CATI-KI (`/api/ai/chat`) und öffentliche Landing-KI (`/api/ai/public-chat`) liefern `source: "local-ai"`.
- **Vercel-Produktion** `https://cati-blond.vercel.app` deployt automatisch von `main`. Ein-Klick-Demo, echte Cloud-Daten und beide KIs laufen dort verifiziert.

**Phasen:** 1–9 als Fundament fertig; New-Level-Premium-Modul umgesetzt; 10–15 (Booking/Move-in, Kommunikation, Mobile-PWA, Integrationen, KI-Premium-Layer, Launch-Hardening) sind der weitere Weg. Details: `docs/PROJECT-HANDBOOK.md` §3.1 und `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati.md`.

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
ENABLE_ACCESS_PROFILES, CATI_ALLOW_REMOTE_ACCESS_PROFILES   # siehe Demo-Modell §4
```
Migrationen (`supabase/migrations/0000…0013`) entsprechen dem Cloud-Schema (in sync). Schema-Änderungen immer als neue nummerierte Migration + RLS in derselben PR.

---

## 3. Demo-/Zugangsmodell (wichtig)

Zwei Betriebsarten, gesteuert über `lib/auth.ts::isAccessProfileEnabled()` (muss synchron mit `proxy.ts::accessProfilesEnabledForRequest()` bleiben):

- **Echt-Auth (Default, sicher):** Ohne Flags → Dashboard verlangt echten Supabase-Login. Auf Vercel-Produktion standardmäßig gesperrt.
- **Ein-Klick-Demo:** `ENABLE_ACCESS_PROFILES=true` **und** `CATI_ALLOW_REMOTE_ACCESS_PROFILES=true` (Doppel-Opt-in) schalten den Demo-Zugang frei — auch auf Produktion/Remote (dokumentierte Ausnahme gemäß CLAUDE.md-Sicherheitsregel #5). Der Login-Button `data-testid="demo-full-access"` meldet ohne Passwort als `admin` an; das Repository nutzt dann die Service-Role, um echte Cloud-Daten zu lesen/schreiben.
- **Wieder sperren:** `CATI_ALLOW_REMOTE_ACCESS_PROFILES` entfernen → Produktion ist sofort wieder echt-Auth.

`getUserProfile()` (Server) und `proxy.ts` (Middleware-Guard für `/dashboard`) hängen an dieser Logik. Bei Änderungen beide Stellen synchron halten.

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
- **Theme/Sidebar:** ThemeProvider in `app/layout.tsx`; Dark-Variante in `globals.css` (`:where(.dark, .dark *)`); Sidebar sticky + intern scrollbar in `dashboard-sidebar.tsx`.

---

## 7. Hart erarbeitete Lehren / Gotchas

1. **Phantom-Dependencies brechen Vercel, nicht den lokalen Build.** Lokales `node_modules` kann Pakete enthalten, die nicht in `package.json` stehen (z. B. war `qrcode` so). Vercels sauberes `pnpm install` findet sie nicht → „Module not found". Regel: jedes `import "paket"` muss in `apps/web/package.json` deklariert **und** in `pnpm-lock.yaml` sein. Prüf-Einzeiler: externe Imports vs. deklarierte Deps abgleichen.
2. **Package-Manager ist pnpm** (`packageManager: pnpm@10.0.0`, `pnpm-lock.yaml`, Workspaces). Lockfile mit `pnpm install --lockfile-only` aktualisieren (nicht `npm install` — das pflegt die falsche Lockfile). corepack fehlt in der Bash; `npx --yes pnpm@10.0.0 …` funktioniert.
3. **Vercel-Diagnose ohne Dashboard-Zugriff:** temporär einen unbedenklichen Readout (Booleans + `VERCEL_GIT_COMMIT_SHA`, keine Secret-Werte) in eine GET-Route legen und die Live-URL pollen, um deployten Commit/Flags zu sehen — danach wieder entfernen.
4. **Produktions-Access-Profile-Sperre:** Auf Vercel ist `VERCEL_ENV=production`; nur das Doppel-Opt-in aus §3 hebt die Sperre auf.
5. **Merges nach `main`:** wegen des parallelen Strangs regelmäßig 3-Wege-Merge nötig; „theirs/ours"-Blends können Dateien durch Hunk-Interleaving zerbrechen — bei breiten Konflikten lieber die self-konsistente Version einer Seite pro Datei nehmen und danach mit tsc/build erzwingen.
6. **Secrets:** `.env*.local` sind gitignored; niemals Werte committen/loggen/nach außen senden. Vor Commits `git status` gegen `.env`/Temp-/`verify-*`-Dateien prüfen.

---

## 8. Nächste Phasen (Roadmap)

Reihenfolge und Akzeptanzkriterien: `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` + `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`.
- **Phase 10:** Booking/Move-in/Checkout (Reservierung, Kaution, Reinigung, Zugangsaktivierung, Schadensabwicklung).
- **Phase 11:** Kommunikation, Benachrichtigungen, Dokumente (mit Berechtigungsprüfung).
- **Phase 12:** Mobile-PWA-Hardening (Manifest, Offline, Push).
- **Phase 13:** Externe Integrationen (Payment/Bank/SMS/Access-Adapter, Retry-Queue, Health-Dashboard) — Vendor-Entscheidungen offen (`Third-Party-Integration-And-Vendor-Plan.md`).
- **Phase 14:** KI-Premium-Layer (grounded Assistant → Predictive Risk/Briefings → Advanced Analytics), Aktions-Automatisierung bleibt provider-/legal-gated.
- **Phase 15:** QA, Security/RLS-Review, Performance, UAT mit echten Daten, Training, Launch/Hypercare.

Offene, nicht durch Code lösbare Entscheidungen (Kunde/Legal/Vendor): `docs/PROJECT-HANDBOOK.md` §6 (Zahlungsanbieter, Zugangssystem, KBS-Rechtsfreigabe, Datenretention, Bankabgleich, native App vs. PWA, historische Migration, Produktions-UAT).

---

## 9. Schnellreferenz

- Lokal starten: `cd apps/web && npm.cmd run dev -- -p 3000` → `http://localhost:3000/tr`
- Live-Produktion: `https://cati-blond.vercel.app` (Push auf `main` deployt)
- Verbindungscheck (read-only): kurzes Node-Skript mit `@supabase/supabase-js` (Service-Role) gegen Cloud + `fetch` gegen AI-Gateway — druckt nie Secret-Werte.
- Kanonische Doku: `CLAUDE.md`, `AGENTS.md`, `docs/PROJECT-HANDBOOK.md`, `docs/requirements/option-3-ai-site-crm/` (BRD/PRD/TRD/Security/QA/Vendor/Anforderungsdokument).
