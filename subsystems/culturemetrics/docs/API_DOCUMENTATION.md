# CultureMetrics API Documentation

Base URL: `/api/v1`

All analytics endpoints require authentication via `Authorization: Bearer <token>` header or `cm_token` cookie.

---

## Authentication

### POST /auth/login
Login with username and password.

**Body:** `{ "username": "admin", "password": "..." }`  
**Returns:** `{ data: { admin: {...}, token: "..." } }`

### POST /auth/logout
Clears session/cookie.

### GET /auth/me
Returns the current authenticated administrator.

### POST /auth/change-password
**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

## Analytics

All support query params: `startDate` (YYYY-MM-DD), `endDate`, `page`, `limit`.

| Endpoint | Description |
|---|---|
| GET /analytics/overview | Dashboard summary metrics |
| GET /analytics/trends | Revenue trend data |
| GET /analytics/sales | Full sales metrics |
| GET /analytics/sales/categories | Revenue by category |
| GET /analytics/sales/top-products | Top products by revenue |
| GET /analytics/products | Product performance table |
| GET /analytics/products/:productId | Single product metrics |
| GET /analytics/orders | Order metrics and trends |
| GET /analytics/orders/statuses | Orders by status |
| GET /analytics/customers | Customer aggregate metrics |
| GET /analytics/customers/trends | Registration trend |
| GET /analytics/events | Event and registration metrics |
| GET /analytics/events/registrations | Registrations by event |
| GET /analytics/destinations | Heritage + scenic overview |
| GET /analytics/destinations/heritage | Heritage sites only |
| GET /analytics/destinations/scenic | Scenic destinations only |

---

## Reports (CSV)

| Endpoint | Description |
|---|---|
| GET /reports/sales.csv | Sales trend CSV |
| GET /reports/products.csv | Product performance CSV |
| GET /reports/orders.csv | Orders by status CSV |
| GET /reports/events.csv | Event registrations CSV |
| GET /reports/destinations.csv | Destinations CSV |

---

## Integration

| Endpoint | Description |
|---|---|
| GET /integration/status | Current integration status |
| POST /integration/test-connection | Test the proposed CultureFrame overview analytics endpoint |
| POST /integration/sync | Capture normalized provider snapshots and a data-check run summary (not an analytics cache) |
| GET /integration/sync-history | Past data-check runs and outcomes |
| GET /integration/configuration-status | Integration checklist |

---

## Health

### GET /health
No authentication required. Returns service health status.

---

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "CULTUREFRAME_UNAVAILABLE",
    "message": "CultureFrame data is temporarily unavailable."
  }
}
```
