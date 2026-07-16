import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { setAccessRole } from "../support/flows"

const reportingApi = "/api/site-management/reports"

test.describe("Functional tests - persistent report artifacts", () => {
  test("authorized roles receive truth-labelled availability and field roles are denied", async ({ page }) => {
    for (const role of ["admin", "manager", "accountant"] as const) {
      await setAccessRole(page, role)
      const response = await page.request.get(reportingApi)
      expect(response.status(), `${role} report history`).toBe(200)
      expect(response.headers()["cache-control"]).toContain("no-store")
      const payload = await response.json()
      expect(payload).toMatchObject({
        source: "unavailable",
        mutationAvailable: false,
        unavailableReason: "real_auth_required",
      })
      expect(payload.requests).toEqual([])
      expect(payload.artifacts).toEqual([])
    }

    for (const role of ["staff", "owner", "tenant"] as const) {
      await setAccessRole(page, role)
      const response = await page.request.get(reportingApi)
      expect(response.status(), `${role} report denial`).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        code: "REPORTING_FORBIDDEN",
      })
    }
  })

  test("a local access profile cannot claim a durable export", async ({ page }) => {
    await setAccessRole(page, "admin")
    const response = await page.request.post(reportingApi, {
      headers: { "Idempotency-Key": "report-api-contract-0001" },
      data: {
        reportType: "unit_inventory",
        filters: {},
      },
    })

    expect(response.status()).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "REPORTING_REAL_AUTH_REQUIRED",
    })
  })

  test("If-Match reaches review authorization with ASCII ETag syntax", async ({ page }) => {
    await setAccessRole(page, "admin")
    const response = await page.request.patch(reportingApi, {
      headers: {
        "Idempotency-Key": "report-review-contract-0001",
        "If-Match": '"1"',
      },
      data: {
        artifactId: "11111111-1111-4111-8111-111111111111",
        decision: "approved",
        reason: "Human reviewer confirmed the grounded source summary.",
      },
    })
    expect(response.status()).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "REPORTING_REAL_AUTH_REQUIRED",
    })
  })

  test("the migration contract keeps CSV generation server-side and immutable", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000030_report_artifacts.sql"
      ),
      "utf8"
    )

    expect(migration).toContain("CREATE TABLE public.report_requests")
    expect(migration).toContain("CREATE TABLE public.report_artifacts")
    expect(migration).toContain("CREATE TABLE public.report_artifact_payloads")
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.report_csv_cell")
    expect(migration).toMatch(/\^\[\[:space:\]\]\*\[=\+\\-@\]/)
    expect(migration).toContain("extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256')")
    expect(migration).toContain("public.finance_ledger_entries")
    expect(migration).toContain("public.units")
    expect(migration).toContain("public.service_tickets")
    expect(migration).toContain("public.compliance_cases")
    expect(migration).toContain("Report artifacts and payloads are immutable")
    expect(migration).toContain("current_user_can_manage_site")
    expect(migration).toContain("reporting-v1")
    expect(migration).toContain("LOCK TABLE public.profile_site_assignments IN SHARE MODE")
    expect(migration).toContain("LOCK TABLE public.sites IN SHARE MODE")
    expect(migration).toContain("LOCK TABLE public.units IN SHARE MODE")
    expect(migration).toContain("LOCK TABLE public.finance_ledger_entries IN SHARE MODE")
    expect(migration).toContain("LOCK TABLE public.service_tickets IN SHARE MODE")
    expect(migration).toContain("LOCK TABLE public.compliance_cases IN SHARE MODE")
    expect(migration).toContain("v_snapshot := clock_timestamp()")
    expect(migration).toContain("Accountants may generate finance ledger reports only")
    expect(migration).toContain("length(btrim(COALESCE(p_reason, ''))) > 1000")
    expect(migration).toContain("UNIQUE (company_id, actor_profile_id, idempotency_key)")
    expect(migration).not.toContain("UNIQUE (company_id, idempotency_key)")
    expect(migration).toMatch(
      /WHERE id = v_review\.artifact_id[\s\S]*?public\.report_scope_allowed\([\s\S]*?RETURN jsonb_build_object\(\s*'replayed', TRUE/
    )
    expect(migration).toContain("AND s.company_id = v_company_id")
    expect(migration).toContain("AND u.company_id = v_company_id")
    expect(migration).toContain("AND u.site_id = l.site_id")
    expect(migration).toContain("AND u.site_id = t.site_id")
    expect(migration).toContain("AND u.site_id = c.site_id")
    expect(migration.match(/REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT/g)).toHaveLength(3)
    expect(migration).toMatch(
      /LOCK TABLE public\.units IN SHARE MODE;[\s\S]*?NOT EXISTS \([\s\S]*?u\.company_id = v_company_id[\s\S]*?u\.site_id = l\.site_id[\s\S]*?REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT/
    )
    expect(migration).not.toContain("Report generator is not initialized")
    expect(migration).not.toContain("internal persistent demo mode")
    expect(
      migration.match(/CREATE OR REPLACE FUNCTION public\.request_report_generation_v1/g)
    ).toHaveLength(1)

    const route = readFileSync(
      resolve(process.cwd(), "app/api/site-management/reports/route.ts"),
      "utf8"
    )
    expect(route).toContain("mutationOriginAllowed(request)")
    expect(route).toContain("MAX_MUTATION_BODY_BYTES = 32 * 1024")
    expect(route).toContain("request.body.getReader()")
    expect(route).toContain("await reader.cancel()")
    expect(route).not.toContain("await request.text()")
    expect(route).not.toContain("await request.json()")

    const repository = readFileSync(
      resolve(process.cwd(), "lib/reporting-repository.ts"),
      "utf8"
    )
    expect(repository).toContain('code === "23514"')
    expect(repository).toContain('"REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT"')
  })
})
