-- Pi Supernode V20 Production Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Blocks Table (V20 Optimized)
CREATE TABLE blocks (
    height BIGINT PRIMARY KEY,
    hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transactions_count INTEGER DEFAULT 0,
    validator BYTEA NOT NULL,
    signature BYTEA NOT NULL,
    state_root BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX idx_blocks_validator ON blocks(validator);

-- Transactions Table (V20 Atomic)
CREATE TABLE transactions (
    txid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash BYTEA NOT NULL UNIQUE,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount BIGINT NOT NULL,
    fee BIGINT DEFAULT 0,
    signature BYTEA NOT NULL,
    block_height BIGINT REFERENCES blocks(height),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tx_from ON transactions(from_address);
CREATE INDEX idx_tx_to ON transactions(to_address);
CREATE INDEX idx_tx_status ON transactions(status);

-- Balances Table (Real-time V20)
CREATE TABLE wallet_balances (
    address TEXT PRIMARY KEY,
    balance BIGINT DEFAULT 0,
    nonce BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Peers Table (Kademlia V20)
CREATE TABLE peers (
    peer_id TEXT PRIMARY KEY,
    multiaddr TEXT NOT NULL,
    reputation INTEGER DEFAULT 0,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_bootstrap BOOLEAN DEFAULT FALSE
);

-- V20 External Transfers (Key Feature)
CREATE TABLE external_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txid TEXT NOT NULL,
    chain VARCHAR(20) NOT NULL, -- 'ethereum', 'bsc', 'solana'
    bridge_tx_hash TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
