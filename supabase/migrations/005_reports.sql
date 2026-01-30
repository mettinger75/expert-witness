-- ============================================================================
-- Migration 005: Reports & Templates
-- Expert Witness Practice Management System
-- Tables: report_templates, template_sections, template_section_mappings,
--         reports, report_generation_queue
-- ============================================================================

-- ===========================================
-- Table: report_templates
-- ===========================================
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Details
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'preliminary_review', 'expert_report', 'medical_chronology',
        'deposition_prep', 'trial_prep', 'rebuttal_report',
        'supplemental_report', 'affidavit', 'declaration',
        'letter', 'custom'
    )),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',

    -- Content
    header_content TEXT,
    footer_content TEXT,
    default_content_template TEXT,
    css_styles TEXT,

    -- Configuration
    page_format JSONB DEFAULT '{"size": "letter", "orientation": "portrait", "margins": {"top": 1, "bottom": 1, "left": 1, "right": 1}}',
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_report_templates_type ON report_templates(template_type);
CREATE INDEX idx_report_templates_is_active ON report_templates(is_active);
CREATE INDEX idx_report_templates_category ON report_templates(category);

-- ===========================================
-- Table: template_sections
-- ===========================================
CREATE TABLE template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Section Details
    section_name VARCHAR(255) NOT NULL,
    section_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_content TEXT,

    -- Configuration
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_prompt TEXT,
    data_source VARCHAR(50) CHECK (data_source IN (
        'manual', 'case_data', 'timeline', 'documents',
        'depositions', 'billing', 'ai_generated', 'mixed'
    )),
    content_type VARCHAR(20) NOT NULL DEFAULT 'rich_text' CHECK (content_type IN (
        'rich_text', 'plain_text', 'table', 'list', 'timeline', 'mixed'
    )),

    -- Display
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_template_sections_updated_at
    BEFORE UPDATE ON template_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_template_sections_key ON template_sections(section_key);
CREATE INDEX idx_template_sections_is_active ON template_sections(is_active);

-- ===========================================
-- Table: template_section_mappings
-- ===========================================
CREATE TABLE template_section_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,

    -- Configuration
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_included BOOLEAN NOT NULL DEFAULT true,
    override_content TEXT,
    override_prompt TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(template_id, section_id)
);

CREATE INDEX idx_template_section_map_template ON template_section_mappings(template_id);
CREATE INDEX idx_template_section_map_section ON template_section_mappings(section_id);

-- ===========================================
-- Table: reports
-- ===========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,

    -- Report Details
    report_name VARCHAR(500) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'preliminary_review', 'expert_report', 'medical_chronology',
        'deposition_prep', 'trial_prep', 'rebuttal_report',
        'supplemental_report', 'affidavit', 'declaration',
        'letter', 'custom'
    )),
    report_number VARCHAR(30),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'in_progress', 'ai_generating', 'review',
        'revision', 'final', 'sent', 'superseded'
    )),

    -- Content
    content JSONB DEFAULT '{}',
    sections_data JSONB DEFAULT '[]',
    rendered_html TEXT,
    rendered_text TEXT,

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    is_latest_version BOOLEAN NOT NULL DEFAULT true,
    change_notes TEXT,

    -- Output
    output_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    output_format VARCHAR(20) DEFAULT 'pdf' CHECK (output_format IN (
        'pdf', 'docx', 'html', 'markdown'
    )),

    -- Review
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    approved_at TIMESTAMPTZ,

    -- Delivery
    sent_at TIMESTAMPTZ,
    sent_to TEXT[],
    sent_method VARCHAR(20) CHECK (sent_method IN (
        'email', 'mail', 'portal', 'hand_delivery'
    )),

    -- AI
    ai_generated_sections TEXT[],
    ai_generation_metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for reports
CREATE INDEX idx_reports_case_id ON reports(case_id);
CREATE INDEX idx_reports_template_id ON reports(template_id);
CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_is_latest_version ON reports(is_latest_version);
CREATE INDEX idx_reports_parent_report_id ON reports(parent_report_id);
CREATE INDEX idx_reports_output_document_id ON reports(output_document_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- ===========================================
-- Table: report_generation_queue
-- ===========================================
CREATE TABLE report_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Queue Details
    task_type VARCHAR(30) NOT NULL CHECK (task_type IN (
        'full_generation', 'section_generation', 'section_regeneration',
        'render_pdf', 'render_docx', 'ai_review', 'finalize'
    )),
    section_key VARCHAR(100),
    priority INTEGER NOT NULL DEFAULT 5,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'retry'
    )),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,

    -- Processing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB,

    -- Input/Output
    input_data JSONB,
    output_data JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_report_queue_updated_at
    BEFORE UPDATE ON report_generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_report_queue_report_id ON report_generation_queue(report_id);
