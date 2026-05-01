-- Add referral code to Tenant
ALTER TABLE "Tenant" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "Tenant_referralCode_key" ON "Tenant"("referralCode");

-- Create Referral tracking table
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerSubdomain" TEXT NOT NULL,
    "refereeSubdomain" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardAppliedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "Referral_refereeSubdomain_key" ON "Referral"("refereeSubdomain");
CREATE INDEX "Referral_referrerSubdomain_idx" ON "Referral"("referrerSubdomain");
CREATE INDEX "Referral_code_idx" ON "Referral"("code");
