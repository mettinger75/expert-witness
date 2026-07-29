# Expert Witness Practice Manager - Claude Code Memory

## Project Overview
Expert Witness Practice Manager for Dr. Mark Ettinger (anesthesiology). Built with Next.js 16 (App Router), React 19, TypeScript 5, Supabase, Tailwind CSS v4, and the Meridian Design System (navy/gold theme).

## Architecture

### Two Supabase Instances
- **EW Database** (expert-witness): `ydggyglrusjswxwmecjx` — primary app database
- **CC Database** (control-center): `vawnihwrzyvglfoeufks` — Ettinger Control Center for cross-project management

### AI Endpoints
- `/api/ai/command` — **Agentic AI with 9 database tools** (read/write). Uses Claude Sonnet 4.5 with tool-use loop (max 10 iterations). This is the main AI interface used by the CommandPanel on the /ai page.
- `/api/ai/chat` — Streaming conversational AI (no tools, read-only context). Used by ChatInterface component for case-specific discussions.

### AI Command Tools (what the AI can do)
1. `query_database` — Execute read-only SELECT/WITH queries via `execute_readonly_query` RPC
2. `create_case` — Create cases with auto-generated case numbers (EW-YYYY-NNNN)
3. `update_case` — Update any case field
4. `create_contact` — Create contacts (attorneys, providers, experts, etc.)
5. `link_contact_to_case` — Link contacts to cases with roles
6. `create_milestone` — Add milestones/deadlines to cases
7. `create_time_entry` — Log billable time entries
8. `create_note` — Add case notes (flagged as ai_generated)
9. `sync_to_control_center` — Push data to the Ettinger Control Center

### Key Database Tables
- `cases` (53 cols) — side (not plaintiff_side), specialty_area, patient info, opinions, financials
- `contacts` — phone_primary (not phone), organization_name (not organization), contact_type required
- `case_contacts` — junction table with role and is_primary
- `case_milestones` — milestone_name (not title), target_date (not due_date), status/sort_order/reminder_sent required
- `time_entries` — duration_hours, rate_per_hour, amount (all NOT NULL)
- `case_notes` — note_type, content, content_format (all NOT NULL), ai_generated flag
- `invoices` — full billing/payment tracking
- `billing_rates` — activity type rates
- `audit_log` — columns: table_name, record_id, action, new_values (NOT entity_type/entity_id/changes)

### Generated-Document Metadata Policy (MANDATORY)
Every artifact generated for clients/courts (reports, invoices, CVs, letters — PDF or DOCX) must have generator-identifying metadata scrubbed before it can leave the machine: **no AI references (Claude / Codex / Anthropic / "evaluation copy"), no tool fingerprints (ReportLab, LibreOffice, Chromium/Skia, react-pdf, html-to-docx)**. Reports reach attorneys via the portal or as editable Word documents.
- **Report PDFs (portal download + admin export): NO metadata at all.** `generateReportPdf()` ends with `scrubPdfMetadata(pdf)` — no arguments → the info dictionary is removed outright and any XMP stream dropped.
- **Report DOCX**: `/api/reports/export-docx` routes output through `scrubDocxMetadata()` — blank identity properties. (html-to-docx stamps itself as creator even when given empty strings, hence the post-process.)
- **Invoice PDFs**: Title + Author only.
- All scrubbers live in `src/lib/document-metadata.ts`. **Never add a new export/generation path without routing its output through them.**
- Ad-hoc/local renders (scratchpad scripts, ReportLab, LibreOffice): run `python3 scripts/scrub-pdf-metadata.py <file>` (no flags = fully blank, required for reports; `--title/--author` only for non-report artifacts like CVs), verify with `pdfinfo -meta`.
- **NEVER scrub source records, opposing productions, or any evidence file** (e.g. `tmp/pdfs/*/production/`, `tmp/report-corpus/`) — provenance metadata on evidence must be preserved.
- Avoid AI-identifying filenames on anything that could be transmitted; treat draft reports as discoverable.

### Deployment
- **Vercel**: https://expert-witness.vercel.app
- **Important**: `vercel deploy` can overwrite `.env.local` — always check/restore after deploying
- **Important**: Claude Code sets `ANTHROPIC_API_KEY=""` in shell — must `unset ANTHROPIC_API_KEY` before running dev server locally

### Environment Variables (in Vercel + .env.local)
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
- RESEND_API_KEY, NOTION_API_KEY
- NEXT_PUBLIC_APP_URL=https://expert-witness.vercel.app
- CONTROL_CENTER_SUPABASE_URL, CONTROL_CENTER_SERVICE_ROLE_KEY

### Design System (Meridian)
- Navy primary: #0E1F35
- Gold accent: #C9A84C
- shadcn/ui components with cva variants
- Active tab styling: gold underline with navy text

## How to Prompt the AI Chat (CommandPanel)
The AI on the /ai page can be prompted with natural language to manage the practice:

**Creating records:**
- "Create a new med mal case: Jones v. City Hospital, plaintiff side, high priority"
- "Add attorney Sarah Miller from Miller Law, email sarah@millerlaw.com"
- "Link Sarah Miller to the Jones case as retaining counsel"
- "Add a deposition deadline for April 15, 2025 on the Jones case"
- "Log 3 hours of record review at $450/hour on the Smith case"

**Querying data:**
- "Show me all active cases"
- "What's the outstanding balance across all cases?"
- "List all contacts linked to the Smith case"
- "Show upcoming deadlines this month"

**Multi-step operations:**
- "Create a new case for Brown v. Metro Health, add the referring attorney Tom Wilson from Wilson & Partners, and set a report deadline for June 1"
- The AI will chain multiple tool calls automatically
