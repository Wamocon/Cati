// Deterministic local-seed fixture for the activities / extra-services catalog.
//
// DEMO data only. Amounts are integer minor units (kuruş / cents); each activity
// carries a single currency and the app renders dual TRY / EUR at the display
// layer (lib/currency.ts) with no FX. This mirrors the migration 45 seed so the
// activities workspace works fully offline in access-profile / QA mode, the same
// way wallet-data.ts backs the wallet.
//
// The human-readable `name`/`description` are seeded in Turkish (the app's lead
// language) to match the surrounding UI; the `id`, `category` enum, prices, age
// bands, capacity and `imageKey` mirror the CROSS JOIN VALUES list in
// supabase/migrations/00000000000045_activities.sql exactly (keys/enums are the
// join/lookup identity, only display copy is localized here).

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

// The id / category / price / ageBand / capacity / imageKey values are kept in
// step with the CROSS JOIN VALUES list seeded in
// supabase/migrations/00000000000045_activities.sql; only the display copy is
// localized to Turkish here.
export const ACTIVITIES_LOCAL_SEED: ActivitySeed[] = [
  {
    id: "activity-local-spa-hammam",
    name: "Spa & Hamam Seansı",
    description: "Sağlık merkezinde özel spa ve hamam seansı.",
    category: "wellness",
    ageBand: "adult",
    priceCents: 150_000,
    currency: "TRY",
    capacity: 2,
    imageKey: "activities/spa-hammam.jpg",
  },
  {
    id: "activity-local-beach-cabana",
    name: "Özel Plaj Kabini",
    description: "Şezlong ve servis dahil, gün boyu size ayrılmış sahil kabini.",
    category: "leisure",
    ageBand: "all",
    priceCents: 250_000,
    currency: "TRY",
    capacity: 6,
    imageKey: "activities/beach-cabana.jpg",
  },
  {
    id: "activity-local-airport-transfer",
    name: "Havaalanı Transferi",
    description: "Havaalanına gidiş-dönüş için özel kapıdan kapıya transfer.",
    category: "transport",
    ageBand: "all",
    priceCents: 90_000,
    currency: "TRY",
    capacity: 4,
    imageKey: "activities/airport-transfer.jpg",
  },
  {
    id: "activity-local-tennis-court",
    name: "Tenis Kortu (1 saat)",
    description: "Raketler dahil, bir saatlik ışıklandırılmış tenis kortu rezervasyonu.",
    category: "sports",
    ageBand: "adult",
    priceCents: 40_000,
    currency: "TRY",
    capacity: 4,
    imageKey: "activities/tennis-court.jpg",
  },
  {
    id: "activity-local-kids-club",
    name: "Çocuk Kulübü (günlük)",
    description: "Oyun ve el sanatları etkinlikleriyle gözetimli tam gün çocuk kulübü.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 30_000,
    currency: "TRY",
    capacity: 20,
    imageKey: "activities/kids-club.jpg",
  },
  {
    id: "activity-local-swimming-lesson",
    name: "Yüzme Dersi",
    description: "Sertifikalı eğitmen eşliğinde çocuklar için grup yüzme dersi.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 25_000,
    currency: "TRY",
    capacity: 8,
    imageKey: "activities/swimming-lesson.jpg",
  },
  {
    id: "activity-local-art-workshop",
    name: "Sanat Atölyesi",
    description: "Çocuklar için rehberli sanat ve resim atölyesi.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 18_000,
    currency: "TRY",
    capacity: 15,
    imageKey: "activities/art-workshop.jpg",
  },
  {
    id: "activity-local-mini-golf",
    name: "Mini Golf Turu",
    description: "Bahçe parkurunda aileye uygun mini golf turu.",
    category: "kids",
    ageBand: "under_18",
    priceCents: 12_000,
    currency: "TRY",
    capacity: 12,
    imageKey: "activities/mini-golf.jpg",
  },
]
