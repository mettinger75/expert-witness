-- ============================================================================
-- Migration 003: Medical Timeline & Depositions
-- Expert Witness Practice Management System
-- Tables: medical_records_timeline, depositions, deposition_excerpts
-- ============================================================================

-- ===========================================
-- Table: medical_records_timeline
-- ===========================================
CREATE TABLE medical_records_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- Event Details
    event_date DATE NOT NULL,
    event_time TIME,
    event_end_date DATE,
    event_end_time TIME,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'admission', 'discharge', 'surgery', 'procedure', 'consultation',
        'diagnosis', 'medication_start', 'medication_stop', 'medication_change',
        'lab_result', 'imaging', 'vital_signs', 'nursing_note',
        'physician_note', 'anesthesia_event', 'complication', 'code_event',
        'transfer', 'death', 'office_visit', 'er_visit', 'icu_admission',
        'icu_discharge', 'intubation', 'extubation', 'other'
    )),
    event_title VARCHAR(500) NOT NULL,
    event_description TEXT,

    -- Provider/Facility
    provider_name VARCHAR(255),
    provider_specialty VARCHAR(100),
    facility_name VARCHAR(255),
    department VARCHAR(100),

    -- Clinical Detail (JSONB)
    clinical_details JSONB DEFAULT '{}',
    vital_signs JSONB DEFAULT '{}',
    medications JSONB DEFAULT '[]',
    lab_values JSONB DEFAULT '[]',
    diagnoses TEXT[],
    procedures TEXT[],

    -- Significance
    is_critical_event BOOLEAN NOT NULL DEFAULT false,
    critical_event_reason TEXT,
    relevance_to_case TEXT,
    standard_of_care_note TEXT,
    causation_note TEXT,

    -- Source
    source_page_number INTEGER,
    source_bates_number VARCHAR(50),
    source_quote TEXT,

    -- AI-Generated Flags
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_confidence DECIMAL(3,2),
    ai_flags TEXT[],
    ai_suggested_importance VARCHAR(10) CHECK (ai_suggested_importance IN (
        'critical', 'high', 'medium', 'low'
    )),

    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    -- Display
    sort_order INTEGER DEFAULT 0,
    color_code VARCHAR(20),
    icon VARCHAR(50),
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_medical_timeline_updated_at
    BEFORE UPDATE ON medical_records_timeline
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for medical_records_timeline
CREATE INDEX idx_med_timeline_case_id ON medical_records_timeline(case_id);
CREATE INDEX idx_med_timeline_document_id ON medical_records_timeline(document_id);
CREATE INDEX idx_med_timeline_event_date ON medical_records_timeline(event_date);
CREATE INDEX idx_med_timeline_event_type ON medical_records_timeline(event_type);
CREATE INDEX idx_med_timeline_is_critical ON medical_records_timeline(is_critical_event);
CREATE INDEX idx_med_timeline_ai_generated ON medical_records_timeline(ai_generated);
CREATE INDEX idx_med_timeline_is_verified ON medical_records_timeline(is_verified);
CREATE INDEX idx_med_timeline_provider ON medical_records_timeline(provider_name);
CREATE INDEX idx_med_timeline_facility ON medical_records_timeline(facility_name);
CREATE INDEX idx_med_timeline_tags ON medical_records_timeline USING GIN(tags);
CREATE INDEX idx_med_timeline_diagnoses ON medical_records_timeline USING GIN(diagnoses);
CREATE INDEX idx_med_timeline_procedures ON medical_records_timeline USING GIN(procedures);
CREATE INDEX idx_med_timeline_clinical_details ON medical_records_timeline USING GIN(clinical_details);

