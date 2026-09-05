-- Migration 012: Add loi_seconds to responses table
ALTER TABLE responses ADD COLUMN IF NOT EXISTS loi_seconds INTEGER;
