-- Migration 21: video library metadata for the public product-video page.
-- Migration version 15 is already deployed for the emergency/service catalog.
-- Media files stay in a private Supabase Storage bucket and are signed by the app server.

CREATE TABLE IF NOT EXISTS public.video_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title JSONB NOT NULL DEFAULT '{}'::jsonb,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  category JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  video_path TEXT,
  thumbnail_path TEXT,
  caption_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.video_library IS
  'Published 1Cati app videos with localized metadata and private Supabase Storage paths.';
COMMENT ON COLUMN public.video_library.video_path IS
  'Path inside the private video-library Supabase Storage bucket, for example videos/01-overview.mp4.';
COMMENT ON COLUMN public.video_library.thumbnail_path IS
  'Path inside the private video-library Supabase Storage bucket, for example thumbnails/01-overview.jpg.';
COMMENT ON COLUMN public.video_library.caption_tracks IS
  'Array of subtitle tracks, for example [{"path":"captions/01-overview.en.vtt","label":"English","srclang":"en","default":true}].';
COMMENT ON COLUMN public.video_library.chapters IS
  'Array of chapter markers, for example [{"label":{"en":"Overview"},"time":0}].';

ALTER TABLE public.video_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published video metadata is readable" ON public.video_library;
CREATE POLICY "Published video metadata is readable"
  ON public.video_library
  FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

CREATE INDEX IF NOT EXISTS idx_video_library_published_order
  ON public.video_library(is_published, sort_order, created_at DESC);

DROP TRIGGER IF EXISTS set_video_library_updated_at ON public.video_library;
CREATE TRIGGER set_video_library_updated_at
  BEFORE UPDATE ON public.video_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-library', 'video-library', FALSE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
