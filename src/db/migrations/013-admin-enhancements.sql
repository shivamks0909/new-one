-- 013: Admin enhancements — force password change, vendor isolation support

-- Add force_password_change flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
