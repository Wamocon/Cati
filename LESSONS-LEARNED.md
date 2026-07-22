# LESSONS-LEARNED — for AI coding agents on this repo (1Çatı)

> Read this BEFORE working. These are concrete mistakes that were made (sometimes
> twice) and their correct fix. They are checked into git on purpose so every
> machine/session inherits them. Add to this file whenever a non-obvious mistake
> costs time. Referenced from `CLAUDE.md` §0. Last updated: 2026-07-22.

## Testing & gates

1. **NEVER pipe a test/build/gate command through `tail`/`head`/`grep` when you
   need its exit code.** The pipe's exit status is the LAST command's (`tail` = 0),
   which masks a FAILING suite. This was hit twice — a red Playwright run looked
   "green (exit 0)". Fix: run the command directly (or in `run_in_background`) and
   read the output FILE for the summary; or use `${PIPESTATUS[0]}`. Only pipe for a
   quick human-readable peek, never as the pass/fail signal.

2. **Run the FULL Playwright suite in production-server mode, not dev.** In dev
   mode the long run (~391 tests over ~17 min) exhausts the Next dev server's
   memory and it dies mid-run → hundreds of `ERR_CONNECTION_REFUSED` that look like
   failures but are an environment crash. Use `PLAYWRIGHT_SERVER_MODE=production`
   (memory-stable `next start`; needs a build). Use dev only for targeted specs.
   Nuance in this repo's `playwright.config.ts`: only the literal value
   `"production"` triggers `next start`; `"start"` falls through to dev.

3. **Kill stray servers on the e2e port before running.** Agents/prior runs leave
   a `next start`/`next dev` on port 3100, and the next run aborts with
   "port already used". Windows: `Get-NetTCPConnection -LocalPort 3100 -State Listen
   | Stop-Process -Id {OwningProcess} -Force`. Free 3100 (and 3200/3300) first.

4. **A green e2e suite does NOT validate SQL migrations or RLS.** The suite runs
   with Supabase env blanked (local-seed path). Validate migrations against real
   Postgres: `npx supabase db push --db-url "$SUPABASE_DB_URL"` (applies to cloud —
   this is also how they get deployed) or a local `supabase db reset` (needs Docker
   Desktop running; it was flaky/down here). `db push` is transactional per file, so
   a bad migration fails cleanly leaving the DB unchanged. See
   `migrations-not-validated-against-postgres` (memory) + CLAUDE.md.

5. **Screenshot the app across all roles — code review misses UX + real bugs.** A
   6-role Playwright screenshot walkthrough + vision analysis found leaks AND a
   genuine regression (an over-aggressive light-role declutter had hidden the
   resident work-proof panel) that typecheck/lint/e2e all passed.

6. **Intentional copy/UI changes cause e2e "assertion drift".** After changing a
   user-facing string, `grep e2e/` for it and update the assertion to the NEW
   correct text. Distinguish drift (update the test) from a real regression (fix the
   code) — read the failure, don't blanket-update tests to pass.

6a. **Never run a file-editing agent while a DEV-mode e2e is running.** The Next dev
   server hot-reloads on every file save, which recompiles mid-test and makes
   timing-sensitive tests (idempotency / exactly-once / AI-approval, especially on
   mobile-chrome) intermittently fail — a contaminated signal, not a real
   regression. Either sequence them (edit, THEN test) or run e2e in
   `PLAYWRIGHT_SERVER_MODE=production` (`next start` serves a frozen build and
   ignores file changes). The authoritative flake check is always a production-mode
   run with no concurrent edits.

## Supabase / Postgres / security (this is where real bugs hid)

7. **Supabase default privileges GRANT DML + function EXECUTE to `authenticated`.**
   A plain `REVOKE ALL … FROM PUBLIC, anon` does NOT remove the `authenticated`
   grant. So EVERY new table needs `REVOKE INSERT, UPDATE, DELETE … FROM
   authenticated` + `GRANT SELECT` (writes go through SECURITY DEFINER RPCs), and
   every INTERNAL SECURITY DEFINER helper/projection needs `REVOKE EXECUTE … FROM
   authenticated` — otherwise it's callable at `/rest/v1/rpc/...` and leaks
   cross-tenant PII/finance. Functions USED INSIDE an RLS policy must KEEP
   `authenticated` EXECUTE, and a table's RLS `self_read` policy needs the base
   `GRANT SELECT` or it silently returns nothing. The canonical pattern is migration
   `00000000000041_grant_hardening.sql` — mirror it in every new migration.

