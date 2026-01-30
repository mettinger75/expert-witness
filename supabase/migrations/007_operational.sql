-- ============================================================================
-- Migration 007: Operational
-- Expert Witness Practice Management System
-- Tables: communication_logs, case_milestones, case_notes, conflict_checks
-- ============================================================================

-- ===========================================
-- Table: communication_logs
-- ===========================================
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- Communication Details
    communication_type VARCHAR(30) NOT NULL CHECK (communication_type IN (
        'phone_call', 'email_sent', 'email_received', 'letter_sent',
        'letter_received', 'fax_sent', 'fax_received', 'meeting',
        'video_conference', 'text_message', 'portal_message', 'voicemail',
        'in_person', 'other'
    )),
    direction VARCHAR(10) NOT NULL DEFAULT 'outbound' CHECK (direction IN (
        'inbound', 'outbound', 'internal'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN (
        'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
        'failed', 'no_answer'
    )),

    -- Content
    subject VARCHAR(500),
    summary TEXT NOT NULL,
    detailed_notes TEXT,

    -- Participants
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    to_names TEXT[],
    to_emails TEXT[],
    cc_names TEXT[],
    cc_emails TEXT[],

    -- Scheduling
    communication_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER,
    scheduled_date TIMESTAMPTZ,

    -- Follow-up
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,
    follow_up_completed BOOLEAN NOT NULL DEFAULT false,
    follow_up_completed_at TIMESTAMPTZ,

    -- Attachments
    attachment_document_ids UUID[],

    -- Billing
    is_billable BOOLEAN NOT NULL DEFAULT true,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_communication_logs_updated_at
    BEFORE UPDATE ON communication_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for communication_logs
CREATE INDEX idx_comm_logs_case_id ON communication_logs(case_id);
CREATE INDEX idx_comm_logs_contact_id ON communication_logs(contact_id);
CREATE INDEX idx_comm_logs_type ON communication_logs(communication_type);
CREATE INDEX idx_comm_logs_direction ON communication_logs(direction);
CREATE INDEX idx_comm_logs_status ON communication_logs(status);
CREATE INDEX idx_comm_logs_date ON communication_logs(communication_date);
CREATE INDEX idx_comm_logs_follow_up ON communication_logs(follow_up_required, follow_up_completed);
CREATE INDEX idx_comm_logs_follow_up_date ON communication_logs(follow_up_date);
CREATE INDEX idx_comm_logs_time_entry ON communication_logs(time_entry_id);
CREATE INDEX idx_comm_logs_tags ON communication_logs USING GIN(tags);

-- ===========================================
-- Table: case_milestones
-- ===========================================
CREATE TABLE case_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Milestone Details
    milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN (
        'case_received', 'conflict_check_complete', 'case_accepted',
        'case_declined', 'retainer_received', 'records_received',
        'initial_review_complete', 'additional_records_requested',
        'additional_records_received', 'opinion_formed',
        'report_drafted', 'report_finalized', 'report_sent',
        'deposition_scheduled', 'deposition_completed',
        'deposition_transcript_received', 'trial_scheduled',
        'trial_testimony_complete', 'supplemental_report',
        'case_settled', 'case_dismissed', 'verdict_rendered',
        'case_closed', 'invoice_sent', 'payment_received',
        'final_payment_received', 'custom'
    )),
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Dates
    target_date DATE,
    actual_date DATE,
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN NOT NULL DEFAULT false,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'overdue',
        'cancelled', 'skipped', 'blocked'
    )),

    -- Related Records
    related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    related_deposition_id UUID REFERENCES depositions(id) ON DELETE SET NULL,

    -- Notifications
    reminder_days_before INTEGER,
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Display
    sort_order INTEGER NOT NULL DEFAULT 0,
    color_code VARCHAR(20),
    icon VARCHAR(50),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_case_milestones_updated_at
    BEFORE UPDATE ON case_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for case_milestones
CREATE INDEX idx_milestones_case_id ON case_milestones(case_id);
CREATE INDEX idx_milestones_type ON case_milestones(milestone_type);
CREATE INDEX idx_milestones_status ON case_milestones(status);
CREATE INDEX idx_milestones_target_date ON case_milestones(target_date);
CREATE INDEX idx_milestones_is_completed ON case_milestones(is_completed);
CREATE INDEX idx_milestones_related_doc ON case_milestones(related_document_id);
CREATE INDEX idx_milestones_related_report ON case_milestones(related_report_id);
CREATE INDEX idx_milestones_related_invoice ON case_milestones(related_invoice_id);
CREATE INDEX idx_milestones_related_depo ON case_milestones(related_deposition_id);

