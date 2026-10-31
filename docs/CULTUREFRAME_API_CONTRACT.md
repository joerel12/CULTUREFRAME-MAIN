# CultureFrame API Contract

**Document version:** 1.0  
**CultureMetrics version:** 1.0  
**Status:** PROPOSED — endpoints do not yet exist in CultureFrame production.

---

## Overview

CultureMetrics requires CultureFrame to expose a set of read-only analytics endpoints. These endpoints must be implemented by the CultureFrame team before live integration can work.

**CultureFrame base URL:** `https://jennycultureframe-1.onrender.com`

---

## Authentication

CultureMetrics uses a dedicated server-to-server integration token. This token is:
- Stored only in `CULTUREFRAME_API_TOKEN` environment variable on the CultureMetrics server.
- Never exposed to the browser.
- Sent as an `Authorization: Bearer <token>` header on every request.

CultureFrame must validate this token and restrict access to analytics-only resources. Create a dedicated integration identity in CultureFrame with read-only permissions.

---

## Common Response Format

All endpoints should return:

```json
{
  "data": [ /* array of records */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing integration token."
  }
}
```

---

## Endpoints

### 1. Overview

**GET** `/api/integrations/analytics/overview`

Returns aggregate counts for the dashboard overview cards.

**Required auth:** Integration token  
**Query params:** `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)

**Expected response:**
```json
{
  "data": {
    "totalRevenue": "152450.00",
    "totalOrders": 248,
    "completedOrders": 186,
    "totalProducts": 42,
    "totalCustomers": 310,
    "totalEventRegistrations": 820,
    "totalHeritageSites": 12,
    "totalScenicDestinations": 18
  }
}
```

**Notes:**
- `totalRevenue` = sum of `subtotal` for completed/paid orders only.
- All monetary values as decimal strings.
- Requires CultureFrame backend to aggregate this data — do not expose direct DB queries.

---

### 2. Orders

**GET** `/api/integrations/analytics/orders`

Returns paginated order records for analytics.

**Required auth:** Integration token  
**Query params:** `startDate`, `endDate`, `page` (default 1), `limit` (default 50, max 200)

**Expected response:**
```json
{
  "data": [
    {
      "id": "123",
      "createdAt": "2026-10-01T10:00:00.000Z",
      "updatedAt": "2026-10-01T10:30:00.000Z",
      "status": "completed",
      "currency": "PHP",
      "items": [
        {
          "productId": "45",
          "productName": "Sample Handmade Craft",
          "category": "Handicrafts",
          "quantity": 2,
          "unitPrice": "250.00"
        }
      ],
      "subtotal": "500.00",
      "discountAmount": "0.00",
      "shippingAmount": "80.00",
      "taxAmount": "0.00",
      "paymentStatus": "paid",
      "refundAmount": "0.00"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 248, "totalPages": 5 }
}
```

**CultureFrame implementation notes:**
- Status values: use `completed`, `pending`, `processing`, `cancelled`. Inform CultureMetrics if different values are used.
- `paymentStatus` must be provided explicitly. Do not assume `completed` = paid.
- Do not expose customer personal data (names, addresses, emails) in this endpoint.
- Use `updatedAt` for incremental sync support.

---

### 3. Products

**GET** `/api/integrations/analytics/products`

Returns product catalog with sales aggregates.

**Required auth:** Integration token  
**Query params:** `page`, `limit`

**Expected response:**
```json
{
  "data": [
    {
      "id": "45",
      "name": "Sample Handmade Craft",
      "category": "Handicrafts",
      "price": "250.00",
      "stockQuantity": 28,
      "unitsSold": 62,
      "totalRevenue": "15500.00",
      "isAvailable": true
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 42, "totalPages": 1 }
}
```

**Notes:**
- `unitsSold` and `totalRevenue` should be pre-aggregated from orders on the CultureFrame side.
- `stockQuantity` is optional; return `null` if not tracked.

---

### 4. Customers Summary

**GET** `/api/integrations/analytics/customers/summary`

Returns aggregate customer statistics only — no personal data.

**Required auth:** Integration token  
**Query params:** `startDate`, `endDate`

**Expected response:**
```json
{
  "data": {
    "totalRegistered": 310,
    "newThisPeriod": 42,
    "withAtLeastOneOrder": 220,
    "repeatCustomers": 118,
    "registrationsByDate": [
      { "date": "2026-10-01", "count": 3 },
      { "date": "2026-10-02", "count": 1 }
    ]
  }
}
```

**Privacy requirement:**
- Do NOT return customer names, emails, phone numbers, addresses, or any personal identifiers.
- `repeatCustomers` = customers with 2 or more qualifying orders.

---

### 5. Events

**GET** `/api/integrations/analytics/events`

Returns event records with registration counts.

**Required auth:** Integration token  
**Query params:** `startDate`, `endDate`, `page`, `limit`

**Expected response:**
```json
{
  "data": [
    {
      "id": "ev1",
      "name": "Mansalay Heritage Festival 2026",
      "startDate": "2026-11-01",
      "endDate": "2026-11-03",
      "status": "upcoming",
      "totalRegistrations": 320,
      "confirmedAttendance": null,
      "cancelledRegistrations": 15
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 8, "totalPages": 1 }
}
```

**Notes:**
- `confirmedAttendance` should be `null` if check-in tracking is not implemented.
- CultureMetrics will never present `totalRegistrations` as actual attendance unless `confirmedAttendance` is provided.

---

### 6. Heritage

**GET** `/api/integrations/analytics/heritage`

Returns cultural heritage site records.

**Required auth:** Integration token  
**Query params:** `page`, `limit`

**Expected response:**
```json
{
  "data": [
    {
      "id": "h1",
      "name": "Mansalay Municipal Church",
      "category": "Religious Heritage",
      "location": "Mansalay, Oriental Mindoro",
      "viewCount": null,
      "isPublished": true
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
}
```

**Notes:**
- `viewCount` should be `null` if view tracking is not implemented in CultureFrame.

---

### 7. Scenic Destinations

**GET** `/api/integrations/analytics/scenic`

Returns scenic destination records.

**Required auth:** Integration token  
**Query params:** `page`, `limit`

**Expected response:**
```json
{
  "data": [
    {
      "id": "s1",
      "name": "Mt. Calavite Natural Park",
      "category": "Mountain",
      "latitude": 12.7603,
      "longitude": 121.0964,
      "viewCount": null,
      "isPublished": true
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 18, "totalPages": 1 }
}
```

---

## Integration Checklist for CultureFrame Team

Before CultureMetrics can use live data, the CultureFrame backend must:

- [ ] Create a dedicated integration user/token with read-only access.
- [ ] Implement all 7 endpoints listed above.
- [ ] Validate the `Authorization: Bearer <token>` header on each endpoint.
- [ ] Ensure monetary values are returned as decimal strings (not floats).
- [ ] Ensure `paymentStatus` is explicitly set on order records.
- [ ] Ensure `confirmedAttendance` is provided if check-in tracking exists.
- [ ] Never return customer personal identifiers through the analytics endpoints.
- [ ] Apply rate limiting on the integration endpoints.
- [ ] Document any endpoints that differ from this contract.

Once complete, set these in the CultureMetrics server `.env`:
```
CULTUREFRAME_API_TOKEN=<your-issued-token>
CULTUREFRAME_INTEGRATION_ENABLED=true
CULTUREMETRICS_DATA_MODE=live
```

The Integration Settings page tests the overview endpoint specifically. A data check writes diagnostic normalized provider snapshots and run history; the analytics pages continue querying CultureFrame directly and do not read the stored snapshots. Missing/unimplemented routes will fail visibly rather than fall back to demo values.
