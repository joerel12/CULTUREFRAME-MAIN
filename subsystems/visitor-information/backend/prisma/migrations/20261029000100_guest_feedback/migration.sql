ALTER TABLE "visitor_feedback" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "visitor_feedback" DROP CONSTRAINT "visitor_feedback_user_id_fkey";
ALTER TABLE "visitor_feedback"
  ADD CONSTRAINT "visitor_feedback_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
