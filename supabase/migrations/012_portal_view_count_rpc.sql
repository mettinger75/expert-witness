-- Atomic portal view-count increment.
--
-- The portal data route previously did `view_count = invite.view_count + 1`
-- (read-then-write), which loses increments under concurrent loads. This RPC
-- increments and stamps timestamps in a single statement and returns the new
-- count.

CREATE OR REPLACE FUNCTION increment_portal_view(p_invite_id uuid)
RETURNS int
LANGUAGE sql
AS $$
  UPDATE portal_invites
  SET view_count = view_count + 1,
      last_accessed_at = now(),
      first_accessed_at = COALESCE(first_accessed_at, now())
  WHERE id = p_invite_id
  RETURNING view_count;
$$;
