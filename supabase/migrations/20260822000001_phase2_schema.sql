-- Phase 2 Tables

-- 1. Event Attempts
CREATE TABLE event_attempts (
    attempt_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES webhook_events(event_id),
    status VARCHAR(20) NOT NULL,
    error TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Investigation Steps
CREATE TABLE investigation_steps (
    step_id VARCHAR(50) PRIMARY KEY,
    investigation_id VARCHAR(50) REFERENCES investigations(investigation_id),
    step_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'started',
    metadata JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. AI Tool Calls
CREATE TABLE ai_tool_calls (
    call_id VARCHAR(50) PRIMARY KEY,
    step_id VARCHAR(50) REFERENCES investigation_steps(step_id),
    tool_name VARCHAR(100) NOT NULL,
    arguments JSONB,
    result JSONB,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. AI Findings
CREATE TABLE ai_findings (
    finding_id VARCHAR(50) PRIMARY KEY,
    investigation_id VARCHAR(50) REFERENCES investigations(investigation_id),
    finding_text TEXT NOT NULL,
    confidence NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Match Candidates
CREATE TABLE match_candidates (
    candidate_id VARCHAR(50) PRIMARY KEY,
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    signals JSONB,
    confidence VARCHAR(20),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reconciliation Runs
CREATE TABLE reconciliation_runs (
    run_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    status VARCHAR(20) DEFAULT 'started',
    total_records INTEGER DEFAULT 0,
    exact_matches INTEGER DEFAULT 0,
    human_review INTEGER DEFAULT 0,
    unresolved INTEGER DEFAULT 0,
    exceptions_generated INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 7. Reconciliation Results
CREATE TABLE reconciliation_results (
    result_id VARCHAR(50) PRIMARY KEY,
    run_id VARCHAR(50) REFERENCES reconciliation_runs(run_id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    variance BIGINT DEFAULT 0,
    matched_to_type VARCHAR(50),
    matched_to_id VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Benchmark Runs
CREATE TABLE benchmark_runs (
    run_id VARCHAR(50) PRIMARY KEY,
    total_cases INTEGER,
    passed_cases INTEGER,
    failed_cases INTEGER,
    accuracy NUMERIC(5,2),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 9. Benchmark Cases
CREATE TABLE benchmark_cases (
    case_id VARCHAR(50) PRIMARY KEY,
    scenario_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    ground_truth_type VARCHAR(100) NOT NULL,
    ground_truth_amount BIGINT NOT NULL,
    expected_resolution VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_investigation_steps_inv_id ON investigation_steps(investigation_id);
CREATE INDEX idx_ai_findings_inv_id ON ai_findings(investigation_id);
CREATE INDEX idx_match_candidates_source ON match_candidates(source_entity_type, source_entity_id);
CREATE INDEX idx_exceptions_entity ON exceptions(entity_type, entity_id);
CREATE INDEX idx_webhook_events_entity ON webhook_events(entity_type, entity_id);
