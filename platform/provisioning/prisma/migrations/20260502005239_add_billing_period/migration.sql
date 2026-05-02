-- Add billingPeriod column to TenantSubscription
ALTER TABLE "TenantSubscription" ADD COLUMN "billingPeriod" TEXT NOT NULL DEFAULT 'MONTHLY';
