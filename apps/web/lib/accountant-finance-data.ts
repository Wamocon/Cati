// Deterministic local-seed fixtures for the accountant finance subsystem.
//
// These populate the accounting workspace fully without a database (provider
// invoices, credit balances from providers and every role, bank statements and
// a few existing offsets). Amounts are integer minor units (kurus/cents) and
// intentionally mix Turkish Lira and Euro. Blocks follow the A-G site layout.

export const ACCOUNTANT_FINANCE_BLOCKS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
] as const

export type AccountantFinanceBlock = (typeof ACCOUNTANT_FINANCE_BLOCKS)[number]

export type CreditSubjectType =
  | "service_provider"
  | "owner"
  | "tenant"
  | "manager"
  | "accountant"
  | "staff"
  | "admin"
  | "company"

// Fixed display order for the by-role breakdown so the table is stable.
export const CREDIT_SUBJECT_ORDER: CreditSubjectType[] = [
  "service_provider",
  "owner",
  "tenant",
  "manager",
  "accountant",
  "staff",
  "admin",
  "company",
]

export type FinanceCurrency = "TRY" | "EUR"

export type InvoiceStatus = "open" | "partially_offset" | "paid" | "void"

export interface ServiceProviderInvoiceSeed {
  id: string
  providerName: string
  vendorId: string | null
  block: AccountantFinanceBlock | null
  invoiceNo: string
  amountCents: number
  /** Cents already offset by baked-in historical offsets. */
  offsetCents: number
  currency: FinanceCurrency
  status: InvoiceStatus
  issuedAt: string
  dueAt: string | null
  notes: string | null
}

export interface CreditBalanceSeed {
  id: string
  subjectType: CreditSubjectType
  subjectRef: string
  providerName: string | null
  block: AccountantFinanceBlock | null
  amountCents: number
  currency: FinanceCurrency
}

export interface CostEntrySeed {
  id: string
  block: AccountantFinanceBlock | null
  role: CreditSubjectType
  category: string
  amountCents: number
  currency: FinanceCurrency
  description: string
}

export interface BankStatementLineSeed {
  id: string
  bookedAt: string
  description: string
  amountCents: number
  direction: "credit" | "debit"
}

export interface BankStatementSeed {
  id: string
  statementDate: string
  bankName: string
  reference: string
  openingBalanceCents: number
  closingBalanceCents: number
  currency: FinanceCurrency
  lines: BankStatementLineSeed[]
}

export interface InvoiceCreditOffsetSeed {
  id: string
  invoiceId: string
  invoiceNo: string
  creditBalanceId: string
  amountCents: number
  currency: FinanceCurrency
  reason: string | null
  createdAt: string
}

// Service providers referenced by the seed invoices and provider credits.
export const accountantFinanceProviders = [
  { id: "p-akdeniz", name: "Akdeniz Temizlik Hizmetleri", category: "cleaning" },
  { id: "p-mavi", name: "Mavi Havuz ve Bakim", category: "pool" },
  { id: "p-anadolu", name: "Anadolu Asansor Servis", category: "elevator" },
  { id: "p-gunes", name: "Gunes Elektrik ve Enerji", category: "electrical" },
  { id: "p-deniz", name: "Deniz Guvenlik Sistemleri", category: "security" },
  { id: "p-bahce", name: "Bahce Peyzaj Ltd.", category: "landscaping" },
] as const

