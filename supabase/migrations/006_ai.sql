-- ============================================================================
-- Migration 006: AI Integration
-- Expert Witness Practice Management System
-- Tables: ai_conversations, ai_messages, ai_tasks, ai_prompts_library, ai_context_rules
-- ============================================================================

-- ===========================================
-- Table: ai_conversations
-- ===========================================
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

    -- Conversation Details
    title VARCHAR(500) NOT NULL DEFAULT 'New Conversation',
    conversation_type VARCHAR(30) NOT NULL DEFAULT 'general' CHECK (conversation_type IN (
        'general', 'case_analysis', 'document_review', 'report_drafting',
        'deposition_prep', 'research', 'timeline_review', 'standard_of_care',
        'causation_analysis', 'template'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'archived', 'deleted'
    )),

    -- Context
    context_type VARCHAR(30) CHECK (context_type IN (
        'case', 'document', 'timeline', 'deposition', 'report', 'global'
    )),
    context_id UUID,
    system_prompt TEXT,
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',

    -- Metadata
    message_count INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0,

    -- Pinning / Favorites
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_favorite BOOLEAN NOT NULL DEFAULT false,

    -- Tags
    tags TEXT[],

    -- Timestamps
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for ai_conversations
CREATE INDEX idx_ai_conversations_case_id ON ai_conversations(case_id);
CREATE INDEX idx_ai_conversations_type ON ai_conversations(conversation_type);
CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);
CREATE INDEX idx_ai_conversations_context ON ai_conversations(context_type, context_id);
CREATE INDEX idx_ai_conversations_is_pinned ON ai_conversations(is_pinned);
CREATE INDEX idx_ai_conversations_last_message ON ai_conversations(last_message_at);
CREATE INDEX idx_ai_conversations_tags ON ai_conversations USING GIN(tags);

-- ===========================================
-- Table: ai_messages
-- ===========================================
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

    -- Message Details
    role VARCHAR(20) NOT NULL CHECK (role IN (
        'system', 'user', 'assistant', 'tool'
    )),
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (content_type IN (
        'text', 'markdown', 'json', 'code', 'error', 'tool_call', 'tool_result'
    )),

    -- AI Metadata
    model VARCHAR(100),
    input_tokens INTEGER,
    output_tokens INTEGER,
    finish_reason VARCHAR(30),
    latency_ms INTEGER,

    -- Tool Use
    tool_calls JSONB,
    tool_results JSONB,
    function_name VARCHAR(100),

    -- Context
    context_documents UUID[],
    context_summary TEXT,

    -- User Interaction
    is_edited BOOLEAN NOT NULL DEFAULT false,
    original_content TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,

    -- Display
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_messages_updated_at
    BEFORE UPDATE ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for ai_messages
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
CREATE INDEX idx_ai_messages_context_docs ON ai_messages USING GIN(context_documents);

-- ===========================================
-- Table: ai_tasks
-- ===========================================
CREATE TABLE ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,

    -- Task Details
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'document_summary', 'timeline_extraction', 'case_analysis',
        'standard_of_care_review', 'causation_analysis', 'report_generation',
        'report_section', 'deposition_prep', 'research', 'ocr_processing',
        'document_classification', 'key_findings_extraction',
        'medication_extraction', 'provider_extraction', 'custom'
    )),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 5,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'processing', 'completed', 'failed',
        'cancelled', 'retry', 'paused'
    )),

    -- Processing
    model VARCHAR(100),
    prompt_id UUID,
    input_data JSONB,
    output_data JSONB,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost DECIMAL(10,4),

    -- Target Records
    target_type VARCHAR(30) CHECK (target_type IN (
        'document', 'case', 'timeline_event', 'deposition',
        'report', 'report_section', 'batch'
    )),
    target_id UUID,
    target_ids UUID[],

    -- Execution
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB,

    -- Progress
    progress_percent INTEGER DEFAULT 0,
    progress_message VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_tasks_updated_at
    BEFORE UPDATE ON ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for ai_tasks
