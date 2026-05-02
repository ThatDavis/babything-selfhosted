-- Add billingPeriod to Tenant
ALTER TABLE "Tenant" ADD COLUMN "billingPeriod" TEXT NOT NULL DEFAULT 'MONTHLY';