// Invoices span blocks A-G and several providers. offset_cents and status are
// pre-baked so the two historical offsets below are internally consistent.
export const serviceProviderInvoicesSeed: ServiceProviderInvoiceSeed[] = [
  { id: "spi-0142", providerName: "Akdeniz Temizlik Hizmetleri", vendorId: "p-akdeniz", block: "A", invoiceNo: "INV-2026-0142", amountCents: 4_820_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-04", dueAt: "2026-07-04", notes: "Blok A ortak alan temizligi, Haziran." },
  { id: "spi-0143", providerName: "Mavi Havuz ve Bakim", vendorId: "p-mavi", block: "B", invoiceNo: "INV-2026-0143", amountCents: 9_650_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-06", dueAt: "2026-07-06", notes: "Havuz kimyasal ve bakim." },
  { id: "spi-0144", providerName: "Anadolu Asansor Servis", vendorId: "p-anadolu", block: "C", invoiceNo: "INV-2026-0144", amountCents: 320_000, offsetCents: 0, currency: "EUR", status: "open", issuedAt: "2026-06-08", dueAt: "2026-07-08", notes: "Asansor yillik bakim sozlesmesi." },
  { id: "spi-0145", providerName: "Gunes Elektrik ve Enerji", vendorId: "p-gunes", block: "D", invoiceNo: "INV-2026-0145", amountCents: 12_840_000, offsetCents: 4_000_000, currency: "TRY", status: "partially_offset", issuedAt: "2026-06-09", dueAt: "2026-07-09", notes: "Trafo ve aydinlatma yenileme." },
  { id: "spi-0146", providerName: "Deniz Guvenlik Sistemleri", vendorId: "p-deniz", block: "E", invoiceNo: "INV-2026-0146", amountCents: 7_490_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-11", dueAt: "2026-07-11", notes: "Kamera ve devriye hizmeti." },
  { id: "spi-0147", providerName: "Bahce Peyzaj Ltd.", vendorId: "p-bahce", block: "F", invoiceNo: "INV-2026-0147", amountCents: 4_130_000, offsetCents: 4_130_000, currency: "TRY", status: "paid", issuedAt: "2026-06-12", dueAt: "2026-07-12", notes: "Peyzaj ve sulama bakimi." },
  { id: "spi-0148", providerName: "Akdeniz Temizlik Hizmetleri", vendorId: "p-akdeniz", block: "G", invoiceNo: "INV-2026-0148", amountCents: 185_000, offsetCents: 0, currency: "EUR", status: "open", issuedAt: "2026-06-14", dueAt: "2026-07-14", notes: "Blok G derin temizlik." },
  { id: "spi-0149", providerName: "Mavi Havuz ve Bakim", vendorId: "p-mavi", block: "A", invoiceNo: "INV-2026-0149", amountCents: 6_370_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-15", dueAt: "2026-07-15", notes: "Cocuk havuzu pompa degisimi." },
  { id: "spi-0150", providerName: "Gunes Elektrik ve Enerji", vendorId: "p-gunes", block: "B", invoiceNo: "INV-2026-0150", amountCents: 15_200_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-17", dueAt: "2026-07-17", notes: "Jenerator bakim ve yakit." },
  { id: "spi-0151", providerName: "Anadolu Asansor Servis", vendorId: "p-anadolu", block: "D", invoiceNo: "INV-2026-0151", amountCents: 540_000, offsetCents: 0, currency: "EUR", status: "open", issuedAt: "2026-06-18", dueAt: "2026-07-18", notes: "Yedek parca ve acil cagri." },
  { id: "spi-0152", providerName: "Deniz Guvenlik Sistemleri", vendorId: "p-deniz", block: "E", invoiceNo: "INV-2026-0152", amountCents: 5_820_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-20", dueAt: "2026-07-20", notes: "Bariyer ve gecis kontrol." },
  { id: "spi-0153", providerName: "Bahce Peyzaj Ltd.", vendorId: "p-bahce", block: "C", invoiceNo: "INV-2026-0153", amountCents: 3_390_000, offsetCents: 0, currency: "TRY", status: "open", issuedAt: "2026-06-21", dueAt: "2026-07-21", notes: "Agac budama ve gubreleme." },
  { id: "spi-0154", providerName: "Akdeniz Temizlik Hizmetleri", vendorId: "p-akdeniz", block: "F", invoiceNo: "INV-2026-0154", amountCents: 4_760_000, offsetCents: 0, currency: "TRY", status: "void", issuedAt: "2026-06-22", dueAt: "2026-07-22", notes: "Hatali kesilen fatura, iptal edildi." },
  { id: "spi-0155", providerName: "Mavi Havuz ve Bakim", vendorId: "p-mavi", block: "G", invoiceNo: "INV-2026-0155", amountCents: 260_000, offsetCents: 0, currency: "EUR", status: "open", issuedAt: "2026-06-24", dueAt: "2026-07-24", notes: "Sezon acilis havuz hazirligi." },
]

// Credit balances: from providers (service_provider) and for every role.
// Provider credits already reflect the two baked-in historical offsets.
export const creditBalancesSeed: CreditBalanceSeed[] = [
  { id: "cb-prov-akdeniz", subjectType: "service_provider", subjectRef: "Akdeniz Temizlik Hizmetleri", providerName: "Akdeniz Temizlik Hizmetleri", block: "A", amountCents: 6_200_000, currency: "TRY" },
  { id: "cb-prov-mavi", subjectType: "service_provider", subjectRef: "Mavi Havuz ve Bakim", providerName: "Mavi Havuz ve Bakim", block: "B", amountCents: 3_850_000, currency: "TRY" },
  { id: "cb-prov-anadolu", subjectType: "service_provider", subjectRef: "Anadolu Asansor Servis", providerName: "Anadolu Asansor Servis", block: null, amountCents: 210_000, currency: "EUR" },
  { id: "cb-prov-gunes", subjectType: "service_provider", subjectRef: "Gunes Elektrik ve Enerji", providerName: "Gunes Elektrik ve Enerji", block: "D", amountCents: 8_000_000, currency: "TRY" },
  { id: "cb-prov-deniz", subjectType: "service_provider", subjectRef: "Deniz Guvenlik Sistemleri", providerName: "Deniz Guvenlik Sistemleri", block: "E", amountCents: 5_400_000, currency: "TRY" },
  { id: "cb-prov-bahce", subjectType: "service_provider", subjectRef: "Bahce Peyzaj Ltd.", providerName: "Bahce Peyzaj Ltd.", block: "F", amountCents: 4_870_000, currency: "TRY" },
  { id: "cb-owner-1", subjectType: "owner", subjectRef: "Malik avans bakiyesi", providerName: null, block: "A", amountCents: 1_840_000, currency: "TRY" },
  { id: "cb-owner-2", subjectType: "owner", subjectRef: "Malik fazla odeme", providerName: null, block: "C", amountCents: 975_000, currency: "TRY" },
  { id: "cb-tenant-1", subjectType: "tenant", subjectRef: "Kiraci depozito alacagi", providerName: null, block: "B", amountCents: 720_000, currency: "TRY" },
  { id: "cb-tenant-2", subjectType: "tenant", subjectRef: "Kiraci iade alacagi", providerName: null, block: "E", amountCents: 32_000, currency: "EUR" },
  { id: "cb-manager-1", subjectType: "manager", subjectRef: "Site kasa avansi", providerName: null, block: null, amountCents: 560_000, currency: "TRY" },
  { id: "cb-accountant-1", subjectType: "accountant", subjectRef: "Mutabakat bekleyen bakiye", providerName: null, block: null, amountCents: 1_230_000, currency: "TRY" },
  { id: "cb-staff-1", subjectType: "staff", subjectRef: "Saha gider avansi", providerName: null, block: null, amountCents: 340_000, currency: "TRY" },
  { id: "cb-admin-1", subjectType: "admin", subjectRef: "Organizasyon rezerv bakiyesi", providerName: null, block: null, amountCents: 450_000, currency: "EUR" },
  { id: "cb-company-1", subjectType: "company", subjectRef: "Sirket genel alacak", providerName: null, block: null, amountCents: 2_490_000, currency: "TRY" },
]

// Operational cost entries (ledger-like) attributed to a block and a role, on
// top of the provider-invoice costs derived from the invoices above. Together
// they drive the by-block and by-role cost breakdowns.
export const costEntriesSeed: CostEntrySeed[] = [
  { id: "ce-owner-a", block: "A", role: "owner", category: "common_area_repair", amountCents: 2_150_000, currency: "TRY", description: "Blok A ortak alan onarimi." },
  { id: "ce-tenant-b", block: "B", role: "tenant", category: "utility_recharge", amountCents: 1_280_000, currency: "TRY", description: "Blok B ortak sayac yansitmasi." },
  { id: "ce-manager-c", block: "C", role: "manager", category: "site_operations", amountCents: 940_000, currency: "TRY", description: "Blok C saha operasyon gideri." },
  { id: "ce-staff-d", block: "D", role: "staff", category: "field_materials", amountCents: 660_000, currency: "TRY", description: "Blok D saha malzeme gideri." },
  { id: "ce-company-e", block: "E", role: "company", category: "insurance", amountCents: 3_100_000, currency: "TRY", description: "Blok E sigorta primi." },
  { id: "ce-owner-f", block: "F", role: "owner", category: "facade_maintenance", amountCents: 140_000, currency: "EUR", description: "Blok F cephe bakimi." },
  { id: "ce-company-g", block: "G", role: "company", category: "security_ops", amountCents: 1_760_000, currency: "TRY", description: "Blok G guvenlik operasyonu." },
  { id: "ce-accountant", block: null, role: "accountant", category: "audit_fee", amountCents: 820_000, currency: "TRY", description: "Bagimsiz denetim ucreti." },
  { id: "ce-admin", block: null, role: "admin", category: "licensing", amountCents: 90_000, currency: "EUR", description: "Yazilim lisans gideri." },
]

// A couple of existing (historical) offsets, consistent with the pre-baked
// offset_cents on invoices spi-0145 and spi-0147.
export const invoiceCreditOffsetsSeed: InvoiceCreditOffsetSeed[] = [
  { id: "ico-seed-1", invoiceId: "spi-0145", invoiceNo: "INV-2026-0145", creditBalanceId: "cb-prov-gunes", amountCents: 4_000_000, currency: "TRY", reason: "Saglayici avans bakiyesi elektrik faturasina mahsup edildi.", createdAt: "2026-06-16T10:20:00+03:00" },
  { id: "ico-seed-2", invoiceId: "spi-0147", invoiceNo: "INV-2026-0147", creditBalanceId: "cb-prov-bahce", amountCents: 4_130_000, currency: "TRY", reason: "Peyzaj faturasi saglayici alacagindan tam kapatildi.", createdAt: "2026-06-18T14:05:00+03:00" },
]

export const bankStatementsSeed: BankStatementSeed[] = [
  {
    id: "bs-zb-062026",
    statementDate: "2026-06-30",
    bankName: "Ziraat Bankasi",
    reference: "ZB-STMT-062026",
    openingBalanceCents: 15_400_000,
    closingBalanceCents: 18_250_000,
    currency: "TRY",
    lines: [
      { id: "bl-zb-1", bookedAt: "2026-06-05", description: "Saglayici odemesi - Akdeniz Temizlik", amountCents: 4_820_000, direction: "debit" },
      { id: "bl-zb-2", bookedAt: "2026-06-12", description: "Aidat tahsilati - Blok A", amountCents: 6_300_000, direction: "credit" },
      { id: "bl-zb-3", bookedAt: "2026-06-20", description: "Havuz bakim odemesi - Mavi Havuz", amountCents: 3_850_000, direction: "debit" },
      { id: "bl-zb-4", bookedAt: "2026-06-28", description: "Kira geliri - Blok B", amountCents: 4_220_000, direction: "credit" },
    ],
  },
  {
    id: "bs-gb-062026",
    statementDate: "2026-06-30",
    bankName: "Garanti BBVA",
    reference: "GB-EUR-062026",
    openingBalanceCents: 1_240_000,
    closingBalanceCents: 1_608_000,
    currency: "EUR",
    lines: [
      { id: "bl-gb-1", bookedAt: "2026-06-08", description: "Asansor servisi - Anadolu Asansor", amountCents: 320_000, direction: "debit" },
      { id: "bl-gb-2", bookedAt: "2026-06-18", description: "Malik fazla odeme iadesi", amountCents: 32_000, direction: "debit" },
      { id: "bl-gb-3", bookedAt: "2026-06-25", description: "EUR satis depozitosu - Blok G", amountCents: 720_000, direction: "credit" },
    ],
  },
  {
    id: "bs-zb-052026",
    statementDate: "2026-05-31",
    bankName: "Ziraat Bankasi",
    reference: "ZB-STMT-052026",
    openingBalanceCents: 12_900_000,
    closingBalanceCents: 15_400_000,
    currency: "TRY",
    lines: [
      { id: "bl-zb5-1", bookedAt: "2026-05-10", description: "Guvenlik hizmeti - Deniz Guvenlik", amountCents: 5_400_000, direction: "debit" },
      { id: "bl-zb5-2", bookedAt: "2026-05-22", description: "Aidat tahsilati - Blok D", amountCents: 7_900_000, direction: "credit" },
    ],
  },
]
