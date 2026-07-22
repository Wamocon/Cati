-- Localize the seeded activities catalog to Turkish (the app's lead language) so
-- the live Supabase path matches the Turkish local-seed. Migration 45 seeded the
-- catalog with English name/description; this UPDATEs them in place.
-- Idempotent + safe: matched on the stable, non-localized image_key AND guarded on
-- the original English name, so re-running is a no-op and a client-renamed row is
-- never clobbered. Category enum values are unchanged (they are localized at render).
BEGIN;

UPDATE public.activities SET
    name = 'Spa & Hamam Seansı',
    description = 'Sağlık merkezinde özel spa ve hamam seansı.'
  WHERE image_key = 'activities/spa-hammam.jpg' AND name = 'Spa & Hammam Session';

UPDATE public.activities SET
    name = 'Özel Plaj Kabini',
    description = 'Şezlong ve servis dahil, gün boyu size ayrılmış sahil kabini.'
  WHERE image_key = 'activities/beach-cabana.jpg' AND name = 'Private Beach Cabana';

UPDATE public.activities SET
    name = 'Havaalanı Transferi',
    description = 'Havaalanına gidiş-dönüş için özel kapıdan kapıya transfer.'
  WHERE image_key = 'activities/airport-transfer.jpg' AND name = 'Airport Transfer';

UPDATE public.activities SET
    name = 'Tenis Kortu (1 saat)',
    description = 'Raketler dahil, bir saatlik ışıklandırılmış tenis kortu rezervasyonu.'
  WHERE image_key = 'activities/tennis-court.jpg' AND name = 'Tennis Court (1 hour)';

UPDATE public.activities SET
    name = 'Çocuk Kulübü (günlük)',
    description = 'Oyun ve el sanatları etkinlikleriyle gözetimli tam gün çocuk kulübü.'
  WHERE image_key = 'activities/kids-club.jpg' AND name = 'Kids Club (day pass)';

UPDATE public.activities SET
    name = 'Yüzme Dersi',
    description = 'Sertifikalı eğitmen eşliğinde çocuklar için grup yüzme dersi.'
  WHERE image_key = 'activities/swimming-lesson.jpg' AND name = 'Swimming Lesson';

UPDATE public.activities SET
    name = 'Sanat Atölyesi',
    description = 'Çocuklar için rehberli sanat ve resim atölyesi.'
  WHERE image_key = 'activities/art-workshop.jpg' AND name = 'Art Workshop';

UPDATE public.activities SET
    name = 'Mini Golf Turu',
    description = 'Bahçe parkurunda aileye uygun mini golf turu.'
  WHERE image_key = 'activities/mini-golf.jpg' AND name = 'Mini-Golf Round';

COMMIT;
