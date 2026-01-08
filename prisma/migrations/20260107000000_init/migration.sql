-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "volume24hr" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "usdcSize" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "side" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_accounts" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_markets" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markets_conditionId_key" ON "markets"("conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "markets_slug_key" ON "markets"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "trades_transactionHash_key" ON "trades"("transactionHash");

-- CreateIndex
CREATE INDEX "trades_marketId_timestamp_idx" ON "trades"("marketId", "timestamp");

-- CreateIndex
CREATE INDEX "trades_userAddress_timestamp_idx" ON "trades"("userAddress", "timestamp");

-- CreateIndex
CREATE INDEX "trades_timestamp_idx" ON "trades"("timestamp");

-- CreateIndex
CREATE INDEX "price_snapshots_marketId_timestamp_idx" ON "price_snapshots"("marketId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_accounts_address_key" ON "tracked_accounts"("address");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_markets_conditionId_key" ON "tracked_markets"("conditionId");

-- CreateIndex
CREATE INDEX "alerts_webhookSent_createdAt_idx" ON "alerts"("webhookSent", "createdAt");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

