import type { Resource } from "./rbac"

export interface DashboardRoute {
  href: string
  resource: Resource
}

export const dashboardRoutes: DashboardRoute[] = [
  { href: "/dashboard", resource: "dashboard" },
  { href: "/dashboard/listings", resource: "listings" },
  { href: "/dashboard/leads", resource: "leads" },
  { href: "/dashboard/tickets", resource: "tickets" },
  { href: "/dashboard/calendar", resource: "calendar" },
  { href: "/dashboard/compliance", resource: "eids_compliance" },
  { href: "/dashboard/finance", resource: "finance" },
  { href: "/dashboard/documents", resource: "documents" },
  { href: "/dashboard/reports", resource: "reports" },
  { href: "/dashboard/communications", resource: "communications" },
  { href: "/dashboard/users", resource: "users" },
  { href: "/dashboard/settings", resource: "settings" },
]

export function resourceForDashboardPath(pathname: string): Resource {
  const normalized = pathname.replace(/\/$/, "") || "/dashboard"
  const route = dashboardRoutes
    .filter((item) => item.href !== "/dashboard")
    .find((item) => normalized === item.href || normalized.startsWith(`${item.href}/`))

  return route?.resource ?? "dashboard"
}
