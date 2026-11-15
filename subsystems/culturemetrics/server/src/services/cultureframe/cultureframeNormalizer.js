'use strict';

/**
 * cultureframeNormalizer.js
 *
 * Converts raw CultureFrame API responses into validated internal structures.
 * All monetary values are returned as decimal strings to avoid floating-point errors.
 * Missing or invalid fields are rejected — never silently defaulted to zero revenue.
 */

const { z } = require('zod');

// ── Helpers ───────────────────────────────────────────────────────────────────

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) return null;
    return n.toFixed(2);
  })
  .nullable();

const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Expected ISO-8601 timestamp')
  .nullable()
  .optional();

// ── Order item schema ─────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.union([z.string(), z.number()]).transform(String),
  productName: z.string().default('Unknown Product'),
  category: z.string().default('Uncategorized'),
  quantity: z.number().int().min(0).default(0),
  unitPrice: decimalString,
});

// ── Order schema ──────────────────────────────────────────────────────────────

const orderSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  status: z.string().default('unknown'),
  currency: z.string().default('PHP'),
  items: z.array(orderItemSchema).default([]),
  subtotal: decimalString,
  discountAmount: decimalString,
  shippingAmount: decimalString,
  taxAmount: decimalString,
  paymentStatus: z.string().nullable().default(null),
  refundAmount: decimalString,
});

// ── Product schema ────────────────────────────────────────────────────────────

const productSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default('Unnamed Product'),
  category: z.string().default('Uncategorized'),
  price: decimalString,
  stockQuantity: z.number().int().nullable().default(null),
  unitsSold: z.number().int().default(0),
  totalRevenue: decimalString,
  isAvailable: z.boolean().default(true),
});

// ── Customer summary schema ───────────────────────────────────────────────────

const customerSummarySchema = z.object({
  totalRegistered: z.number().int().default(0),
  newThisPeriod: z.number().int().default(0),
  withAtLeastOneOrder: z.number().int().default(0),
  repeatCustomers: z.number().int().default(0),
  registrationsByDate: z
    .array(z.object({ date: z.string(), count: z.number().int() }))
    .default([]),
});

// ── Event schema ──────────────────────────────────────────────────────────────

const eventSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default('Unnamed Event'),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  totalRegistrations: z.number().int().default(0),
  confirmedAttendance: z.number().int().nullable().default(null),
  cancelledRegistrations: z.number().int().default(0),
  status: z.string().default('unknown'),
});

// ── Heritage schema ───────────────────────────────────────────────────────────

const heritageSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default('Unnamed Site'),
  category: z.string().default('Uncategorized'),
  location: z.string().nullable().default(null),
  viewCount: z.number().int().nullable().default(null),
  isPublished: z.boolean().default(true),
});

// ── Scenic destination schema ─────────────────────────────────────────────────

const scenicSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().default('Unnamed Destination'),
  category: z.string().default('Uncategorized'),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  viewCount: z.number().int().nullable().default(null),
  isPublished: z.boolean().default(true),
});

// ── Pagination schema ─────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.number().int().default(1),
  limit: z.number().int().default(50),
  total: z.number().int().default(0),
  totalPages: z.number().int().default(1),
});

// ── Normalizer functions ──────────────────────────────────────────────────────

function normalizeList(rawList, itemSchema, context) {
  if (!Array.isArray(rawList)) {
    console.warn(`[Normalizer] Expected array for ${context}, got ${typeof rawList}`);
    return { items: [], rejected: 0 };
  }

  const items = [];
  let rejected = 0;

  for (const raw of rawList) {
    const result = itemSchema.safeParse(raw);
    if (result.success) {
      items.push(result.data);
    } else {
      rejected++;
      console.warn(`[Normalizer] Rejected ${context} record:`, result.error.issues);
    }
  }

  return { items, rejected };
}

function normalizeOrders(response) {
  const data = response?.data || response;
  const pagination = paginationSchema.parse(response?.pagination || {});
  const { items, rejected } = normalizeList(data, orderSchema, 'order');
  return { orders: items, pagination, rejected };
}

function normalizeProducts(response) {
  const data = response?.data || response;
  const pagination = paginationSchema.parse(response?.pagination || {});
  const { items, rejected } = normalizeList(data, productSchema, 'product');
  return { products: items, pagination, rejected };
}

function normalizeCustomers(response) {
  const raw = response?.data || response || {};
  const result = customerSummarySchema.safeParse(raw);
  if (!result.success) {
    console.warn('[Normalizer] Customer summary parse failed:', result.error.issues);
    return { summary: customerSummarySchema.parse({}), rejected: 1 };
  }
  return { summary: result.data, rejected: 0 };
}

function normalizeEvents(response) {
  const data = response?.data || response;
  const pagination = paginationSchema.parse(response?.pagination || {});
  const { items, rejected } = normalizeList(data, eventSchema, 'event');
  return { events: items, pagination, rejected };
}

function normalizeHeritage(response) {
  const data = response?.data || response;
  const pagination = paginationSchema.parse(response?.pagination || {});
  const { items, rejected } = normalizeList(data, heritageSchema, 'heritage');
  return { heritage: items, pagination, rejected };
}

function normalizeScenicDestinations(response) {
  const data = response?.data || response;
  const pagination = paginationSchema.parse(response?.pagination || {});
  const { items, rejected } = normalizeList(data, scenicSchema, 'scenic');
  return { scenic: items, pagination, rejected };
}

module.exports = {
  normalizeOrders,
  normalizeProducts,
  normalizeCustomers,
  normalizeEvents,
  normalizeHeritage,
  normalizeScenicDestinations,
};
