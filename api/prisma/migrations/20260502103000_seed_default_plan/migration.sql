-- Seed a default "Flat Rate" plan if none exists
INSERT INTO "Plan" ("id", "name", "description", "monthlyPrice", "annualPrice", "features", "isActive", "sortOrder", "updatedAt")
SELECT
  gen_random_uuid(),
  'Flat Rate',
  'All features, unlimited babies and caregivers.',
  800,
  7700,
  ARRAY['Unlimited babies', 'Unlimited caregivers', 'Real-time sync', 'PDF reports', 'CSV export', 'PWA support'],
  true,
  0,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Plan");
