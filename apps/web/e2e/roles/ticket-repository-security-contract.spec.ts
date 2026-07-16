import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { serviceTickets } from "../../lib/site-management-data"
import {
  LOCAL_QA_STAFF_ASSIGNMENT_LABEL,
  visibleServiceTicketsForRole,
} from "../../lib/role-scoped-views"

const repositorySource = readFileSync(
  new URL("../../lib/site-management-repository.ts", import.meta.url),
  "utf8"
)
const routeSource = readFileSync(
  new URL("../../app/api/site-management/tickets/route.ts", import.meta.url),
  "utf8"
)

test.describe("Ticket repository security contract", () => {
  test("queue and record reads use the role-safe RPC with all scoping arguments", () => {
    expect(repositorySource).toContain(
      'supabase.rpc("read_service_ticket_queue_safe", {'
    )
    expect(repositorySource).toContain("p_limit: limit")
    expect(repositorySource).toContain("p_search: search")
    expect(repositorySource).toContain("p_identifier: identifier")

    expect(repositorySource).not.toContain("LEGACY_TICKET_QUEUE_PROJECTION")
    expect(repositorySource).not.toContain("HARDENED_TICKET_QUEUE_PROJECTION")
    expect(repositorySource).not.toContain("ticketQueueQuery(")
    expect(repositorySource).not.toContain("getTicketRowByIdentifier(")
  })

  test("P0 emergency mapping cannot become a finance or debt block", () => {
    expect(repositorySource).toMatch(
      /debtBlocked:\s*!emergency\s*&&\s*\(requiresFinanceApproval/
    )
    expect(repositorySource).toMatch(
      /const requiresFinanceApproval =\s*!emergency\s*&&\s*asBoolean\(/
    )
    expect(repositorySource).toMatch(
      /debtBlocked:\s*false,\s*paymentVerified:\s*!emergency,/
    )
    expect(repositorySource).toContain(
      '? "post_emergency_review"\n      : "no_charge"'
    )
    expect(repositorySource).toContain(
      'if (value === "post_emergency_review") return "post_emergency_review"'
    )
  })

  test("ticket creation requires a caller-stable idempotency key", () => {
    expect(routeSource).toContain(
      'request.headers.get("Idempotency-Key") ?? payload.idempotencyKey'
    )
    expect(routeSource).toContain(
      '"Idempotency-Key is required for ticket creation."'
    )
    expect(routeSource).not.toContain("randomUUID()")
  })

  test("local staff fallback exposes only the controlled actor's exact assignments", () => {
    const visible = visibleServiceTicketsForRole("staff", serviceTickets)

    expect(visible.length).toBeGreaterThan(0)
    expect(LOCAL_QA_STAFF_ASSIGNMENT_LABEL).toBe("Teknik - Ahmet")
    expect(
      visible.every(
        (ticket) => ticket.assignee === LOCAL_QA_STAFF_ASSIGNMENT_LABEL
      )
    ).toBe(true)
    expect(visible.some((ticket) => ticket.assignee === "Teknik - Burak")).toBe(false)
    expect(visible.length).toBeLessThan(
      serviceTickets.filter((ticket) => ticket.category !== "Tahsilat").length
    )
  })

  test("staff queue scopes before pagination and returns only linked assigned work", async ({
    page,
  }) => {
    const roleResponse = await page.request.post("/api/access-profile", {
      data: { role: "staff" },
    })
    expect(roleResponse.status()).toBe(200)

    const response = await page.request.get("/api/site-management/tickets?limit=100")
    expect(response.status()).toBe(200)
    const payload = (await response.json()) as {
      tickets: Array<{ id: string; assignee: string }>
      workforceTasks: Array<{ ticketId: string; assignee: string }>
    }

    expect(payload.tickets.length).toBeGreaterThan(0)
    expect(payload.workforceTasks.length).toBeGreaterThan(0)
    expect(
      payload.tickets.every(
        (ticket) => ticket.assignee === LOCAL_QA_STAFF_ASSIGNMENT_LABEL
      )
    ).toBe(true)
    const ticketIds = new Set(payload.tickets.map((ticket) => ticket.id))
    expect(
      payload.workforceTasks.every((task) => ticketIds.has(task.ticketId))
    ).toBe(true)
    expect(
      [...payload.tickets, ...payload.workforceTasks].some(
        (record) => record.assignee === "Teknik - Burak"
      )
    ).toBe(false)
  })

  test("live empty operation tables stay empty instead of generating demo records", () => {
    const queueStart = repositorySource.indexOf(
      "export async function getServiceTicketQueueData"
    )
    const queueEnd = repositorySource.indexOf(
      "export async function getTicketAvailableUnits",
      queueStart
    )
    const liveQueue = repositorySource.slice(queueStart, queueEnd)
    expect(queueStart).toBeGreaterThan(-1)
    expect(queueEnd).toBeGreaterThan(queueStart)
    expect(liveQueue).toContain("normalizeLiveServiceOperationRows(")
    expect(liveQueue).toContain("if (orderResponse.error) throw orderResponse.error")
    expect(liveQueue).toContain("if (taskResponse.error) throw taskResponse.error")
    expect(liveQueue).not.toContain("buildServiceOrdersFromTickets(")
    expect(liveQueue).not.toContain("buildWorkforceTasksFromTickets(")
    expect(liveQueue).not.toContain("ensureWorkforceTeamCoverage(")
  })

  test("resident API projection removes private ids, finance metadata, and internal operations", () => {
    for (const key of [
      "flatId",
      "requesterRole",
      "requesterProfileId",
      "assigneeProfileId",
      "debtBlocked",
      "paymentVerified",
      "estimatedCostTry",
      "paymentWorkflowStatus",
    ]) {
      expect(repositorySource).toContain(`delete result.${key}`)
    }
    expect(repositorySource).toContain(
      'return hasPrivateAssignment ? "Assigned responder" : "Operations queue"'
    )
    expect(routeSource).toContain("catalog: []")
    expect(routeSource).toContain("orders: []")
    expect(routeSource).toContain("workforceTasks: residentProofTaskProjection(data)")
    expect(routeSource).toContain('team: "Site management"')
    expect(routeSource).toContain('assignee: "Service team"')
    expect(routeSource).toContain("checklist: []")
    expect(routeSource).toContain('fieldNote: ""')
    expect(routeSource).not.toContain("workforceTasks: data.workforceTasks")
    expect(routeSource).toContain(
      "...(isClientRole(profile.role) ? {} : { idempotencyKey })"
    )
  })
})
