-- ============================================================
-- V2: Add all social media platforms
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop old CHECK constraint and add new one with ALL platforms
ALTER TABLE platform_connections
  DROP CONSTRAINT IF EXISTS platform_connections_platform_check;

ALTER TABLE platform_connections
  ADD CONSTRAINT platform_connections_platform_check
  CHECK (platform IN (
    'instagram', 'facebook', 'twitter', 'linkedin',
    'tiktok', 'threads', 'youtube', 'pinterest',
    'reddit', 'mastodon', 'bluesky', 'google_business', 'whatsapp'
  ));

-- 2. Also update posts table platforms array comment (text[] accepts any values, no constraint needed)

-- ============================================================
-- Platform OAuth Credentials (env vars needed in .env.local):
--
-- TikTok:
--   TIKTOK_CLIENT_KEY=
--   TIKTOK_CLIENT_SECRET=
--
-- Reddit:
--   REDDIT_CLIENT_ID=
--   REDDIT_CLIENT_SECRET=
--
-- Mastodon:
--   No client credentials needed (instance-based OAuth)
--
-- Bluesky:
--   No OAuth needed (uses app passwords)
--
-- Pinterest:
--   PINTEREST_APP_ID=
--   PINTEREST_APP_SECRET=
--
-- YouTube:
--   Uses Google OAuth (see GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET below)
--
-- Google Business:
--   Uses Google OAuth (same as YouTube)
--
-- WhatsApp:
--   Uses Meta Business API (same Facebook app credentials)
--   WHATSAPP_BUSINESS_PHONE_ID=
--   WHATSAPP_ACCESS_TOKEN=  (permanent system user token)
-- ============================================================
