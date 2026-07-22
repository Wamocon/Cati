// Deterministic local-seed fixture for the wallet / credit ledger.
//
// DEMO credit only. Amounts are integer minor units (kurus / cents). A wallet
// carries a single currency; the app renders dual TRY / EUR at the display layer
// (lib/currency.ts) with no FX in the ledger. This fixture lets the wallet work
// fully offline in access-profile / QA mode, mirroring how the accountant-finance
// and manual-payment subsystems seed their local state.

import type { NativeCurrency } from "@/lib/currency"

export interface WalletSeed {
  /** Stable local wallet id used only in offline / QA mode. */
  id: string
  currency: NativeCurrency
  /** Opening demo credit before any local top-up / spend is applied. */
  startingBalanceCents: number
  /** Balance at or below which the UI surfaces a low-balance warning. */
  lowBalanceThresholdCents: number
}

export const WALLET_LOCAL_SEED: WalletSeed = {
  id: "wallet-local-demo",
  currency: "TRY",
  startingBalanceCents: 250_000, // ₺2.500,00 opening demo credit
  lowBalanceThresholdCents: 50_000, // ₺500,00 low-balance alert threshold
}
