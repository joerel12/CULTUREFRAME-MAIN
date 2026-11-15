CREATE TABLE "stored_uploads" (
    "id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stored_uploads_pkey" PRIMARY KEY ("id")
);
