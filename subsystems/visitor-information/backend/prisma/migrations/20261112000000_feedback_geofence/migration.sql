ALTER TABLE "locations"
  ADD COLUMN "feedback_radius_meters" INTEGER NOT NULL DEFAULT 150;

ALTER TABLE "visitor_feedback"
  ADD COLUMN "location_id" TEXT,
  ADD COLUMN "geofence_distance_meters" DOUBLE PRECISION,
  ADD COLUMN "geofence_accuracy_meters" DOUBLE PRECISION,
  ADD COLUMN "location_verified_at" TIMESTAMP(3);

CREATE INDEX "visitor_feedback_location_id_created_at_idx"
  ON "visitor_feedback"("location_id", "created_at");

ALTER TABLE "visitor_feedback"
  ADD CONSTRAINT "visitor_feedback_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
