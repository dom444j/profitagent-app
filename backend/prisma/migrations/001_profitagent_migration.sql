-- ProFitAgent Migration Script
-- This script adds new tables and enums for the ProFitAgent rebranding

-- Create new enums
CREATE TYPE "AgentType" AS ENUM ('arbitrage', 'grid_trading', 'dca', 'scalping', 'swing_trading', 'market_making', 'momentum', 'mean_reversion');
CREATE TYPE "AgentAccessLevel" AS ENUM ('basic', 'standard', 'premium', 'elite', 'enterprise');
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'very_high');
CREATE TYPE "AgentStatus" AS ENUM ('active', 'inactive', 'maintenance', 'deprecated');
CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'paused', 'completed', 'canceled');
CREATE TYPE "ContractType" AS ENUM ('license_management', 'agent_manager', 'payment_processor', 'governance');
CREATE TYPE "BlockchainNetwork" AS ENUM ('bsc_mainnet', 'bsc_testnet', 'ethereum_mainnet', 'ethereum_goerli', 'polygon_mainnet', 'polygon_mumbai');
CREATE TYPE "ContractStatus" AS ENUM ('deployed', 'verified', 'paused', 'deprecated');
CREATE TYPE "TxStatus" AS ENUM ('pending', 'confirmed', 'failed', 'reverted');
CREATE TYPE "TelegramChannelType" AS ENUM ('license_basic', 'license_standard', 'license_premium', 'license_elite', 'license_enterprise', 'general_announcements', 'technical_analysis', 'market_updates', 'support', 'vip');
CREATE TYPE "ChannelStatus" AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'kicked', 'left', 'banned');

-- Create external_agents table
CREATE TABLE "external_agents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agent_type" "AgentType" NOT NULL,
    "access_level" "AgentAccessLevel" NOT NULL,
    "supported_exchanges" TEXT[],
    "supported_pairs" TEXT[],
    "min_capital" DECIMAL(10,2) NOT NULL,
    "max_capital" DECIMAL(10,2) NOT NULL,
    "expected_apy" DECIMAL(5,2) NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'active',
    "config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_agents_pkey" PRIMARY KEY ("id")
);

-- Create agent_assignments table
CREATE TABLE "agent_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "allocated_capital" DECIMAL(10,2) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id")
);

-- Create agent_performance table
CREATE TABLE "agent_performance" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_capital" DECIMAL(12,2) NOT NULL,
    "profit_loss" DECIMAL(10,2) NOT NULL,
    "roi_percentage" DECIMAL(5,4) NOT NULL,
    "trades_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2),
    "max_drawdown" DECIMAL(5,2),
    "sharpe_ratio" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_performance_pkey" PRIMARY KEY ("id")
);

-- Create smart_contracts table
CREATE TABLE "smart_contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contract_type" "ContractType" NOT NULL,
    "network" "BlockchainNetwork" NOT NULL,
    "address" TEXT NOT NULL,
    "abi_json" JSONB NOT NULL,
    "deployment_tx" TEXT,
    "deployer_address" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'deployed',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_contracts_pkey" PRIMARY KEY ("id")
);

-- Create contract_transactions table
CREATE TABLE "contract_transactions" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT,
    "tx_hash" TEXT NOT NULL,
    "function_name" TEXT NOT NULL,
    "parameters" JSONB,
    "gas_used" TEXT,
    "gas_price" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'pending',
    "block_number" TEXT,
    "block_timestamp" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_transactions_pkey" PRIMARY KEY ("id")
);

-- Create telegram_channels table
CREATE TABLE "telegram_channels" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_type" "TelegramChannelType" NOT NULL,
    "license_level" TEXT,
    "description" TEXT,
    "invite_link" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ChannelStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_channels_pkey" PRIMARY KEY ("id")
);

