-- Migration: Add Tenant model, tenantId to all tenant-scoped tables,
-- refactor SystemSettings to per-tenant, and create RLS policies.

-- 1. Create Tenant table
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "plan" TEXT NOT NULL DEFAULT 'FLAT_RATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- 2. Add tenantId columns (nullable first for backfill)
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Baby" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "BabyCaregiver" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "InviteToken" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FeedingEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DiaperEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SleepEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "GrowthRecord" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MedicationEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "VaccineRecord" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PasswordResetToken" ADD COLUMN "tenantId" TEXT;

-- 3. Create default tenant for existing self-hosted data
INSERT INTO "Tenant" ("id", "subdomain", "status", "plan", "createdAt", "updatedAt")
VALUES ('default', 'default', 'ACTIVE', 'SELFHOSTED', NOW(), NOW());

-- 4. Backfill tenantId on all existing rows
UPDATE "User" SET "tenantId" = 'default';
UPDATE "Baby" SET "tenantId" = 'default';
UPDATE "BabyCaregiver" SET "tenantId" = 'default';
UPDATE "InviteToken" SET "tenantId" = 'default';
UPDATE "FeedingEvent" SET "tenantId" = 'default';
UPDATE "DiaperEvent" SET "tenantId" = 'default';
UPDATE "SleepEvent" SET "tenantId" = 'default';
UPDATE "GrowthRecord" SET "tenantId" = 'default';
UPDATE "MedicationEvent" SET "tenantId" = 'default';
UPDATE "Milestone" SET "tenantId" = 'default';
UPDATE "Appointment" SET "tenantId" = 'default';
UPDATE "VaccineRecord" SET "tenantId" = 'default';
UPDATE "PasswordResetToken" SET "tenantId" = 'default';

-- 5. Make tenantId NOT NULL on all tenant-scoped tables
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Baby" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "BabyCaregiver" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InviteToken" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FeedingEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DiaperEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SleepEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "GrowthRecord" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MedicationEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Milestone" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "VaccineRecord" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PasswordResetToken" ALTER COLUMN "tenantId" SET NOT NULL;

-- 6. Add foreign keys for Prisma Tenant relations
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Baby" ADD CONSTRAINT "Baby_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Add indexes on tenantId for performance
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "Baby_tenantId_idx" ON "Baby"("tenantId");
CREATE INDEX "BabyCaregiver_tenantId_idx" ON "BabyCaregiver"("tenantId");
CREATE INDEX "InviteToken_tenantId_idx" ON "InviteToken"("tenantId");
CREATE INDEX "FeedingEvent_tenantId_idx" ON "FeedingEvent"("tenantId");
CREATE INDEX "DiaperEvent_tenantId_idx" ON "DiaperEvent"("tenantId");
CREATE INDEX "SleepEvent_tenantId_idx" ON "SleepEvent"("tenantId");
CREATE INDEX "GrowthRecord_tenantId_idx" ON "GrowthRecord"("tenantId");
CREATE INDEX "MedicationEvent_tenantId_idx" ON "MedicationEvent"("tenantId");
CREATE INDEX "Milestone_tenantId_idx" ON "Milestone"("tenantId");
CREATE INDEX "Appointment_tenantId_idx" ON "Appointment"("tenantId");
CREATE INDEX "VaccineRecord_tenantId_idx" ON "VaccineRecord"("tenantId");
CREATE INDEX "PasswordResetToken_tenantId_idx" ON "PasswordResetToken"("tenantId");

-- 8. Refactor SystemSettings from singleton to per-tenant
ALTER TABLE "SystemSettings" ADD COLUMN "tenantId" TEXT;
UPDATE "SystemSettings" SET "tenantId" = 'default';
ALTER TABLE "SystemSettings" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old PK and id column, replace with tenantId as PK
ALTER TABLE "SystemSettings" DROP CONSTRAINT "SystemSettings_pkey";
ALTER TABLE "SystemSettings" DROP COLUMN "id";
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("tenantId");
ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Enable Row-Level Security on tenant-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Baby" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BabyCaregiver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiaperEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SleepEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaccineRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings" ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (names must be unique across the schema)
-- current_setting('app.current_tenant_id', true) returns empty string when unset,
-- which yields no matching rows, providing default-deny behavior.

CREATE POLICY tenant_isolation_user ON "User"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_baby ON "Baby"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_caregiver ON "BabyCaregiver"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_invite ON "InviteToken"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_feeding ON "FeedingEvent"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_diaper ON "DiaperEvent"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_sleep ON "SleepEvent"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_growth ON "GrowthRecord"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_medication ON "MedicationEvent"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_milestone ON "Milestone"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_appointment ON "Appointment"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_vaccine ON "VaccineRecord"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_reset_token ON "PasswordResetToken"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_settings ON "SystemSettings"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
