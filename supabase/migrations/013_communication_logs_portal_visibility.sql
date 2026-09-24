-- Counsel-visibility rule for the attorney portal Timeline.
--
-- communication_logs.subject, summary and detailed_notes are internal notes
-- and must never reach the portal. An entry appears on counsel's Timeline
-- (/api/portal/[token]) only when it has been explicitly shared from the case
-- Communications tab, and then only with portal_summary, the text written for
-- counsel. Off by default: every existing and future entry stays private
-- until someone deliberately shares it.

ALTER TABLE communication_logs
  ADD COLUMN IF NOT EXISTS visible_to_portal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_summary text;

-- A shared entry must carry counsel-facing text; the portal never falls back
-- to the internal summary.
ALTER TABLE communication_logs
  DROP CONSTRAINT IF EXISTS communication_logs_portal_summary_required;
ALTER TABLE communication_logs
  ADD CONSTRAINT communication_logs_portal_summary_required
  CHECK (NOT visible_to_portal OR length(btrim(coalesce(portal_summary, ''))) > 0);

CREATE INDEX IF NOT EXISTS idx_comm_logs_portal_timeline
  ON communication_logs (case_id, communication_date DESC)
  WHERE visible_to_portal;

COMMENT ON COLUMN communication_logs.visible_to_portal IS
  'Shown on the attorney portal Timeline only when true; off by default.';
COMMENT ON COLUMN communication_logs.portal_summary IS
  'Counsel-facing text shown on the portal Timeline. subject, summary and detailed_notes are internal and never sent to the portal.';
