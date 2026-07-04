# KBS & Identity Handling — Legal-Research Brief

> Prepared by: WAMOCON GmbH · For: Ataberk Estate — New Level Premium Avsallar · 3 July 2026
> Status: RESEARCH BRIEF to support the 1Çatı registration/identity feature. **This is engineering research, not legal advice.** A licensed Turkish lawyer must confirm applicability and the exact retention periods before the real KBS transmission is switched on. Companion: `docs/offers/new-level-premium-landing-page-offer.md` §6–§7.

---

## 1. The obligation (what the law says)

Turkey's **Kimlik Bildirme Kanunu (Law No. 1774)** requires **all accommodation facilities** to report guest identity data to the local police / gendarmerie. The reporting happens electronically through the **KBS (Kimlik Bildirim Sistemi)**, operated by the General Directorate of Security (EGM), which transmits guest check-in and check-out directly to law enforcement.

**Scope — who must report.** Hotels, motels, holiday villages, pensions, **apart-hotels**, camps, guesthouses "and all similar accommodation facilities". Critically, **commercial short-term rental homes (daily/weekly lettings) are explicitly in scope, regardless of unit capacity** — a single flat let commercially for tourism must be in KBS and report its guests.

**Timing — instant.** The law works on an "anlık bildirim" (instant notification) basis: the guest must be entered into KBS **at check-in, without delay**, and a check-out recorded when the stay ends. This holds even for very short stays.

**Penalties.** Failure to report, or incomplete/incorrect reporting, triggers administrative fines (revised upward yearly). Repeated violations (three within a defined period) can lead to **temporary or permanent suspension/sealing of the operation**. This is why "Sicherheit geht vor" is the right posture: the downside is operational shutdown, not just a fine.

**Adjacent regime (2024).** Tourism-purpose short-term letting (≤100 days) also falls under the newer short-term-rental **permit** regime (Law No. 7464), which requires a permit from the Ministry of Culture and Tourism **and** unanimous HOA (site) consent. This is separate from KBS but relevant to how New Level Premium units may be let.

---

## 2. The decisive distinction for New Level Premium

Not every unit is the same legal case. Two paths:

| Use of the unit | Reporting obligation | Applies to 1Çatı how |
|---|---|---|
| **Commercial short-term / holiday let** (daily/weekly, tourism) — matches the 5★ hotel-infrastructure + rental-guarantee model | **KBS applies.** Instant guest identity report at check-in/out under Law 1774; likely also the Law 7464 permit + HOA consent. | The tenant/guest registration flow **must** capture identity and (when live) transmit to KBS per stay. This is the case 1Çatı is built for. |
| **Long-term residential lease** (tenant's primary residence, standard 12-month+ contract) | **KBS does not govern this.** The obligation is **address registration** (Adres Kayıt Sistemi / MERNİS) at the Nüfus Müdürlüğü / e-Devlet, generally within ~20 days of moving in — a different system, not instant police guest reporting. | For genuinely long-term residents, the flow should capture identity for verification but route to address-registration guidance, **not** a per-stay KBS report. |

**Practical rule encoded in the product:** treat owner/tenant identity capture as mandatory (both cases need verified identity), but make the **KBS report a per-let action tied to the short-term/commercial case**, not an automatic transmission for every long-term resident. The current build already separates capture (always) from the queued KBS report (owner/tenant intake) — the live integration should gate transmission on the "commercial short-term let" flag confirmed with counsel.

---

## 3. Retention — what to keep, and for how long

Two data classes, two rules (KVKK data-minimization + Turkish commercial-record law):

1. **The raw ID document image / scan** — **do not store after verification.** Best practice (and lowest KVKK risk) is verify-then-discard. The current build never stores a document image — it captures only ID *type*, *number* and *issuing country*.
2. **The minimal identity + stay record** (name, ID number, unit, dates) —
   - **Intake/registration request that has not become a stay:** short retention. The product default is now **180 days** (`kbs_identity_retention_days()`), after which the intake identity data is purged. Rationale: verification data should not outlive its purpose (aligns with the 6-months-post-transaction guidance in the landing brief §6).
   - **Confirmed resident / completed stay record:** governed separately by Turkish commercial/tax record-keeping (Vergi Usul Kanunu generally implies ~**5 years** for business records). This lives at the `residents`/`reservations` layer, not the intake request, and should carry its own retention clock when that layer is wired for production.

**What counsel must confirm (do not assume):**
- Which New Level Premium units are legally "commercial short-term lets" (KBS + permit) vs. long-term residential (address registration only).
- The exact retention period for the confirmed identity/stay record (the 5-year VUK figure is the conservative default; a shorter KVKK-minimized period may apply).
- Whether the operator (Ataberk) or a per-unit host is the registered KBS "sorumlu işletici", and the KBS credentials/onboarding path.
- Permit + HOA-consent status under Law 7464 for tourism lettings.

---

## 4. What is built now vs. what the confirmation unlocks

**Built (demo-safe, no transmission):** identity capture (type/number/country, no image), a stamped **retention deadline** (default 180 days, one line to change in `kbs_identity_retention_days()`), and a **queued** KBS report in `integration_outbox` (`integration_key = 'kbs'`). Nothing is transmitted.

**Unlocked by counsel sign-off + KBS credentials:** switching the outbox processor to actually transmit to EGM/KBS per stay, setting the confirmed-stay retention at the residents layer, and gating transmission on the commercial-short-term-let flag.

---

## 5. Recommendation

1. **Proceed with counsel** on the four confirmation points in §3 — this is the "Prüfung" and it is genuinely a lawyer's call, not an engineering one.
2. Keep the current **capture-and-queue** design; it is already the safe, KVKK-aligned shape.
3. On sign-off, set `kbs_identity_retention_days()` to the confirmed value, wire the confirmed-stay retention at the residents layer, and enable the KBS outbox transmitter with official credentials.
4. Confirm the **Law 7464 permit + HOA consent** status in parallel, since it gates whether short-term letting is even permitted per unit.

---

## 6. Sources

- EGM (General Directorate of Security) — Kimlik Bildirim Sistemi: https://www.egm.gov.tr/kimlik-bildirim-sistemi
- 1774 Sayılı Kimlik Bildirme Kanunu (overview): https://www.villaapart.com/ContentLink.aspx?contpg=39
- KBS guide (scope, instant reporting, penalties): https://www.hmsotel.com/kbs-kimlik-bildirim-sistemi-rehberi-uygulama-ve-kurallar/
- KBS for property owners (short-term let obligation): https://homeyday.com.tr/blog/kbs-nedir-pratik-rehber
- Short-term rental permit (Law 7464), HOA consent, fines: https://istanbullawyerfirm.com/blog/short-term-rental-permit-turkey-2024-2025-licensing-hoa-consent-fines

*This brief is intentionally explicit about the commercial-short-term vs. long-term-residential split, because that single distinction determines whether the instant KBS guest report applies. The product is built to honor the stricter (KBS) case safely while not over-reporting the long-term case.*