-- ===========================================
-- Table: case_notes
-- ===========================================
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Note Details
    note_type VARCHAR(30) NOT NULL DEFAULT 'general' CHECK (note_type IN (
        'general', 'medical_analysis', 'legal_analysis', 'strategy',
        'research', 'meeting_notes', 'phone_notes', 'personal_reminder',
        'case_theory', 'testimony_prep', 'client_communication',
        'internal', 'ai_generated', 'other'
    )),
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_format VARCHAR(20) NOT NULL DEFAULT 'plain_text' CHECK (content_format IN (
        'plain_text', 'markdown', 'rich_text', 'html'
    )),

    -- Pinning / Priority
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_important BOOLEAN NOT NULL DEFAULT false,
    pin_order INTEGER DEFAULT 0,

    -- Visibility
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,

    -- Related Records
    related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    related_timeline_event_id UUID REFERENCES medical_records_timeline(id) ON DELETE SET NULL,
    related_deposition_id UUID REFERENCES depositions(id) ON DELETE SET NULL,
    related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,

    -- AI
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_case_notes_updated_at
    BEFORE UPDATE ON case_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for case_notes
CREATE INDEX idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX idx_case_notes_type ON case_notes(note_type);
CREATE INDEX idx_case_notes_is_pinned ON case_notes(is_pinned);
CREATE INDEX idx_case_notes_is_important ON case_notes(is_important);
CREATE INDEX idx_case_notes_is_archived ON case_notes(is_archived);
CREATE INDEX idx_case_notes_related_doc ON case_notes(related_document_id);
CREATE INDEX idx_case_notes_related_timeline ON case_notes(related_timeline_event_id);
CREATE INDEX idx_case_notes_related_depo ON case_notes(related_deposition_id);
CREATE INDEX idx_case_notes_related_report ON case_notes(related_report_id);
CREATE INDEX idx_case_notes_ai_convo ON case_notes(ai_conversation_id);
CREATE INDEX idx_case_notes_tags ON case_notes USING GIN(tags);
CREATE INDEX idx_case_notes_created_at ON case_notes(created_at);

-- ===========================================
-- Table: conflict_checks
-- ===========================================
CREATE TABLE conflict_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Check Details
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checked_by VARCHAR(255) NOT NULL DEFAULT 'Marc Ettinger, MD',

    -- Status / Resolution
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'clear', 'conflict_found',
        'conflict_resolved', 'waived', 'declined'
    )),
    resolution VARCHAR(30) CHECK (resolution IN (
        'no_conflict', 'conflict_cleared', 'conflict_waived',
        'case_declined', 'referred_out', 'pending_resolution'
    )),
    resolution_date DATE,
    resolution_notes TEXT,

    -- Search Criteria
    parties_checked TEXT[] NOT NULL DEFAULT '{}',
    attorneys_checked TEXT[] NOT NULL DEFAULT '{}',
    firms_checked TEXT[] NOT NULL DEFAULT '{}',
    facilities_checked TEXT[] NOT NULL DEFAULT '{}',
    providers_checked TEXT[] NOT NULL DEFAULT '{}',

    -- Conflicts Found
    conflicts_found JSONB DEFAULT '[]',
    potential_conflicts JSONB DEFAULT '[]',

    -- Related Cases
    conflicting_case_ids UUID[],

    -- Prior Work
    prior_work_for_plaintiff_counsel BOOLEAN DEFAULT false,
    prior_work_for_defense_counsel BOOLEAN DEFAULT false,
    prior_work_details TEXT,

    -- Documentation
    notes TEXT,
    waiver_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_conflict_checks_updated_at
    BEFORE UPDATE ON conflict_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for conflict_checks
CREATE INDEX idx_conflict_checks_case_id ON conflict_checks(case_id);
CREATE INDEX idx_conflict_checks_status ON conflict_checks(status);
CREATE INDEX idx_conflict_checks_check_date ON conflict_checks(check_date);
CREATE INDEX idx_conflict_checks_resolution ON conflict_checks(resolution);
CREATE INDEX idx_conflict_checks_parties ON conflict_checks USING GIN(parties_checked);
CREATE INDEX idx_conflict_checks_attorneys ON conflict_checks USING GIN(attorneys_checked);
CREATE INDEX idx_conflict_checks_firms ON conflict_checks USING GIN(firms_checked);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to communication_logs"
    ON communication_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to case_milestones"
    ON case_milestones FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to case_notes"
    ON case_notes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to conflict_checks"
    ON conflict_checks FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
