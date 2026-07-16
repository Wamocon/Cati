import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"
import { qaResidentUnitScope } from "../support/test-catalog"

type FocusedRole = "accountant" | "staff" | "owner" | "tenant"

const expectedScope = {
  accountant: "company-finance",
  staff: "assigned-work",
  owner: "verified-owner-units",
  tenant: "verified-tenant-units",
} as const

const allowedMetrics: Record<FocusedRole, Set<string>> = {
  accountant: new Set([
    "openBalance",
    "overdueBalance",
    "openEntries",
    "overdueEntries",
    "postedEntries",
  ]),
  staff: new Set([
    "assignedTasks",
    "overdueTasks",
    "openTickets",
    "urgentTickets",
  ]),
  owner: new Set([
    "scopedUnits",
    "openBalance",
    "openTickets",
    "activeReservations",
    "documents",
  ]),
  tenant: new Set([
    "scopedUnits",
    "openTickets",
    "activeReservations",
    "documents",
  ]),
}

test.describe("role dashboard API boundaries", () => {
  for (const role of ["accountant", "staff", "owner", "tenant"] as const) {
    test(`${role} receives only its authorized dashboard projection`, async ({
      page,
    }) => {
      await openDashboardAs(page, role)

      const response = await page.request.get(
        "/api/site-management/role-dashboard"
      )
      expect(response.status()).toBe(200)
      expect(response.headers()["cache-control"]).toContain("no-store")
      expect(response.headers().vary).toContain("Cookie")

      const snapshot = await response.json()
      expect(snapshot.contractVersion).toBe("role-dashboard.v1")
      expect(snapshot.role).toBe(role)
      expect(snapshot.scope).toBe(expectedScope[role])
      expect(Number.isNaN(Date.parse(snapshot.generatedAt))).toBeFalsy()
      expect(snapshot.metrics.length).toBeGreaterThan(0)
      expect(
        snapshot.metrics.every((metric: { key: string }) =>
          allowedMetrics[role].has(metric.key)
        )
      ).toBeTruthy()

      if (role === "accountant") {
        expect(snapshot.realtimeTables).toEqual(["finance_ledger_entries"])
        expect(snapshot.units).toEqual([])
        expect(
          snapshot.priorityItems.every(
            (item: { kind: string }) => item.kind === "finance"
          )
        ).toBeTruthy()
      }

      if (role === "staff") {
        expect(snapshot.realtimeTables).not.toContain("finance_ledger_entries")
        expect(snapshot.realtimeTables).not.toContain("documents")
        expect(snapshot.units).toEqual([])
        expect(
          snapshot.priorityItems.every(
            (item: { kind: string }) => item.kind === "task"
          )
        ).toBeTruthy()
      }

      if (role === "owner" || role === "tenant") {
        const allowedUnitNos = new Set<string>(qaResidentUnitScope[role])
        expect(snapshot.source).toBe("local-seed")
        expect(
          snapshot.units.map((unit: { unitNo: string }) => unit.unitNo).sort()
        ).toEqual([...qaResidentUnitScope[role]].sort())
        expect(
          snapshot.priorityItems.every(
            (item: { unitNo: string | null }) =>
              item.unitNo !== null && allowedUnitNos.has(item.unitNo)
          )
        ).toBeTruthy()
        expect(
          snapshot.priorityItems.some(
            (item: { kind: string }) => item.kind === "finance"
          )
        ).toBeFalsy()
        expect(
          snapshot.metrics.some(
            (metric: { key: string }) => metric.key === "documents"
          )
        ).toBeTruthy()
        expect(snapshot.realtimeTables).not.toContain("finance_ledger_entries")
      }

      if (role === "tenant") {
        expect(snapshot.realtimeTables).not.toContain("finance_ledger_entries")
        expect(
          snapshot.metrics.some(
            (metric: { key: string }) => metric.key === "openBalance"
          )
        ).toBeFalsy()
      }
    })
  }

  for (const role of ["admin", "manager"] as const) {
    test(`${role} is directed to the global operations contract`, async ({
      page,
    }) => {
      await openDashboardAs(page, role)
      const response = await page.request.get(
        "/api/site-management/role-dashboard"
      )
      expect(response.status()).toBe(403)
    })
  }
})
