// Deterministic local-seed fixture for the service-provider (vendor) invoicing
// workspace.
//
// DEMO data only. Amounts are integer minor units (kuruş / cents); each figure is
// rendered dual TRY / EUR at the display layer (lib/currency.ts) with no FX. This
// fixture lets the vendor workspace work fully offline in access-profile / QA
// mode, mirroring wallet-data.ts / activities-data.ts.
//
// Two lifecycles live on an invoice and must not be confused:
//   * accountingStatus  - the accountant offset engine's status
//                         (open/partially_offset/paid/void). Read-only here.
//   * submissionStatus  - the vendor workflow (draft/submitted/in_review/
//                         approved/declined).

import type { NativeCurrency } from "@/lib/currency"

export type VendorSubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "declined"

export type VendorInvoiceAccountingStatus =
  | "open"
  | "partially_offset"
  | "paid"
  | "void"

export interface VendorJobSeed {
  /** Stable local id used only in offline / QA mode. */
  id: string
  orderNo: string
  title: string
  status: string
  quotedPriceCents: number
  currency: NativeCurrency
  requestedForAt: string | null
}

export interface VendorInvoiceLineSeed {
  id: string
  description: string
  quantity: number
  unitPriceCents: number
  /** Percentage rate (0-100), e.g. 20 for Turkish KDV. */
  taxRate: number
}

export interface VendorInvoiceSeed {
  id: string
  invoiceNo: string
  submissionStatus: VendorSubmissionStatus
  accountingStatus: VendorInvoiceAccountingStatus
  currency: NativeCurrency
  issuedAt: string | null
  dueAt: string | null
  externalRef: string | null
  serviceOrderId: string | null
  lines: VendorInvoiceLineSeed[]
}

export interface VendorLocalSeed {
  vendorName: string
  jobs: VendorJobSeed[]
  invoices: VendorInvoiceSeed[]
}

export const VENDOR_LOCAL_SEED: VendorLocalSeed = {
  vendorName: "Akdeniz Teknik Servis",
  jobs: [
    {
      id: "vendor-job-plumbing",
      orderNo: "ORD-2402",
      title: "Daire içi su kaçağı — acil tesisat müdahalesi",
      status: "assigned",
      quotedPriceCents: 1_240_000,
      currency: "TRY",
      requestedForAt: "2026-07-20T09:00:00.000Z",
    },
    {
      id: "vendor-job-hvac",
      orderNo: "ORD-2403",
      title: "Klima drenaj kontrolü ve bakım",
      status: "in_progress",
      quotedPriceCents: 210_000,
      currency: "TRY",
      requestedForAt: "2026-07-21T13:00:00.000Z",
    },
  ],
  invoices: [
    {
      id: "vendor-invoice-draft-2401",
      invoiceNo: "SPV-2401",
      submissionStatus: "draft",
      accountingStatus: "open",
      currency: "TRY",
      issuedAt: "2026-07-19",
      dueAt: "2026-08-18",
      externalRef: null,
      serviceOrderId: "vendor-job-plumbing",
      lines: [
        {
          id: "vendor-invoice-draft-2401-l1",
          description: "Acil tesisat işçiliği",
          quantity: 1,
          unitPriceCents: 800_000,
          taxRate: 20,
        },
        {
          id: "vendor-invoice-draft-2401-l2",
          description: "Malzeme (bağlantı ve conta)",
          quantity: 1,
          unitPriceCents: 160_000,
          taxRate: 20,
        },
      ],
    },
  ],
}
