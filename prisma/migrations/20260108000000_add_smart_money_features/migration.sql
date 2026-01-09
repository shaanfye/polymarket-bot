-- AlterTable
ALTER TABLE "tracked_markets" ADD COLUMN "eventId" INTEGER;

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "snapshotTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openInterest" DOUBLE PRECISION NOT NULL,
    "liveVolume" DOUBLE PRECISION NOT NULL,
    "yesHolders" INTEGER NOT NULL,
    "noHolders" INTEGER NOT NULL,
    "yesConcentration" DOUBLE PRECISION NOT NULL,
    "noConcentration" DOUBLE PRECISION NOT NULL,
    "yesSidePnL" DOUBLE PRECISION NOT NULL,
    "noSidePnL" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_snapshots_conditionId_snapshotTime_idx" ON "market_snapshots"("conditionId", "snapshotTime");

-- CreateIndex
CREATE INDEX "market_snapshots_snapshotTime_idx" ON "market_snapshots"("snapshotTime");