8. **SECURITY DEFINER functions: always `SET search_path = ''`, fully-qualify
   objects, and validate the caller (`auth.uid()` + authority) BEFORE mutating.**
   The RPC is the REAL security boundary — do not rely on the Next.js route's role
   gate or the frontend `rbac.ts` permission alone (both are bypassable via direct
   PostgREST). Example gap found: a "read-only wallet" child role was blocked in
   `rbac.ts` but the `wallet_topup` RPC had no role check, so a minor could self-fund
   via the raw RPC.

9. **Money/ledger correctness:** append-only double-entry + a cached balance; lock
   rows with `SELECT … FOR UPDATE` (order by id for multi-row to avoid deadlock),
   re-read balance, RAISE on insufficient; enforce idempotency with a UNIQUE key;
   corrections are compensating REVERSALS, never edits (matches the existing
   `prevent_posted_ledger_mutation`). Watch TOCTOU: lock the ORIGINAL row before an
   "already-refunded?" check, and add a partial unique index so a replay can't
   double-refund. Emit low-balance/notification events via `integration_outbox` in
   the SAME transaction (outbox pattern), never a dual-write.

10. **`supabase/seed.sql` drifts from migrations.** Migrations added NOT-NULL
    columns (bookable_resource_id, buffered windows, request_fingerprint) and seeded
    lookup tables from `companies` that don't exist until the seed runs — so a fresh
    `supabase start`/`db reset` failed. When fixing a seed insert, query
    `information_schema.columns WHERE is_nullable='NO' AND column_default IS NULL`
    for the WHOLE list at once instead of fixing one NOT-NULL error at a time.

11. **`profiles` has no `email` column** (email lives in `auth.users`). Queries that
    `select … email` from profiles crash with "column profiles.email does not
    exist". Fixed by migration 38 (add + backfill + trigger). Don't reintroduce it.

## RBAC / roles

12. **Adding a role or resource cascades.** The `Role`/`Resource` unions widen, so
    EVERY `Record<Role|Resource,…>` map breaks typecheck and must be extended
    (sidebar `iconsByResource`, dashboard `simulationActionIcons`, `ai-responses`
    labels, role display names, governance registry, ticket-transition matrix,
    communications scope, user-admin labels). AND keep the SQL role CHECK
    (`profiles.role`, `profile_role_assignments.role`) + `role_level`/`role_scope`
    helpers in sync (CLAUDE.md §10.3). Adding a role is never a one-file change.

13. **Model relationships with ReBAC, not more roles.** Parent↔child was built as a
    `guardianships` relationship table + `is_active_guardian_of()` helper reused in
    RLS — NOT by encoding the relationship into roles. Avoids role explosion.

14. **Check the business requirement against the permission matrix.** A role was
    given `activities:view` but not `create`, so it literally could not do the thing
    the spec required (book/use extras). Re-read the client's per-role bullet list
    against `rolePermissions`.

## Deployment / secrets / env

15. **"Data not real" on the deployed app is usually env/config, not code.** If a
    SQL error appears in the UI, Supabase IS connected (don't assume env is
    missing). The two real causes here: Vercel Supabase env vars, and cloud
    migrations not applied. Also: `NEXT_PUBLIC_*` vars are compiled into the PUBLIC
    browser bundle — only non-secrets may carry that prefix; the anon key is public
    by design (RLS protects it), the service-role key must stay un-prefixed/server-
    only.

16. **Don't hand-transcribe secrets/tokens.** A hand-typed anon-key char got
    corrupted (a Latin `F` became Cyrillic `Ф`). Use `cat`/exact copy, verify with a
    byte diff, and strip any UTF-8 BOM before writing an importable env file.

## Working style

17. **Delegate to focused sub-agents on DISJOINT file clusters; run gates + commit
    each increment.** Never run two agents editing the same file concurrently
    (typecheck races). For a large feature, go phase-by-phase, each validated +
    committed, so work is always saved and resumable across context/sessions.

18. **Don't re-read a file you just edited to "verify"** — Edit/Write already
    errors if the change didn't apply; the harness tracks file state.

19. **When a background task might be masking its result, read its OUTPUT FILE, not
    the notification's summary alone** (see #1).
