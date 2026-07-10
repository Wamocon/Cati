export type TicketRoute = { assignee: string; role: "manager" | "staff"; reason: string; emergency: boolean }

const routes: Array<{ pattern: RegExp; route: TicketRoute }> = [
  { pattern: /gas|smoke|fire|yangın|duman|gaz|life.?safety/i, route: { assignee: "Guvenlik - Selim", role: "manager", reason: "Life-safety escalation", emergency: true } },
  { pattern: /elevator|asansör|asansor/i, route: { assignee: "Teknik - Ahmet", role: "staff", reason: "Elevator emergency route", emergency: true } },
  { pattern: /electric|elektrik|spark|kıvılcım|kivilcim/i, route: { assignee: "Teknik - Burak", role: "staff", reason: "Electrical safety route", emergency: true } },
  { pattern: /lock|door|access|kapı|kapi|bariyer/i, route: { assignee: "Guvenlik - Selim", role: "staff", reason: "Access and security route", emergency: true } },
  { pattern: /clean|temiz/i, route: { assignee: "Temizlik - Esra", role: "staff", reason: "Cleaning route", emergency: false } },
]

export function resolveTicketRoute(input: { title: string; description?: string | null; category?: string; priority?: string }): TicketRoute {
  const content = `${input.title} ${input.description ?? ""} ${input.category ?? ""}`
  const matched = routes.find(({ pattern }) => pattern.test(content))
  if (matched) return matched.route
  if (input.category === "security" || input.priority === "urgent") return { assignee: "Operations queue", role: "manager", reason: "Urgent operations review", emergency: input.priority === "urgent" }
  return { assignee: "Operations queue", role: "manager", reason: "Standard operations triage", emergency: false }
}

export const ticketAssigneeOptions = ["Operations queue", "Teknik - Ahmet", "Teknik - Burak", "Guvenlik - Selim", "Temizlik - Esra", "Operasyon - Can"] as const

export function isTicketAssignee(value: string | null): value is (typeof ticketAssigneeOptions)[number] {
  return Boolean(value && ticketAssigneeOptions.includes(value as (typeof ticketAssigneeOptions)[number]))
}