CREATE INDEX idx_ai_tasks_case_id ON ai_tasks(case_id);
CREATE INDEX idx_ai_tasks_conversation_id ON ai_tasks(conversation_id);
CREATE INDEX idx_ai_tasks_task_type ON ai_tasks(task_type);
CREATE INDEX idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX idx_ai_tasks_priority ON ai_tasks(priority);
CREATE INDEX idx_ai_tasks_target ON ai_tasks(target_type, target_id);
CREATE INDEX idx_ai_tasks_created_at ON ai_tasks(created_at);

-- ===========================================
-- Table: ai_prompts_library
-- ===========================================
CREATE TABLE ai_prompts_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Prompt Details
    prompt_name VARCHAR(255) NOT NULL,
    prompt_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'document_analysis', 'case_analysis', 'report_generation',
        'deposition_prep', 'research', 'timeline', 'standard_of_care',
        'causation', 'general', 'custom'
    )),

    -- Content
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,
    output_format VARCHAR(20) DEFAULT 'text' CHECK (output_format IN (
        'text', 'markdown', 'json', 'structured'
    )),
    output_schema JSONB,

    -- Configuration
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    temperature DECIMAL(3,2) DEFAULT 0.3,
    max_tokens INTEGER DEFAULT 4096,
    variables JSONB DEFAULT '[]',

    -- Usage
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_prompts_library_updated_at
    BEFORE UPDATE ON ai_prompts_library
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_ai_prompts_key ON ai_prompts_library(prompt_key);
CREATE INDEX idx_ai_prompts_category ON ai_prompts_library(category);
CREATE INDEX idx_ai_prompts_is_active ON ai_prompts_library(is_active);
CREATE INDEX idx_ai_prompts_is_system ON ai_prompts_library(is_system);
CREATE INDEX idx_ai_prompts_tags ON ai_prompts_library USING GIN(tags);

-- ===========================================
-- Table: ai_context_rules
-- ===========================================
CREATE TABLE ai_context_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule Details
    rule_name VARCHAR(255) NOT NULL,
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- Context
    context_type VARCHAR(30) NOT NULL CHECK (context_type IN (
        'global', 'case_type', 'document_type', 'report_type',
        'conversation_type', 'task_type'
    )),
    context_value VARCHAR(100),

    -- Rule Content
    instructions TEXT NOT NULL,
    include_data TEXT[] DEFAULT '{}',
    exclude_data TEXT[] DEFAULT '{}',
    max_context_tokens INTEGER DEFAULT 8000,
    priority INTEGER NOT NULL DEFAULT 5,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_context_rules_updated_at
    BEFORE UPDATE ON ai_context_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_ai_context_rules_key ON ai_context_rules(rule_key);
CREATE INDEX idx_ai_context_rules_context ON ai_context_rules(context_type, context_value);
CREATE INDEX idx_ai_context_rules_is_active ON ai_context_rules(is_active);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to ai_conversations"
    ON ai_conversations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to ai_messages"
    ON ai_messages FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to ai_tasks"
    ON ai_tasks FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to ai_prompts_library"
    ON ai_prompts_library FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to ai_context_rules"
    ON ai_context_rules FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- Seed Data: Default AI Prompts
-- ===========================================
INSERT INTO ai_prompts_library (prompt_name, prompt_key, description, category, system_prompt, user_prompt_template, output_format, is_system, variables, tags) VALUES

('Document Summary', 'document_summary', 'Generate a concise summary of a medical or legal document, extracting key findings, dates, providers, and relevant information.', 'document_analysis',
 'You are an expert medical-legal document analyst assisting an anesthesiology expert witness (Marc Ettinger, MD). Analyze documents with clinical precision and legal relevance. Focus on facts, avoid speculation, and highlight anything relevant to standard of care, causation, or damages.',
 'Please analyze the following document and provide:

1. **Document Type**: Identify the type of medical/legal document
2. **Date(s)**: Extract all relevant dates
3. **Provider(s)**: List all healthcare providers mentioned
4. **Patient Information**: Relevant patient details
5. **Key Findings**: Most important clinical findings or legal points
6. **Diagnoses**: All diagnoses mentioned
7. **Procedures/Treatments**: All procedures or treatments described
8. **Medications**: All medications referenced
9. **Relevance to Case**: How this document relates to the case issues
10. **Notable Concerns**: Any red flags, deviations from standard of care, or areas requiring further investigation

Document Content:
{{document_text}}

Case Context:
{{case_summary}}',
 'markdown', true,
 '[{"name": "document_text", "required": true}, {"name": "case_summary", "required": false}]',
 ARRAY['document', 'summary', 'analysis']),