-- ===========================================
-- Table: depositions
-- ===========================================
CREATE TABLE depositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Deposition Details
    deponent_name VARCHAR(255) NOT NULL,
    deponent_role VARCHAR(50) CHECK (deponent_role IN (
        'plaintiff', 'defendant', 'expert_witness', 'treating_physician',
        'nurse', 'first_responder', 'fact_witness', 'corporate_representative',
        'other'
    )),
    deposition_type VARCHAR(30) NOT NULL DEFAULT 'oral' CHECK (deposition_type IN (
        'oral', 'written', 'video', 'telephonic'
    )),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed',
        'transcript_pending', 'transcript_received', 'reviewed'
    )),

    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    duration_hours DECIMAL(5,2),

    -- Location
    location_name VARCHAR(255),
    location_address TEXT,
    is_remote BOOLEAN NOT NULL DEFAULT false,
    remote_platform VARCHAR(50),
    remote_link TEXT,

    -- Participants
    examining_attorney VARCHAR(255),
    defending_attorney VARCHAR(255),
    court_reporter VARCHAR(255),
    videographer VARCHAR(255),

    -- Transcript
    transcript_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    transcript_received_date DATE,
    total_pages INTEGER,
    total_exhibits INTEGER,

    -- Expert's Notes
    preparation_notes TEXT,
    key_testimony_points TEXT[],
    impeachment_material TEXT[],
    follow_up_questions TEXT[],
    assessment_notes TEXT,
    deponent_credibility VARCHAR(20) CHECK (deponent_credibility IN (
        'strong', 'moderate', 'weak', 'inconsistent', 'not_assessed'
    )),

    -- AI Analysis
    ai_summary TEXT,
    ai_key_admissions TEXT[],
    ai_contradictions TEXT[],
    ai_processed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_depositions_updated_at
    BEFORE UPDATE ON depositions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for depositions
CREATE INDEX idx_depositions_case_id ON depositions(case_id);
CREATE INDEX idx_depositions_status ON depositions(status);
CREATE INDEX idx_depositions_scheduled_date ON depositions(scheduled_date);
CREATE INDEX idx_depositions_deponent_name ON depositions(deponent_name);
CREATE INDEX idx_depositions_transcript_doc ON depositions(transcript_document_id);

-- ===========================================
-- Table: deposition_excerpts
-- ===========================================
CREATE TABLE deposition_excerpts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposition_id UUID NOT NULL REFERENCES depositions(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Excerpt Details
    page_number_start INTEGER NOT NULL,
    line_number_start INTEGER,
    page_number_end INTEGER,
    line_number_end INTEGER,
    excerpt_text TEXT NOT NULL,

    -- Classification
    excerpt_type VARCHAR(30) CHECK (excerpt_type IN (
        'admission', 'contradiction', 'key_testimony', 'standard_of_care',
        'causation', 'damages', 'credibility', 'foundation',
        'impeachment', 'expert_opinion', 'factual', 'other'
    )),
    topic VARCHAR(255),
    importance VARCHAR(10) DEFAULT 'medium' CHECK (importance IN (
        'critical', 'high', 'medium', 'low'
    )),

    -- Analysis
    analysis_notes TEXT,
    related_timeline_event_id UUID REFERENCES medical_records_timeline(id) ON DELETE SET NULL,
    related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- AI
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_relevance_score DECIMAL(3,2),

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_deposition_excerpts_updated_at
    BEFORE UPDATE ON deposition_excerpts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for deposition_excerpts
CREATE INDEX idx_depo_excerpts_deposition_id ON deposition_excerpts(deposition_id);
CREATE INDEX idx_depo_excerpts_case_id ON deposition_excerpts(case_id);
CREATE INDEX idx_depo_excerpts_type ON deposition_excerpts(excerpt_type);
CREATE INDEX idx_depo_excerpts_importance ON deposition_excerpts(importance);
CREATE INDEX idx_depo_excerpts_topic ON deposition_excerpts(topic);
CREATE INDEX idx_depo_excerpts_timeline_event ON deposition_excerpts(related_timeline_event_id);
CREATE INDEX idx_depo_excerpts_tags ON deposition_excerpts USING GIN(tags);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE medical_records_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE depositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposition_excerpts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to medical_records_timeline"
    ON medical_records_timeline FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to depositions"
    ON depositions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to deposition_excerpts"
    ON deposition_excerpts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
