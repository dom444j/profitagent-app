-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "telegram_username" TEXT,
ADD COLUMN     "withdrawal_type" TEXT DEFAULT 'manual',
ADD COLUMN     "withdrawal_wallet_address" TEXT,
ADD COLUMN     "withdrawal_wallet_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawal_wallet_verified_at" TIMESTAMP(3);
