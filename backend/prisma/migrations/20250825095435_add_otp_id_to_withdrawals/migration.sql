-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('pending', 'expired', 'paid', 'confirmed', 'canceled');

-- CreateEnum
CREATE TYPE "public"."LicenseStatus" AS ENUM ('active', 'paused', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "public"."CommissionStatus" AS ENUM ('pending', 'released', 'canceled');

-- CreateEnum
CREATE TYPE "public"."BonusStatus" AS ENUM ('pending', 'released', 'canceled');

-- CreateEnum
CREATE TYPE "public"."WithdrawalStatus" AS ENUM ('requested', 'otp_sent', 'otp_verified', 'approved', 'paid', 'rejected', 'canceled');

-- CreateEnum
CREATE TYPE "public"."LedgerDirection" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "public"."LedgerRefType" AS ENUM ('order', 'license', 'earning', 'referral_commission', 'bonus', 'withdrawal', 'admin_adjustment', 'system');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'user',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'active',
    "ref_code" TEXT NOT NULL,
    "sponsor_id" TEXT,
    "usdt_bep20_address" TEXT,
    "telegram_user_id" TEXT,
    "telegram_link_status" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_wallets" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_assigned_at" TIMESTAMP(3),
    "assigned_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."license_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "price_usdt" DECIMAL(10,2) NOT NULL,
    "daily_rate" DECIMAL(5,4) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "max_cap_percentage" DECIMAL(5,2) NOT NULL,
    "cashback_cap" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "potential_cap" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "description" TEXT,
    "sla_hours" INTEGER,
    "badge" TEXT,
    "target_user" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders_deposits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "amount_usdt" DECIMAL(10,2) NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "tx_hash" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'pending',
    "reserved_wallet_id" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'USDT',
    "paid_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "raw_chain_payload" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_licenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "principal_usdt" DECIMAL(10,2) NOT NULL,
    "total_earned_usdt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cashback_accum" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "potential_accum" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "status" "public"."LicenseStatus" NOT NULL DEFAULT 'active',
    "days_generated" INTEGER NOT NULL DEFAULT 0,
    "pause_potential" BOOLEAN NOT NULL DEFAULT false,
    "flags" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."license_daily_earnings" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "earning_date" TIMESTAMP(3) NOT NULL,
    "cashback_amount" DECIMAL(20,6) NOT NULL,
    "potential_amount" DECIMAL(20,6) NOT NULL,
    "applied_to_balance" BOOLEAN NOT NULL DEFAULT false,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_daily_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."referral_commissions" (
    "id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "order_id" TEXT,
    "amount_usdt" DECIMAL(10,2) NOT NULL,
    "status" "public"."CommissionStatus" NOT NULL DEFAULT 'pending',
    "release_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bonuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_usdt" DECIMAL(18,6) NOT NULL,
    "status" "public"."BonusStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_usdt" DECIMAL(18,6) NOT NULL,
    "payout_address" TEXT,
    "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'requested',
    "otp_id" TEXT,
    "otp_code_hash" TEXT,
    "otp_sent_at" TIMESTAMP(3),
    "otp_verified_at" TIMESTAMP(3),
    "approved_by_admin_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_tx_hash" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "direction" "public"."LedgerDirection" NOT NULL,
    "ref_type" "public"."LedgerRefType" NOT NULL,
    "ref_id" TEXT,
    "available_balance_after" DECIMAL(18,6),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "diff" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_ref_code_key" ON "public"."users"("ref_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "public"."users"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_wallets_address_key" ON "public"."admin_wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "license_products_code_key" ON "public"."license_products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "license_daily_earnings_license_id_earning_date_key" ON "public"."license_daily_earnings"("license_id", "earning_date");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders_deposits" ADD CONSTRAINT "orders_deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders_deposits" ADD CONSTRAINT "orders_deposits_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."license_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders_deposits" ADD CONSTRAINT "orders_deposits_reserved_wallet_id_fkey" FOREIGN KEY ("reserved_wallet_id") REFERENCES "public"."admin_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_licenses" ADD CONSTRAINT "user_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_licenses" ADD CONSTRAINT "user_licenses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."license_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."license_daily_earnings" ADD CONSTRAINT "license_daily_earnings_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "public"."user_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referral_commissions" ADD CONSTRAINT "referral_commissions_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referral_commissions" ADD CONSTRAINT "referral_commissions_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bonuses" ADD CONSTRAINT "bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bonuses" ADD CONSTRAINT "bonuses_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."withdrawals" ADD CONSTRAINT "withdrawals_approved_by_admin_id_fkey" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
