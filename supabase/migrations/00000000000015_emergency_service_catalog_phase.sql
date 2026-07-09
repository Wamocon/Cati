-- Phase 13 emergency service catalog hardening:
-- add production-safe upserts for the emergency routes used by AI ticketing.

WITH tenant_context AS (
  SELECT
    c.id AS company_id,
    s.id AS site_id
  FROM public.companies c
  LEFT JOIN LATERAL (
    SELECT id
    FROM public.sites
    WHERE company_id = c.id
    ORDER BY created_at ASC
    LIMIT 1
  ) s ON TRUE
),
catalog_seed (
  code,
  name,
  category,
  description,
  base_price_cents,
  currency,
  sla_hours,
  debt_policy,
  requires_payment,
  requires_deposit,
  team,
  provider_type,
  service_level,
  popularity_score,
  active
) AS (
  VALUES
    ('EMERG-LIFE-SAFETY', 'Can guvenligi ve gaz/duman alarmi', 'security', 'Gaz kokusu, duman, yangin alarmi veya can guvenligi uyarisi icin aninda guvenlik ve yonetici eskalasyonu.', 0, 'TRY', 1, 'allow', FALSE, FALSE, 'Guvenlik', 'mixed', 'emergency', 99, TRUE),
    ('MAINT-ELEC', 'Acil elektrik kesintisi ve kivilcim riski', 'maintenance', 'Daire veya ortak alanda elektrik kesintisi, kivilcim, pano kokusu ve aydinlatma riski icin teknik mudahale.', 720000, 'TRY', 2, 'allow', TRUE, FALSE, 'Teknik', 'mixed', 'emergency', 94, TRUE),
    ('MAINT-ELEVATOR', 'Asansor arizasi ve kabinde kalma', 'maintenance', 'Asansor durmasi, kabinde kalma, kata hizalanmama veya alarm durumunda sozlesmeli servis ve guvenlik yonlendirmesi.', 0, 'TRY', 1, 'allow', FALSE, FALSE, 'Teknik', 'vendor', 'emergency', 93, TRUE),
    ('MAINT-SEWER', 'Gider tasmasi ve kanalizasyon riski', 'maintenance', 'Gider tikanikligi, tuvalet tasmasi, kotu koku ve hijyen riski icin acil tesisat/vendor yonlendirmesi.', 860000, 'TRY', 3, 'allow', TRUE, FALSE, 'Teknik', 'vendor', 'emergency', 90, TRUE),
    ('MAINT-HVAC-URGENT', 'Acil klima ve konfor riski', 'maintenance', 'Yuksek sicaklik, yasli/misafir konfor riski veya premium konaklama sikayeti icin hizli klima kontrolu.', 650000, 'TRY', 8, 'allow', TRUE, FALSE, 'Teknik', 'mixed', 'emergency', 86, TRUE),
    ('AMENITY-SPA-INCIDENT', 'Spa, havuz ve ortak alan olay yonetimi', 'amenity', 'Spa, havuz, fitness veya ortak alanda hijyen, kapasite, ekipman ya da misafir guvenligi olayini is akisiyla yonetir.', 0, 'TRY', 2, 'allow', FALSE, FALSE, 'Sakin destek', 'mixed', 'emergency', 83, TRUE),
    ('AMENITY-FOOD-EVENT-INCIDENT', 'Restoran ve etkinlik operasyon olayi', 'amenity', 'Restoran, tiyatro, etkinlik veya kalabalik sosyal alanlarda kapasite, servis aksakligi ve misafir sikayetlerini yonlendirir.', 0, 'TRY', 2, 'allow', FALSE, FALSE, 'Restoran', 'mixed', 'emergency', 81, TRUE),
    ('SEC-LOCKOUT', 'Acil erisim, kapi ve bariyer kilidi', 'security', 'Daireye girememe, kart/QR calismamasi, kapida kalma, bariyer veya plaka gecis arizasi icin guvenlik yonlendirmesi.', 120000, 'TRY', 2, 'allow', TRUE, FALSE, 'Guvenlik', 'internal', 'emergency', 88, TRUE)
)
INSERT INTO public.service_catalog (
  company_id,
  site_id,
  code,
  name,
  category,
  description,
  base_price_cents,
  currency,
  sla_hours,
  debt_policy,
  requires_payment,
  requires_deposit,
  team,
  provider_type,
  service_level,
  popularity_score,
  active
)
SELECT
  tenant_context.company_id,
  tenant_context.site_id,
  catalog_seed.code,
  catalog_seed.name,
  catalog_seed.category,
  catalog_seed.description,
  catalog_seed.base_price_cents,
  catalog_seed.currency,
  catalog_seed.sla_hours,
  catalog_seed.debt_policy,
  catalog_seed.requires_payment,
  catalog_seed.requires_deposit,
  catalog_seed.team,
  catalog_seed.provider_type,
  catalog_seed.service_level,
  catalog_seed.popularity_score,
  catalog_seed.active
FROM catalog_seed
CROSS JOIN tenant_context
WHERE tenant_context.company_id IS NOT NULL
ON CONFLICT (company_id, code) DO UPDATE
SET
  site_id = COALESCE(public.service_catalog.site_id, EXCLUDED.site_id),
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  base_price_cents = EXCLUDED.base_price_cents,
  currency = EXCLUDED.currency,
  sla_hours = EXCLUDED.sla_hours,
  debt_policy = EXCLUDED.debt_policy,
  requires_payment = EXCLUDED.requires_payment,
  requires_deposit = EXCLUDED.requires_deposit,
  team = EXCLUDED.team,
  provider_type = EXCLUDED.provider_type,
  service_level = EXCLUDED.service_level,
  popularity_score = EXCLUDED.popularity_score,
  active = EXCLUDED.active,
  updated_at = NOW();