('Timeline Extraction', 'timeline_extraction', 'Extract chronological medical events from a document for the medical records timeline.', 'timeline',
 'You are a medical records analyst specializing in creating detailed medical chronologies for expert witness cases. Extract every clinically significant event with precise dates and times when available. Be thorough and accurate.',
 'Extract all chronological medical events from the following document. For each event, provide:

1. **Date** (and time if available)
2. **Event Type** (admission, procedure, medication, lab result, etc.)
3. **Event Title** (brief description)
4. **Event Description** (detailed description)
5. **Provider** (who was involved)
6. **Facility** (where it occurred)
7. **Clinical Details** (relevant vital signs, lab values, medications)
8. **Significance** (critical/high/medium/low importance to the case)
9. **Standard of Care Relevance** (if applicable)

Format the output as a JSON array of timeline events.

Document Content:
{{document_text}}

Case Context:
{{case_summary}}

Known Issues:
{{key_issues}}',
 'json', true,
 '[{"name": "document_text", "required": true}, {"name": "case_summary", "required": false}, {"name": "key_issues", "required": false}]',
 ARRAY['timeline', 'extraction', 'chronology']),

('Standard of Care Analysis', 'standard_of_care_analysis', 'Analyze the standard of care issues in an anesthesiology case.', 'standard_of_care',
 'You are assisting Marc Ettinger, MD, a board-certified anesthesiologist serving as an expert witness. Provide analysis based on current anesthesiology standards, ASA guidelines, and accepted medical practice. Be thorough, evidence-based, and clinically precise. Identify both potential deviations from and compliance with the standard of care.',
 'Please analyze the standard of care issues in this case:

**Case Type**: {{case_type}}
**Specialty Area**: {{specialty_area}}
**Side**: {{side}}
**Date of Incident**: {{date_of_incident}}

**Case Summary**:
{{case_summary}}

**Key Issues Identified**:
{{key_issues}}

**Medical Timeline Summary**:
{{timeline_summary}}

Please provide:
1. **Applicable Standard of Care**: What the standard of care required in this situation
2. **Relevant Guidelines**: ASA guidelines, institutional protocols, or literature that apply
3. **Analysis of Each Issue**: For each key issue, whether the standard was met or breached
4. **Supporting Evidence**: What evidence supports each conclusion
5. **Potential Counterarguments**: Arguments the opposing side might raise
6. **Areas Needing More Information**: What additional records or information would strengthen the analysis
7. **Overall Assessment**: Summary opinion on standard of care compliance',
 'markdown', true,
 '[{"name": "case_type", "required": true}, {"name": "specialty_area", "required": true}, {"name": "side", "required": true}, {"name": "date_of_incident", "required": false}, {"name": "case_summary", "required": true}, {"name": "key_issues", "required": true}, {"name": "timeline_summary", "required": false}]',
 ARRAY['standard_of_care', 'analysis', 'anesthesiology']),

('Case Summary', 'case_summary', 'Generate a comprehensive case summary incorporating all available information.', 'case_analysis',
 'You are a medical-legal analyst assisting an anesthesiology expert witness. Create clear, comprehensive case summaries that organize complex medical and legal information. Be objective, thorough, and highlight the most important aspects of the case.',
 'Generate a comprehensive case summary based on the following information:

**Case**: {{case_name}} ({{case_number}})
**Type**: {{case_type}}
**Side**: {{side}}
**Patient**: {{patient_name}}
**Date of Incident**: {{date_of_incident}}
**Patient Outcome**: {{patient_outcome}}

**Brief Summary**:
{{brief_summary}}

**Key Issues**:
{{key_issues}}

**Timeline Events** ({{timeline_count}} events):
{{timeline_summary}}

**Documents Reviewed** ({{document_count}} documents):
{{documents_summary}}

**Depositions**:
{{depositions_summary}}

Please provide a structured case summary including:
1. **Case Overview**: Brief factual background
2. **Patient History**: Relevant medical history
3. **Incident Summary**: What happened during the incident
4. **Post-Incident Course**: What happened after the incident
5. **Key Medical Issues**: Most important medical questions
6. **Current Status**: Where the case stands
7. **Strengths**: Strongest aspects of the case
8. **Weaknesses**: Areas of vulnerability
9. **Recommendations**: Suggested next steps',
 'markdown', true,
 '[{"name": "case_name", "required": true}, {"name": "case_number", "required": true}, {"name": "case_type", "required": true}, {"name": "side", "required": true}, {"name": "patient_name", "required": false}, {"name": "date_of_incident", "required": false}, {"name": "patient_outcome", "required": false}, {"name": "brief_summary", "required": false}, {"name": "key_issues", "required": false}, {"name": "timeline_summary", "required": false}, {"name": "timeline_count", "required": false}, {"name": "documents_summary", "required": false}, {"name": "document_count", "required": false}, {"name": "depositions_summary", "required": false}]',
 ARRAY['case', 'summary', 'comprehensive']),

