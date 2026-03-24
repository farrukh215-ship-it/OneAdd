CREATE TYPE "NewsScope" AS ENUM ('NATIONAL', 'INTERNATIONAL');

CREATE TABLE "NewsClickLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "city" TEXT,
  "scope" "NewsScope" NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsClickLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NewsClickLog_userId_scope_createdAt_idx" ON "NewsClickLog"("userId", "scope", "createdAt");
CREATE INDEX "NewsClickLog_city_scope_createdAt_idx" ON "NewsClickLog"("city", "scope", "createdAt");

ALTER TABLE "NewsClickLog"
ADD CONSTRAINT "NewsClickLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "HomeWidgetSettings" (
  "id" TEXT NOT NULL,
  "weatherEnabled" BOOLEAN NOT NULL DEFAULT true,
  "jokeEnabled" BOOLEAN NOT NULL DEFAULT true,
  "nationalNewsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "internationalNewsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "gpsWeatherEnabled" BOOLEAN NOT NULL DEFAULT true,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "jokePrefix" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeWidgetSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HomeWidgetSettings" (
  "id",
  "weatherEnabled",
  "jokeEnabled",
  "nationalNewsEnabled",
  "internationalNewsEnabled",
  "gpsWeatherEnabled",
  "updatedAt"
) VALUES (
  'default',
  true,
  true,
  true,
  true,
  true,
  CURRENT_TIMESTAMP
);
