-- ============================================================================
-- Migration 002: Documents
-- Expert Witness Practice Management System
-- Tables: document_folders, documents, document_annotations
-- ============================================================================

-- ===========================================
-- Table: document_folders
-- ===========================================
CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    folder_type VARCHAR(20) NOT NULL DEFAULT 'user_created' CHECK (folder_type IN (
        'system', 'user_created'
    )),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_document_folders_case_id ON document_folders(case_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_folder_type ON document_folders(folder_type);

-- ===========================================
-- Table: documents
-- ===========================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,

    -- File Information
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),

    -- Storage
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'case-documents',
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,

    -- Classification
    document_type VARCHAR(50) CHECK (document_type IN (
        'medical_record', 'billing_record', 'imaging', 'lab_result',
        'operative_report', 'anesthesia_record', 'nursing_notes',
        'physician_notes', 'discharge_summary', 'autopsy_report',
        'deposition_transcript', 'expert_report', 'pleading',
        'correspondence', 'insurance_document', 'photograph',
        'video', 'audio', 'other'
    )),
    document_date DATE,
    source_provider VARCHAR(255),
    source_facility VARCHAR(255),
    description TEXT,

    -- Bates Numbering
    bates_prefix VARCHAR(20),
    bates_start_number INTEGER,
    bates_end_number INTEGER,
    bates_range VARCHAR(50),

    -- Review Status
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN (
        'pending', 'in_review', 'reviewed', 'flagged', 'needs_attention'
    )),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    is_key_document BOOLEAN NOT NULL DEFAULT false,
    is_privileged BOOLEAN NOT NULL DEFAULT false,
    privilege_type VARCHAR(50),

    -- AI Processing
    ai_summary TEXT,
    ai_key_findings TEXT[],
    ai_extracted_dates JSONB,
    ai_extracted_providers JSONB,
    ai_extracted_diagnoses TEXT[],
    ai_extracted_procedures TEXT[],
    ai_extracted_medications TEXT[],
    ai_processing_status VARCHAR(20) DEFAULT 'pending' CHECK (ai_processing_status IN (
        'pending', 'processing', 'completed', 'failed', 'skipped'
    )),
    ai_processed_at TIMESTAMPTZ,
    ai_confidence_score DECIMAL(3,2),
    ocr_text TEXT,
    ocr_status VARCHAR(20) DEFAULT 'pending' CHECK (ocr_status IN (
        'pending', 'processing', 'completed', 'failed', 'not_needed'
    )),

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    is_latest_version BOOLEAN NOT NULL DEFAULT true,

    -- Page Info
    page_count INTEGER,
    total_pages INTEGER,

    -- Tags
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for documents
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_document_date ON documents(document_date);
CREATE INDEX idx_documents_review_status ON documents(review_status);
CREATE INDEX idx_documents_is_key_document ON documents(is_key_document);
CREATE INDEX idx_documents_ai_processing_status ON documents(ai_processing_status);
CREATE INDEX idx_documents_bates_prefix ON documents(bates_prefix);
CREATE INDEX idx_documents_bates_start ON documents(bates_start_number);
CREATE INDEX idx_documents_parent_document_id ON documents(parent_document_id);
CREATE INDEX idx_documents_is_latest_version ON documents(is_latest_version);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- ===========================================
-- Table: document_annotations
-- ===========================================
CREATE TABLE document_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    annotation_type VARCHAR(30) NOT NULL CHECK (annotation_type IN (
        'highlight', 'note', 'bookmark', 'redaction',
        'underline', 'strikethrough', 'rectangle', 'freetext',
        'arrow', 'circle', 'pin'
    )),
    page_number INTEGER NOT NULL,
    position_x DECIMAL(10,4),
    position_y DECIMAL(10,4),
    width DECIMAL(10,4),
    height DECIMAL(10,4),
    rotation DECIMAL(5,2) DEFAULT 0,
    content TEXT,
    color VARCHAR(20) DEFAULT '#FFFF00',
    opacity DECIMAL(3,2) DEFAULT 1.0,
    font_size INTEGER,
    is_important BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_document_annotations_updated_at
    BEFORE UPDATE ON document_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for document_annotations
CREATE INDEX idx_doc_annotations_document_id ON document_annotations(document_id);
CREATE INDEX idx_doc_annotations_type ON document_annotations(annotation_type);
CREATE INDEX idx_doc_annotations_page ON document_annotations(page_number);
CREATE INDEX idx_doc_annotations_is_important ON document_annotations(is_important);
CREATE INDEX idx_doc_annotations_tags ON document_annotations USING GIN(tags);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to document_folders"
    ON document_folders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to documents"
    ON documents FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to document_annotations"
    ON document_annotations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
