CREATE TABLE "SystemSettings" (
  "id"         TEXT NOT NULL DEFAULT 'default',
  "unitSystem" TEXT NOT NULL DEFAULT 'metric',
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSettings" ("id", "unitSystem", "updatedAt") VALUES ('default', 'metric', NOW());
