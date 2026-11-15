-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'CultureFrame Administrator',
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultureframe_customers" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" VARCHAR(2000) NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'ADMIN_IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cultureframe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultureframe_sellers" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "craft" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Mansalay, Oriental Mindoro',
    "source" TEXT NOT NULL DEFAULT 'ADMIN_IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cultureframe_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultureframe_orders" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "source" TEXT NOT NULL DEFAULT 'ADMIN_IMPORT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cultureframe_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "kind" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerReference" TEXT,
    "evidence" VARCHAR(2000) NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL,
    "commissionBps" INTEGER NOT NULL DEFAULT 500,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "decisionReason" VARCHAR(2000) NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_transactions" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_earnings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "refundCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payouts" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "destination" VARCHAR(2000) NOT NULL,
    "note" VARCHAR(2000) NOT NULL DEFAULT '',
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_ledger_entries" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "paymentId" TEXT,
    "payoutId" TEXT,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" TEXT NOT NULL,
    "error" VARCHAR(2000) NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_resetTokenHash_key" ON "admin_users"("resetTokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "cultureframe_customers_externalId_key" ON "cultureframe_customers"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "cultureframe_sellers_externalId_key" ON "cultureframe_sellers"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "cultureframe_orders_externalId_key" ON "cultureframe_orders"("externalId");

-- CreateIndex
CREATE INDEX "cultureframe_orders_customerId_idx" ON "cultureframe_orders"("customerId");

-- CreateIndex
CREATE INDEX "cultureframe_orders_sellerId_idx" ON "cultureframe_orders"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_reference_key" ON "payment_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_providerReference_key" ON "payment_transactions"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotencyKey_key" ON "payment_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_transactions_status_createdAt_idx" ON "payment_transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_reference_key" ON "refund_requests"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_idempotencyKey_key" ON "refund_requests"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refund_requests_status_createdAt_idx" ON "refund_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_transactions_providerReference_key" ON "refund_transactions"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_number_key" ON "receipts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_paymentId_key" ON "receipts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_earnings_paymentId_key" ON "seller_earnings"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_reference_key" ON "seller_payouts"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_providerReference_key" ON "seller_payouts"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payouts_idempotencyKey_key" ON "seller_payouts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "seller_payouts_sellerId_status_idx" ON "seller_payouts"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_ledger_entries_reference_key" ON "financial_ledger_entries"("reference");

-- CreateIndex
CREATE INDEX "financial_ledger_entries_sellerId_createdAt_idx" ON "financial_ledger_entries"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "integration_sync_logs_status_nextRetryAt_idx" ON "integration_sync_logs"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultureframe_orders" ADD CONSTRAINT "cultureframe_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "cultureframe_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultureframe_orders" ADD CONSTRAINT "cultureframe_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "cultureframe_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "cultureframe_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_transactions" ADD CONSTRAINT "refund_transactions_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refund_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_earnings" ADD CONSTRAINT "seller_earnings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "cultureframe_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_earnings" ADD CONSTRAINT "seller_earnings_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "cultureframe_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger_entries" ADD CONSTRAINT "financial_ledger_entries_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "cultureframe_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger_entries" ADD CONSTRAINT "financial_ledger_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_ledger_entries" ADD CONSTRAINT "financial_ledger_entries_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "seller_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
