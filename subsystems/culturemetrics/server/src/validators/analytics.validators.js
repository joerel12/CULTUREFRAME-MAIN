'use strict';

const { z } = require('zod');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional();

const dateRangeQuery = z.object({
  startDate: isoDate,
  endDate: isoDate,
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(z.number().int().min(1).max(500)),
  sortBy: z.string().max(64).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const productIdParam = z.object({
  productId: z.string().min(1).max(64),
});

module.exports = { dateRangeQuery, productIdParam };
