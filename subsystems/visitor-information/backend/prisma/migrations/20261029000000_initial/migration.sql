CREATE TYPE "UserRole" AS ENUM ('VISITOR', 'ADMIN');
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ContentKind" AS ENUM ('HERITAGE', 'HISTORICAL_SITE', 'TRADITION', 'EVENT', 'ATTRACTION', 'FESTIVAL', 'LOCAL_PRODUCT');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "contact" TEXT,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'VISITOR',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "auth_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "heritage_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "heritage_categories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "content_records" (
  "id" TEXT NOT NULL,
  "kind" "ContentKind" NOT NULL,
  "category_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "cultural_significance" TEXT NOT NULL DEFAULT '',
  "historical_background" TEXT NOT NULL DEFAULT '',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_records_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "media_assets" (
  "id" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "alt_text" TEXT NOT NULL DEFAULT '',
  "caption" TEXT NOT NULL DEFAULT '',
  "photographer" TEXT NOT NULL DEFAULT '',
  "source_url" TEXT,
  "license" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "permission_status" TEXT NOT NULL DEFAULT 'PENDING',
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "locations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "visitor_feedback" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "related_heritage_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visitor_feedback_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "homepage_content" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "system_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");
CREATE UNIQUE INDEX "heritage_categories_name_key" ON "heritage_categories"("name");
CREATE UNIQUE INDEX "heritage_categories_slug_key" ON "heritage_categories"("slug");
CREATE UNIQUE INDEX "content_records_slug_key" ON "content_records"("slug");
CREATE INDEX "content_records_kind_publication_status_idx" ON "content_records"("kind", "publication_status");
CREATE INDEX "content_records_title_idx" ON "content_records"("title");
CREATE INDEX "visitor_feedback_created_at_idx" ON "visitor_feedback"("created_at");
CREATE UNIQUE INDEX "homepage_content_key_key" ON "homepage_content"("key");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_records" ADD CONSTRAINT "content_records_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "heritage_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_records" ADD CONSTRAINT "content_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitor_feedback" ADD CONSTRAINT "visitor_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
