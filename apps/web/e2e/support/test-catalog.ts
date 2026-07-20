export const locales = ["tr", "en", "de", "ru"] as const

// UC22 controlled-QA contract. These sets deliberately do not overlap: role
// switching must never widen an owner's or tenant's verified unit boundary.
export const qaResidentUnitScope = {
  owner: ["A-001", "A-054", "D-023"],
  tenant: ["A-018", "A-023"],
} as const

export const accessRoles = [
  {
    role: "admin",
    label: "Admin",
    expectedLinks: [
      "/dashboard",
      "/dashboard/listings",
      "/dashboard/leads",
      "/dashboard/tickets",
      "/dashboard/calendar",
      "/dashboard/compliance",
      "/dashboard/finance",
      "/dashboard/documents",
      "/dashboard/reports",
      "/dashboard/communications",
      "/dashboard/offline",
      "/dashboard/users",
      "/dashboard/settings",
    ],
  },
  {
    role: "manager",
    label: "Manager",
    expectedLinks: [
      "/dashboard",
      "/dashboard/listings",
      "/dashboard/leads",
      "/dashboard/tickets",
      "/dashboard/calendar",
      "/dashboard/compliance",
      "/dashboard/finance",
      "/dashboard/documents",
      "/dashboard/reports",
      "/dashboard/communications",
      "/dashboard/offline",
      "/dashboard/users",
      "/dashboard/settings",
    ],
  },
  {
    role: "accountant",
    label: "Accountant",
    expectedLinks: ["/dashboard", "/dashboard/tickets", "/dashboard/finance", "/dashboard/documents", "/dashboard/reports", "/dashboard/communications"],
  },
  {
    role: "staff",
    label: "Staff",
    expectedLinks: ["/dashboard", "/dashboard/tickets", "/dashboard/calendar", "/dashboard/documents", "/dashboard/communications", "/dashboard/offline"],
  },
  {
    role: "owner",
    label: "Owner",
    expectedLinks: ["/dashboard", "/dashboard/tickets", "/dashboard/calendar", "/dashboard/finance", "/dashboard/documents", "/dashboard/communications", "/dashboard/offline"],
  },
  {
    role: "tenant",
    label: "Tenant",
    expectedLinks: ["/dashboard", "/dashboard/tickets", "/dashboard/calendar", "/dashboard/documents", "/dashboard/communications", "/dashboard/offline"],
  },
] as const

export const dashboardModules = [
  { path: "/dashboard", name: "Overview", expectedText: /New Level Premium|ERP|Operasyon|Dashboard/i },
  { path: "/dashboard/listings", name: "Unit Matrix", expectedText: /Daire|Unit|Matrix|Records/i },
  { path: "/dashboard/leads", name: "Leads", expectedText: /CRM|Lead|Sakin|Malik|Customer/i },
  { path: "/dashboard/tickets", name: "Tickets", expectedText: /Ticket|Servis|Task|SLA/i },
  { path: "/dashboard/calendar", name: "Reservation", expectedText: /Rezervasyon|Booking|Checkout|Calendar/i },
  { path: "/dashboard/compliance", name: "Access and Compliance", expectedText: /Eri|Compliance|Access|Uyum/i },
  { path: "/dashboard/finance", name: "Finance", expectedText: /Finans|Ledger|Payment|Aidat/i },
  { path: "/dashboard/documents", name: "Documents", expectedText: /Belge|Document|Upload|Vault/i },
  { path: "/dashboard/reports", name: "Reports", expectedText: /Rapor|Report|Analytics|AI/i },
  { path: "/dashboard/communications", name: "Communication", expectedText: /İletişim merkezi|İletişim|Ileti|Communication|Message|Notification/i },
  { path: "/dashboard/offline", name: "Offline Sync", expectedText: /Çevrimdışı|Eşitle|Offline|Sync|Queue|Senkron/i },
  { path: "/dashboard/users", name: "Users and Roles", expectedText: /User|Role|Kullan|Personel/i },
  { path: "/dashboard/settings", name: "Settings", expectedText: /Setting|Ayar|Platform|Provider/i },
] as const

export const apiContracts = [
  { path: "/api/openapi", method: "GET", role: null, expectedStatus: 200 },
  { path: "/api/access-profile", method: "GET", role: null, expectedStatus: 200 },
  { path: "/api/site-management/dashboard", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/role-dashboard", method: "GET", role: "owner", expectedStatus: 200 },
  { path: "/api/site-management/search?q=A-42&limit=5", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/phase-status", method: "GET", role: "manager", expectedStatus: 200 },
  // Note: a session-less request in the QA build resolves to the "manager" demo
  // profile (no-cookie default), so it returns 200, not 401. The genuine
  // unauthenticated 401 contract is exercised by the production access-profile
  // suite (access-profile-production-functional.spec.ts), where profiles are off.
  { path: "/api/site-management/phase4?limit=5", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/users?limit=5", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/tickets?limit=5", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/finance?limit=5", method: "GET", role: "accountant", expectedStatus: 200 },
  { path: "/api/site-management/payment-controls?limit=5", method: "GET", role: "accountant", expectedStatus: 200 },
  { path: "/api/site-management/booking-operations", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/communications", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/document-packets", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/document-uploads", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/integrations", method: "GET", role: "manager", expectedStatus: 200 },
  { path: "/api/site-management/offline-sync", method: "GET", role: "staff", expectedStatus: 200 },
  { path: "/api/ai/premium", method: "GET", role: "manager", expectedStatus: 200 },
] as const
