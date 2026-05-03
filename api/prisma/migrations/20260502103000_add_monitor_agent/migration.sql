-- CreateTable
CREATE TABLE "MonitorAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPingAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',

    CONSTRAINT "MonitorAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitorAgent_tenantId_key" ON "MonitorAgent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorAgent_sessionId_key" ON "MonitorAgent"("sessionId");

-- CreateIndex
CREATE INDEX "MonitorAgent_tenantId_idx" ON "MonitorAgent"("tenantId");

-- AddForeignKey
ALTER TABLE "MonitorAgent" ADD CONSTRAINT "MonitorAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
