// Deterministic local-seed fixture for the activities / extra-services catalog.
//
// DEMO data only. Amounts are integer minor units (kuruş / cents); each activity
// carries a single currency and the app renders dual TRY / EUR at the display
// layer (lib/currency.ts) with no FX. This mirrors the migration 45 seed so the
// activities workspace works fully offline in access-profile / QA mode, the same
// way wallet-data.ts backs the wallet.

import type { NativeCurrency } from "@/lib/currency"

export type ActivityAgeBand = "all" | "under_18" | "adult"

export interface ActivitySeed {
  /** Stable local id used only in offline / QA mode. */
  id: string
  name: string
  description: string
  category: string
  ageBand: ActivityAgeBand
  priceCents: number
  currency: NativeCurrency
  capacity: number | null
  imageKey: string
}

// Kept in step with the CROSS JOIN VALUES list seeded in
// supabase/migrations/00000000000045_activities.sql.
export const ACTIVITIES_LOCAL_SEED: ActivitySeed[] = [
  {
    id: "activity-local-spa-hammam",
    name: "Spa & Hammam Session",
    description: "Private spa and hammam session at the wellness centre.",
    category: "wellness",
    ageBand: "adult",
    priceCents: 150_000,
    currency: "TRY",
    capacity: 2,
    imageKey: "activities/spa-hammam.jpg",
  },
  {
    id: "activity-local-beach-cabana",
    name: "Private Beach Cabana",
    description: "Reserved beachfront cabana with sunbeds and service for the day.",
    category: "leisure",
    ageBand: "all",
    priceCents: 250_000,
    currency: "TRY",
    capacity: 6,
    imageKey: "activities/beach-cabana.jpg",
  },
  {
    id: "activity-local-airport-transfer",
    name: "Airport Transfer",
    description: "Private door-to-door transfer to or from the airport.",
    category: "transport",
    ageBand: "all",
    priceCents: 90_000,
    currency: "TRY",
    capacity: 4,
    imageKey: "activities/airport-transfer.jpg",
  },
  {
    id: "activity-local-tennis-court",
    name: "Tennis Court (1 hour)",
    description: "One-hour floodlit tennis court reservation, racquets included.",
    category: "sports",
    ageBand: "adult",
    priceCents: 40_000,
    currency: "TRY",
    capacity: 4,
    imageKey: "activities/tennis-court.jpg",
  },
  {
    id: "activity-local-kids-club",
    name: "Kids Club (day pass)",
    description: "Supervised full-day kids club with games and craft sessions.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 30_000,
    currency: "TRY",
    capacity: 20,
    imageKey: "activities/kids-club.jpg",
  },
  {
    id: "activity-local-swimming-lesson",
    name: "Swimming Lesson",
    description: "Group swimming lesson for children with a certified instructor.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 25_000,
    currency: "TRY",
    capacity: 8,
    imageKey: "activities/swimming-lesson.jpg",
  },
  {
    id: "activity-local-art-workshop",
    name: "Art Workshop",
    description: "Guided art and painting workshop for children.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 18_000,
    currency: "TRY",
    capacity: 15,
    imageKey: "activities/art-workshop.jpg",
  },
  {
    id: "activity-local-mini-golf",
    name: "Mini-Golf Round",
    description: "Family-friendly mini-golf round on the garden course.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 12_000,
    currency: "TRY",
    capacity: 12,
    imageKey: "activities/mini-golf.jpg",
  },
]
