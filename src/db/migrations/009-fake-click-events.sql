-- Migration 009: Fake Click Events table
-- Records ALL rejected callbacks that arrive without a valid tracking session.
-- This is the "Fake/Unverified Clicks" audit trail.

CREATE TABLE IF NOT EXISTS fake_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Study/Vendor context (may be NULL if the offerId didn't resolve)
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  
  -- Identity
  uid TEXT NOT NULL,
  normalized_uid TEXT NOT NULL,
  
  -- Rejection classification
  rejection_reason TEXT NOT NULL,
  -- Possible values:
  --   NO_SESSION         -- No session exists for this study+vendor+uid
  --   EXPIRED_SESSION    -- Session exists but has expired
  --   NO_LANDING_EVENT   -- Session exists but never received a LANDING/START event
  --   INVALID_SIGNATURE  -- HMAC signature verification failed
  --   INVALID_UID        -- UID failed normalization
  --   NO_TRACKING_LINK   -- No tracking link found for study+vendor
  --   DUPLICATE          -- Duplicate callback (already processed)
  
  -- Request metadata
  raw_payload JSONB,
  ip_address TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  provider TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fake_clicks_study_id ON fake_click_events(study_id);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_uid ON fake_click_events(uid);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_normalized_uid ON fake_click_events(normalized_uid);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_rejection_reason ON fake_click_events(rejection_reason);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_created_at ON fake_click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_study_created ON fake_click_events(study_id, created_at DESC);
