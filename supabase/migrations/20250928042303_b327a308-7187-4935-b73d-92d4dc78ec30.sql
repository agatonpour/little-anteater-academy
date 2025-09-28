-- First delete sessions for placeholder coaches
DELETE FROM sessions WHERE coach_id IN (
  SELECT id FROM coaches WHERE user_id IS NULL
);

-- Then delete the placeholder coaches
DELETE FROM coaches WHERE user_id IS NULL;