-- Create telegram_memberships table
CREATE TABLE "telegram_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_memberships_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "external_agents_code_key" ON "external_agents"("code");
CREATE UNIQUE INDEX "agent_assignments_user_id_agent_id_license_id_key" ON "agent_assignments"("user_id", "agent_id", "license_id");
CREATE UNIQUE INDEX "agent_performance_agent_id_date_key" ON "agent_performance"("agent_id", "date");
CREATE UNIQUE INDEX "smart_contracts_address_key" ON "smart_contracts"("address");
CREATE UNIQUE INDEX "contract_transactions_tx_hash_key" ON "contract_transactions"("tx_hash");
CREATE UNIQUE INDEX "telegram_channels_channel_id_key" ON "telegram_channels"("channel_id");
CREATE UNIQUE INDEX "telegram_memberships_user_id_channel_id_key" ON "telegram_memberships"("user_id", "channel_id");

-- Add foreign key constraints
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "external_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "user_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agent_performance" ADD CONSTRAINT "agent_performance_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "external_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_transactions" ADD CONSTRAINT "contract_transactions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "smart_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_transactions" ADD CONSTRAINT "contract_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "telegram_memberships" ADD CONSTRAINT "telegram_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telegram_memberships" ADD CONSTRAINT "telegram_memberships_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "telegram_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert initial data for external agents
INSERT INTO "external_agents" ("id", "code", "name", "description", "agent_type", "access_level", "supported_exchanges", "supported_pairs", "min_capital", "max_capital", "expected_apy", "risk_level", "config_json") VALUES
('agent_001', 'ARB_BASIC', 'Arbitrage Basic', 'Basic arbitrage trading between major exchanges', 'arbitrage', 'basic', '{"binance","okx"}', '{"BTC/USDT","ETH/USDT"}', 100.00, 1000.00, 12.50, 'low', '{"max_spread": 0.5, "min_volume": 10000}'),
('agent_002', 'GRID_STD', 'Grid Trading Standard', 'Standard grid trading strategy', 'grid_trading', 'standard', '{"binance","bybit"}', '{"BTC/USDT","ETH/USDT","BNB/USDT"}', 500.00, 5000.00, 18.75, 'medium', '{"grid_count": 20, "price_range": 0.1}'),
('agent_003', 'DCA_PREM', 'DCA Premium', 'Premium dollar cost averaging strategy', 'dca', 'premium', '{"binance","okx","bybit"}', '{"BTC/USDT","ETH/USDT","BNB/USDT","ADA/USDT"}', 1000.00, 10000.00, 25.00, 'medium', '{"interval_hours": 4, "deviation_threshold": 0.02}'),
('agent_004', 'SCAL_ELITE', 'Scalping Elite', 'High-frequency scalping for elite users', 'scalping', 'elite', '{"binance","okx","bybit","kucoin"}', '{"BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","MATIC/USDT"}', 5000.00, 50000.00, 35.00, 'high', '{"timeframe": "1m", "profit_target": 0.001}'),
('agent_005', 'MM_ENTERPRISE', 'Market Making Enterprise', 'Advanced market making for enterprise clients', 'market_making', 'enterprise', '{"binance","okx","bybit","kucoin","gate"}', '{"BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","MATIC/USDT","AVAX/USDT"}', 10000.00, 100000.00, 45.00, 'very_high', '{"spread_percentage": 0.002, "order_refresh_seconds": 30}');

-- Insert initial Telegram channels
INSERT INTO "telegram_channels" ("id", "channel_id", "channel_name", "channel_type", "license_level", "description") VALUES
('tg_001', '-1001234567890', 'ProFitAgent Basic Signals', 'license_basic', 'basic', 'Trading signals for basic license holders'),
('tg_002', '-1001234567891', 'ProFitAgent Standard Analytics', 'license_standard', 'standard', 'Market analysis for standard license holders'),
('tg_003', '-1001234567892', 'ProFitAgent Premium Insights', 'license_premium', 'premium', 'Premium market insights and strategies'),
('tg_004', '-1001234567893', 'ProFitAgent Elite VIP', 'license_elite', 'elite', 'Exclusive content for elite members'),
('tg_005', '-1001234567894', 'ProFitAgent Enterprise', 'license_enterprise', 'enterprise', 'Enterprise-level trading intelligence'),
('tg_006', '-1001234567895', 'ProFitAgent Announcements', 'general_announcements', NULL, 'General platform announcements'),
('tg_007', '-1001234567896', 'ProFitAgent Support', 'support', NULL, 'Customer support channel');

COMMIT;