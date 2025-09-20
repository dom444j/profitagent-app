-- CreateEnum
CREATE TYPE "public"."ChannelType" AS ENUM ('license_basic', 'license_standard', 'license_premium', 'license_elite', 'license_enterprise', 'general_announcements', 'technical_analysis', 'market_updates', 'support', 'vip');

-- CreateEnum
CREATE TYPE "public"."ChannelStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "public"."BotType" AS ENUM ('otp', 'alerts', 'communication', 'support');

-- CreateEnum
CREATE TYPE "public"."BotStatus" AS ENUM ('active', 'inactive', 'maintenance');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('message', 'command', 'callback', 'join', 'leave');

-- CreateEnum
CREATE TYPE "public"."InteractionStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "public"."SupportLevel" AS ENUM ('basic', 'premium', 'enterprise');

-- CreateTable
CREATE TABLE "public"."telegram_channels" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_type" "public"."ChannelType" NOT NULL,
    "license_level" TEXT,
    "description" TEXT,
    "invite_link" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."ChannelStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram_bots" (
    "id" TEXT NOT NULL,
    "bot_token" TEXT NOT NULL,
    "bot_username" TEXT NOT NULL,
    "bot_name" TEXT NOT NULL,
    "bot_type" "public"."BotType" NOT NULL,
    "status" "public"."BotStatus" NOT NULL DEFAULT 'active',
    "webhook_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."telegram_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT,
    "bot_id" TEXT,
    "interaction_type" "public"."InteractionType" NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "response" TEXT,
    "status" "public"."InteractionStatus" NOT NULL DEFAULT 'processed',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_channels_channel_id_key" ON "public"."telegram_channels"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_bots_bot_token_key" ON "public"."telegram_bots"("bot_token");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_bots_bot_username_key" ON "public"."telegram_bots"("bot_username");

-- CreateIndex
CREATE INDEX "telegram_interactions_user_id_timestamp_idx" ON "public"."telegram_interactions"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "telegram_interactions_channel_id_timestamp_idx" ON "public"."telegram_interactions"("channel_id", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."telegram_interactions" ADD CONSTRAINT "telegram_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_interactions" ADD CONSTRAINT "telegram_interactions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."telegram_interactions" ADD CONSTRAINT "telegram_interactions_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "public"."telegram_bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
