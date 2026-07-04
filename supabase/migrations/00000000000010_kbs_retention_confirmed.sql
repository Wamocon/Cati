-- 00000000000010_kbs_retention_confirmed.sql
-- Retention period for identity data captured on a PUBLIC INTAKE REQUEST,
-- set after the KBS legal-research brief (docs/offers/kbs-identity-legal-brief.md).
--
-- Scope of this value: it governs how long identity data attached to an
-- unconverted registration/report request is kept before purge. It is
-- deliberately short (verification data should not outlive its purpose).
--
--   * Raw ID document image/scan: never stored (capture-then-discard).
--   * Intake request identity (type/number/country): 180 days, then purge.
--   * Confirmed resident / completed stay record: a SEPARATE, longer clock
--     governed by Turkish commercial/tax record-keeping (VUK, ~5 years) that
--     belongs at the residents/reservations layer, NOT on the intake request.
--
-- Counsel must still confirm the exact figures and the commercial-short-term
-- vs. long-term-residential split before real KBS transmission is enabled;
-- change the return value here once confirmed.

CREATE OR REPLACE FUNCTION public.kbs_identity_retention_days()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 180 $$;
