-- Adds the can_invite_contacts permission to portal_invites.
--
-- Gates the portal "invite a colleague" feature (PortalInviteColleague +
-- /api/portal/[token]/add-contact). Off by default; granted per invite from
-- the Create Portal Invite dialog. Without it, add-contact returns 403.

ALTER TABLE portal_invites
  ADD COLUMN IF NOT EXISTS can_invite_contacts boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN portal_invites.can_invite_contacts IS
  'Gates the portal "invite a colleague" feature; off by default.';
