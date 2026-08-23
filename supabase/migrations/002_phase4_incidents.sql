-- ============================================================================
-- TRACE - Phase 4 DB Migration
-- Advanced Financial Intelligence + Real-Time Operations
-- ============================================================================

-- 1. Incidents
CREATE TABLE IF NOT EXISTS incidents (
    incident_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'LOW', -- CRITICAL, HIGH, MEDIUM, LOW
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, AI_RECOMMENDED, HUMAN_REVIEW_REQUIRED, HUMAN_APPROVED, HUMAN_REJECTED, RESOLVED
    financial_impact BIGINT DEFAULT 0,
    potential_loss BIGINT DEFAULT 0,
    confirmed_loss BIGINT DEFAULT 0,
    recovered_amount BIGINT DEFAULT 0,
    unexplained_amount BIGINT DEFAULT 0,
    investigation_id VARCHAR(50) REFERENCES investigations(investigation_id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    owner VARCHAR(100)
);

-- 2. Modify Exceptions to link to Incidents and add Anomaly Score
ALTER TABLE exceptions 
ADD COLUMN IF NOT EXISTS incident_id VARCHAR(50) REFERENCES incidents(incident_id),
ADD COLUMN IF NOT EXISTS anomaly_score NUMERIC(5,2) DEFAULT 0;

-- 3. Merchant Baselines
CREATE TABLE IF NOT EXISTS merchant_baselines (
    baseline_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    metric_name VARCHAR(100) NOT NULL,
    window_days INTEGER NOT NULL, -- e.g., 7, 30, 90
    value NUMERIC(10,4) NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Merchant Financial Health
CREATE TABLE IF NOT EXISTS merchant_health (
    merchant_id VARCHAR(50) PRIMARY KEY REFERENCES merchants(merchant_id),
    health_score NUMERIC(5,2) DEFAULT 100, -- 0-100
    status VARCHAR(20) DEFAULT 'Healthy', -- Healthy, Watch, At Risk, Critical
    payment_success_rate NUMERIC(5,2),
    refund_rate NUMERIC(5,2),
    dispute_rate NUMERIC(5,2),
    settlement_variance BIGINT DEFAULT 0,
    webhook_reliability NUMERIC(5,2),
    unresolved_exposure BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_exceptions_incident_id ON exceptions(incident_id);
CREATE INDEX IF NOT EXISTS idx_incidents_merchant_id ON incidents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_baselines_merchant_metric ON merchant_baselines(merchant_id, metric_name, window_days);
