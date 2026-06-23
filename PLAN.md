# Morgen Calendar & Booking Integration Plan

## Overview
Integrate Morgen calendar (Expert Witness calendar) and booking links into the EW platform in two places:
1. **New `/calendar` page** — full calendar view for Dr. Ettinger (internal)
2. **New Portal "Schedule" tab** — booking links for attorneys (external portal)

---

## Part 1: Calendar Page (Internal)

### New Files
- `src/app/api/calendar/events/route.ts` — Server-side API route that proxies Morgen API
- `src/app/(protected)/calendar/page.tsx` — Full calendar page with week/month view

### API Route (`/api/calendar/events`)
- Calls Morgen API `GET /v3/calendars/list` to find the "Expert Witness" calendar ID (cached)
- Calls Morgen API `GET /v3/events/list` with `calendarIds` filter and date range
- Also fetches case milestones from Supabase (`case_milestones` table) to overlay deadlines
- Returns combined events in a unified format
- Auth: Uses `MORGEN_API_KEY` env var, header `Authorization: ApiKey <key>`

### Calendar Page UI
- Month view (default) and week view toggle
- Events color-coded: Morgen events (gold), case milestones/deadlines (navy)
- Click event → side panel with details (title, time, case link if applicable)
- Navigation: prev/next month/week, today button
- Built with a custom Tailwind grid (no heavy calendar library needed for this scope) matching the Meridian navy/gold design system
- Mobile responsive

### Sidebar Update
- Add "Calendar" nav item to `AppSidebar.tsx` between "Inbox" and "Contacts"
- Icon: `Calendar` from lucide-react

### Environment Variables
- `MORGEN_API_KEY` — added to `.env.local` and Vercel

---

## Part 2: Portal Booking Tab (Attorney-Facing)

### New Files
- `src/app/portal/[token]/PortalSchedule.tsx` — New portal tab component

### Portal Schedule Tab
- Two booking cards side-by-side (or stacked on mobile):
  1. **Schedule a Call** — "Book a call with Dr. Ettinger to discuss your case"
     - Links to: `https://book.morgen.so/markettingermd/expertcall`
     - Opens in new tab (external link) OR embedded iframe
  2. **Schedule a Deposition** — "Schedule a deposition preparation session"
     - Links to: `https://book.morgen.so/markettingermd/expertdeposition`
     - Opens in new tab OR embedded iframe
- Styled in the Meridian design system (navy cards, gold accents)
- Icon: `CalendarPlus` from lucide-react

### Approach: Link Cards vs. Iframe Embed
- **Recommended: Link cards** that open Morgen booking in a new tab
  - Simpler, no iframe cross-origin issues
  - Morgen booking pages are already well-designed
  - Attorneys can book directly on Morgen's hosted page
- Optional future enhancement: embed as iframe if Morgen supports it cleanly

### Portal Permission
- Add `can_book_calls` boolean column to `portal_invites` table (default: `true`)
- Gate the "Schedule" tab visibility behind this permission
- Update `PortalView.tsx` to include the new tab
- Update portal invite creation API to include the new permission

### Database Migration
```sql
ALTER TABLE portal_invites
ADD COLUMN can_book_calls boolean NOT NULL DEFAULT true;
```

### Files Modified
- `src/app/portal/[token]/PortalView.tsx` — Add Schedule tab to tabs array + render
- `src/app/portal/[token]/page.tsx` — Pass permission through (if not already selecting *)
- `src/app/api/portal/route.ts` — Include `can_book_calls` in invite creation
- `src/components/layout/AppSidebar.tsx` — Add Calendar nav item
- `src/types/database.types.ts` — Update PortalInvite type (or regenerate)

---

## Implementation Order
1. Add `MORGEN_API_KEY` env var
2. Database migration: add `can_book_calls` to `portal_invites`
3. Create `/api/calendar/events` API route
4. Create `/calendar` page
5. Update sidebar navigation
6. Create `PortalSchedule.tsx` component
7. Wire up portal tab in `PortalView.tsx`
8. Update portal invite creation API
9. Test both calendar page and portal booking tab
10. Deploy to Vercel
