-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE order_status AS ENUM ('created', 'attempted', 'paid', 'failed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_method AS ENUM ('upi', 'card', 'netbanking', 'wallet');
CREATE TYPE refund_status AS ENUM ('created', 'processed', 'failed');
CREATE TYPE dispute_status AS ENUM ('created', 'action_required', 'under_review', 'won', 'lost', 'closed');
CREATE TYPE settlement_status AS ENUM ('created', 'initiated', 'processed', 'failed', 'reversed');
CREATE TYPE adjustment_type AS ENUM ('fee_adjustment', 'refund_adjustment', 'dispute_adjustment', 'settlement_adjustment', 'manual_adjustment');
CREATE TYPE match_status AS ENUM ('unmatched', 'matched', 'pending_review');
CREATE TYPE investigation_status AS ENUM ('created', 'planning', 'retrieving', 'analyzing', 'matching', 'verifying', 'resolved', 'partially_resolved', 'unresolved', 'human_review');

-- 1. Merchants
CREATE TABLE merchants (
    merchant_id VARCHAR(50) PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    mode VARCHAR(10) DEFAULT 'test',
    settlement_cycle VARCHAR(10) DEFAULT 'T+2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers
CREATE TABLE customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    contact VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    customer_id VARCHAR(50) REFERENCES customers(customer_id),
    amount BIGINT NOT NULL, -- in paise
    currency VARCHAR(3) DEFAULT 'INR',
    receipt VARCHAR(100),
    status order_status DEFAULT 'created',
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. Payments
CREATE TABLE payments (
    payment_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    customer_id VARCHAR(50) REFERENCES customers(customer_id),
    amount BIGINT NOT NULL, -- in paise
    currency VARCHAR(3) DEFAULT 'INR',
    status payment_status DEFAULT 'created',
    method payment_method,
    captured BOOLEAN DEFAULT FALSE,
    amount_refunded BIGINT DEFAULT 0,
    amount_transferred BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- 5. Refunds
CREATE TABLE refunds (
    refund_id VARCHAR(50) PRIMARY KEY,
    payment_id VARCHAR(50) REFERENCES payments(payment_id),
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    amount BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status refund_status DEFAULT 'created',
    speed_requested VARCHAR(20) DEFAULT 'normal',
    speed_processed VARCHAR(20) DEFAULT 'normal',
    reason VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 6. Disputes
CREATE TABLE disputes (
    dispute_id VARCHAR(50) PRIMARY KEY,
    payment_id VARCHAR(50) REFERENCES payments(payment_id),
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    amount BIGINT NOT NULL,
    reason VARCHAR(255),
    status dispute_status DEFAULT 'created',
    phase VARCHAR(50),
    action_required BOOLEAN DEFAULT TRUE,
    evidence_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 7. Settlements
CREATE TABLE settlements (
    settlement_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    amount BIGINT NOT NULL, -- Net amount in paise
    fees BIGINT NOT NULL DEFAULT 0,
    tax BIGINT NOT NULL DEFAULT 0,
    utr VARCHAR(100),
    status settlement_status DEFAULT 'created',
    settlement_period_start TIMESTAMPTZ,
    settlement_period_end TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    bank_credit_at TIMESTAMPTZ
);

-- 8. Adjustments
CREATE TABLE adjustments (
    adjustment_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    settlement_id VARCHAR(50) REFERENCES settlements(settlement_id),
    type adjustment_type NOT NULL,
    amount BIGINT NOT NULL, -- Can be negative or positive
    reason VARCHAR(255),
    reference VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Settlement Items
CREATE TABLE settlement_items (
    settlement_item_id VARCHAR(50) PRIMARY KEY,
    settlement_id VARCHAR(50) REFERENCES settlements(settlement_id),
    payment_id VARCHAR(50) REFERENCES payments(payment_id),
    refund_id VARCHAR(50) REFERENCES refunds(refund_id),
    dispute_id VARCHAR(50) REFERENCES disputes(dispute_id),
    adjustment_id VARCHAR(50) REFERENCES adjustments(adjustment_id),
    gross_amount BIGINT NOT NULL,
    fee BIGINT DEFAULT 0,
    tax BIGINT DEFAULT 0,
    net_amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bank Accounts & Transactions
CREATE TABLE bank_accounts (
    bank_account_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    account_number VARCHAR(50),
    ifsc VARCHAR(20),
    bank_name VARCHAR(100)
);

CREATE TABLE bank_transactions (
    bank_transaction_id VARCHAR(50) PRIMARY KEY,
    bank_account_id VARCHAR(50) REFERENCES bank_accounts(bank_account_id),
    value_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    description TEXT,
    credit BIGINT DEFAULT 0,
    debit BIGINT DEFAULT 0,
    balance BIGINT NOT NULL,
    utr VARCHAR(100),
    reference VARCHAR(100),
    match_status match_status DEFAULT 'unmatched',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Webhooks
CREATE TABLE webhook_events (
    event_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    attempt INTEGER DEFAULT 0,
    error_message TEXT
);

-- 12. Investigations
CREATE TABLE investigations (
    investigation_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    question TEXT,
    intent VARCHAR(100),
    target_entity_type VARCHAR(50),
    target_entity_id VARCHAR(50),
    status investigation_status DEFAULT 'created',
    root_cause TEXT,
    explained_amount BIGINT DEFAULT 0,
    unexplained_amount BIGINT DEFAULT 0,
    confidence NUMERIC(5,2),
    recommended_action VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evidence (
    evidence_id VARCHAR(50) PRIMARY KEY,
    investigation_id VARCHAR(50) REFERENCES investigations(investigation_id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    evidence_type VARCHAR(50),
    source VARCHAR(50),
    amount BIGINT,
    relevance_score NUMERIC(5,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Exceptions
CREATE TABLE exceptions (
    exception_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    severity VARCHAR(20),
    type VARCHAR(50) NOT NULL,
    amount BIGINT,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    confidence NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'open',
    investigation_id VARCHAR(50) REFERENCES investigations(investigation_id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    owner VARCHAR(100)
);

-- 14. Audit Logs
CREATE TABLE audit_logs (
    audit_id VARCHAR(50) PRIMARY KEY,
    merchant_id VARCHAR(50) REFERENCES merchants(merchant_id),
    actor_type VARCHAR(20) NOT NULL, -- 'USER', 'AI_AGENT', 'SYSTEM', 'WEBHOOK'
    actor_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
