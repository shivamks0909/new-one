-- Migration 003: External Platforms & External Offers Auto-Discovery Tables

-- 0. Ensure password_hash exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 1. External Platforms table (e.g. Zephyr, Qualtrics, Forsta, Decipher, Generic)
CREATE TABLE IF NOT EXISTS external_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(500),
  offer_param_name VARCHAR(100) DEFAULT 'offerId',
  respondent_param_name VARCHAR(100) DEFAULT 'zid',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_platforms_code ON external_platforms(platform_code);

-- Insert default platform (Zephyr / Generic)
INSERT INTO external_platforms (platform_code, name, base_url, offer_param_name, respondent_param_name)
VALUES ('ZEPHYR', 'Zephyr PM Tool', 'https://pmtool.zephyrsample.com', 'offerId', 'zid')
ON CONFLICT (platform_code) DO NOTHING;

INSERT INTO external_platforms (platform_code, name, base_url, offer_param_name, respondent_param_name)
VALUES ('GENERIC', 'Generic Survey Platform', '', 'offerId', 'uid')
ON CONFLICT (platform_code) DO NOTHING;

-- 2. External Offers table
CREATE TABLE IF NOT EXISTS external_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES external_platforms(id) ON DELETE CASCADE,
  external_offer_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  survey_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  discovery_method VARCHAR(50) NOT NULL DEFAULT 'AUTO', -- AUTO | MANUAL | API
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_external_offers_platform_offer UNIQUE (platform_id, external_offer_id)
);

CREATE INDEX IF NOT EXISTS idx_external_offers_offer_id ON external_offers(external_offer_id);
CREATE INDEX IF NOT EXISTS idx_external_offers_platform_id ON external_offers(platform_id);
CREATE INDEX IF NOT EXISTS idx_external_offers_status ON external_offers(status);

-- 3. Add external offer tracking columns to studies table
ALTER TABLE studies ADD COLUMN IF NOT EXISTS external_offer_id VARCHAR(255);
ALTER TABLE studies ADD COLUMN IF NOT EXISTS source_platform VARCHAR(100) DEFAULT 'ZEPHYR';
ALTER TABLE studies ADD COLUMN IF NOT EXISTS discovery_method VARCHAR(50) DEFAULT 'AUTO';

CREATE INDEX IF NOT EXISTS idx_studies_external_offer_id ON studies(external_offer_id);

-- 4. Add external offer tracking columns to sessions & response records
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS external_offer_id VARCHAR(255);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS external_offer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sessions_external_offer_id ON sessions(external_offer_id);
CREATE INDEX IF NOT EXISTS idx_responses_external_offer_id ON responses(external_offer_id);
