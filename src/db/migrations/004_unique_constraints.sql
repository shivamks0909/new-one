-- Migration 004: Ensure UNIQUE constraints for ON CONFLICT statements

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_responses_session_id'
  ) THEN
    ALTER TABLE responses ADD CONSTRAINT uq_responses_session_id UNIQUE (session_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_response_events_event_key'
  ) THEN
    ALTER TABLE response_events ADD CONSTRAINT uq_response_events_event_key UNIQUE (event_key);
  END IF;
END $$;
