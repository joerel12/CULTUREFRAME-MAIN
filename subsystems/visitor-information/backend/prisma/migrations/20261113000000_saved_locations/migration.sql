CREATE TABLE "saved_locations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_locations_user_id_location_id_key"
  ON "saved_locations"("user_id", "location_id");

CREATE INDEX "saved_locations_user_id_created_at_idx"
  ON "saved_locations"("user_id", "created_at");

ALTER TABLE "saved_locations"
  ADD CONSTRAINT "saved_locations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_locations"
  ADD CONSTRAINT "saved_locations_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
