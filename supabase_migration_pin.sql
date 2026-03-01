-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add PIN support to share_tokens
-- Only run this if you already ran supabase_schema.sql before.
-- If you are setting up fresh, just run supabase_schema.sql — it already includes this.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE share_tokens ADD COLUMN IF NOT EXISTS pin_hash text;
