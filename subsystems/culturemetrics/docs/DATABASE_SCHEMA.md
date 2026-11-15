# Database Schema

## Tables

### `admins`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| username | VARCHAR(64) | Unique |
| email | VARCHAR(255) | Unique |
| passwordHash | VARCHAR(255) | bcrypt hash, never returned to clients |
| role | ENUM | superadmin, admin, viewer |
| isActive | BOOLEAN | Soft-disable without deletion |
| lastLoginAt | TIMESTAMP | Updated on successful login |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### `integration_configs`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| providerName | VARCHAR(64) | 'cultureframe' |
| apiBaseUrl | VARCHAR(512) | CultureFrame base URL |
| enabled | BOOLEAN | Whether integration is active |
| lastConnectionTestAt | TIMESTAMP | |
| lastConnectionTestResult | VARCHAR(32) | 'success' or 'failure' |
| lastSuccessfulSyncAt | TIMESTAMP | Updated after completed sync |
| createdAt / updatedAt | TIMESTAMP | |

### `integration_sync_runs`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| providerName | VARCHAR(64) | |
| startedAt | TIMESTAMP | |
| finishedAt | TIMESTAMP | null if still running |
| status | ENUM | running, completed, failed, partial |
| recordsFetched | INTEGER | |
| recordsProcessed | INTEGER | |
| recordsRejected | INTEGER | |
| errorSummary | TEXT | Non-sensitive summary only |
| dataMode | VARCHAR(16) | mock / live |
| createdAt | TIMESTAMP | |

### `analytics_snapshots`

Aggregate copies captured by a manual data check for diagnostics/history. Analytics requests do not read this table.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| metricType | VARCHAR(64) | overview, sales, products, etc. |
| periodStart | DATE | Optional period filter |
| periodEnd | DATE | |
| metricPayload | JSONB | Aggregated data — no PII, no credentials |
| sourceSystem | VARCHAR(64) | 'cultureframe' |
| dataMode | VARCHAR(16) | mock / live |
| generatedAt | TIMESTAMP | |
| createdAt / updatedAt | TIMESTAMP | |

## Notes

- No customer personal data is stored in CultureMetrics.
- Integration tokens are stored in environment variables only — never in the database.
- The `AnalyticsSnapshot` JSONB payload must never contain passwords, tokens, emails, or full names.