CREATE INDEX idx_report_queue_case_id ON report_generation_queue(case_id);
CREATE INDEX idx_report_queue_status ON report_generation_queue(status);
CREATE INDEX idx_report_queue_priority ON report_generation_queue(priority);
CREATE INDEX idx_report_queue_task_type ON report_generation_queue(task_type);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_section_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to report_templates"
    ON report_templates FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to template_sections"
    ON template_sections FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to template_section_mappings"
    ON template_section_mappings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to reports"
    ON reports FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to report_generation_queue"
    ON report_generation_queue FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- Seed Data: Default Report Templates
-- ===========================================
INSERT INTO report_templates (template_name, template_type, description, is_default, sort_order) VALUES
    ('Preliminary Review Letter', 'preliminary_review',
     'Initial case evaluation letter to retaining attorney. Includes preliminary assessment of merit, identified issues, and recommendation to accept or decline the case.',
     true, 1),
    ('Expert Report - Defense', 'expert_report',
     'Comprehensive expert report for defense cases. Includes qualifications, materials reviewed, medical chronology, standard of care analysis, opinions, and basis for opinions.',
     true, 2),
    ('Medical Chronology', 'medical_chronology',
     'Detailed chronological summary of medical records. Organizes all medical events, treatments, and findings in timeline format with clinical analysis.',
     true, 3),
    ('Deposition Preparation Outline', 'deposition_prep',
     'Preparation materials for expert deposition. Includes anticipated questions, key talking points, documents to review, and areas of vulnerability.',
     true, 4),
    ('Trial Preparation Materials', 'trial_prep',
     'Comprehensive trial preparation package. Includes direct examination outline, cross-examination preparation, demonstrative exhibit suggestions, and key themes.',
     true, 5);

-- Seed Data: Default Template Sections
INSERT INTO template_sections (section_name, section_key, description, is_required, is_ai_generated, data_source, content_type, sort_order) VALUES
    ('Expert Qualifications', 'expert_qualifications', 'Expert witness qualifications and credentials', true, false, 'manual', 'rich_text', 1),
    ('Materials Reviewed', 'materials_reviewed', 'List of all materials reviewed for this case', true, false, 'documents', 'list', 2),
    ('Medical Chronology', 'medical_chronology', 'Chronological summary of medical events', true, true, 'timeline', 'timeline', 3),
    ('Standard of Care Analysis', 'standard_of_care', 'Analysis of applicable standard of care', true, true, 'ai_generated', 'rich_text', 4),
    ('Causation Analysis', 'causation_analysis', 'Analysis of causation issues', false, true, 'ai_generated', 'rich_text', 5),
    ('Expert Opinions', 'expert_opinions', 'Numbered expert opinions with basis', true, false, 'mixed', 'rich_text', 6),
    ('Basis for Opinions', 'basis_for_opinions', 'Detailed basis for each opinion', true, false, 'mixed', 'rich_text', 7),
    ('Damages Analysis', 'damages_analysis', 'Analysis of damages and outcomes', false, true, 'ai_generated', 'rich_text', 8),
    ('Case Summary', 'case_summary', 'Brief summary of the case facts', true, true, 'case_data', 'rich_text', 9),
    ('Conclusion', 'conclusion', 'Concluding statements and summary of opinions', true, false, 'manual', 'rich_text', 10),
    ('Preliminary Assessment', 'preliminary_assessment', 'Initial evaluation of case merit and key issues', true, true, 'ai_generated', 'rich_text', 11),
    ('Deposition Questions', 'deposition_questions', 'Anticipated deposition questions and suggested answers', false, true, 'ai_generated', 'list', 12),
    ('Cross-Examination Prep', 'cross_examination_prep', 'Preparation for cross-examination at trial', false, true, 'ai_generated', 'rich_text', 13),
    ('Demonstrative Exhibits', 'demonstrative_exhibits', 'Suggested demonstrative exhibits for trial', false, false, 'manual', 'list', 14),
    ('Key Themes', 'key_themes', 'Key themes and narrative for trial presentation', false, true, 'ai_generated', 'rich_text', 15);
