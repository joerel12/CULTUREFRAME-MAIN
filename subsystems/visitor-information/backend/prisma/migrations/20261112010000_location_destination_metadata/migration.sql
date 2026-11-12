ALTER TABLE "locations"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Sightseeing',
  ADD COLUMN "source_url" TEXT;