('Deposition Preparation', 'deposition_prep', 'Generate deposition preparation materials including anticipated questions and key talking points.', 'deposition_prep',
 'You are assisting Marc Ettinger, MD in preparing for an expert witness deposition. Generate thorough preparation materials that anticipate opposing counsel questions, identify areas of vulnerability, and reinforce key opinions. Consider both direct and cross-examination scenarios.',
 'Prepare deposition materials for the following case:

**Case**: {{case_name}} ({{case_number}})
**Type**: {{case_type}}
**Side**: {{side}} (Dr. Ettinger is retained by the {{side}})
**Deponent**: {{deponent_name}} ({{deponent_role}})

**Case Summary**:
{{case_summary}}

**Key Issues**:
{{key_issues}}

**Expert Opinions**:
{{opinions}}

**Standard of Care Issues**:
{{standard_of_care_issues}}

Please generate:
1. **Key Talking Points**: Critical points to emphasize during testimony
2. **Anticipated Direct Questions**: Questions from retaining counsel
3. **Anticipated Cross-Examination Questions**: Questions opposing counsel may ask
4. **Difficult Questions & Suggested Responses**: How to handle challenging questions
5. **Documents to Review Before Deposition**: Key documents to re-examine
6. **Areas of Vulnerability**: Weak points in the case or opinions
7. **Impeachment Risks**: Potential inconsistencies or contradictions
8. **Key Exhibits**: Important documents that may be referenced
9. **Dos and Don''ts**: Behavioral and substantive guidance for the deposition
10. **Objection Points**: Areas where retaining counsel should consider objecting',
 'markdown', true,
 '[{"name": "case_name", "required": true}, {"name": "case_number", "required": true}, {"name": "case_type", "required": true}, {"name": "side", "required": true}, {"name": "deponent_name", "required": false}, {"name": "deponent_role", "required": false}, {"name": "case_summary", "required": true}, {"name": "key_issues", "required": true}, {"name": "opinions", "required": false}, {"name": "standard_of_care_issues", "required": false}]',
 ARRAY['deposition', 'preparation', 'testimony']);

-- Seed Default Context Rules
INSERT INTO ai_context_rules (rule_name, rule_key, description, context_type, instructions, include_data, priority, is_active) VALUES
('Global Expert Context', 'global_expert_context', 'Always include expert witness identity and specialty context.', 'global',
 'You are assisting Marc Ettinger, MD, a board-certified anesthesiologist who serves as a medical expert witness. Dr. Ettinger reviews cases involving anesthesia-related care, evaluates standard of care compliance, and provides expert opinions for litigation. Always maintain clinical precision, objectivity, and legal awareness in your responses.',
 ARRAY['expert_profile', 'specialty_info'], 1, true),

('Medical Malpractice Context', 'medical_malpractice_context', 'Additional context for medical malpractice cases.', 'case_type', 'medical_malpractice',
 ARRAY['standard_of_care_framework', 'causation_framework', 'damages_framework'], 3, true),

('Document Review Context', 'document_review_context', 'Context rules for AI document review tasks.', 'task_type', 'document_summary',
 ARRAY['case_summary', 'key_issues', 'existing_timeline'], 3, true),

('Report Generation Context', 'report_generation_context', 'Context rules for AI report generation.', 'task_type', 'report_generation',
 ARRAY['case_summary', 'key_issues', 'timeline', 'documents_reviewed', 'depositions', 'opinions'], 2, true);
