# Testing Guide

## Running Tests

```powershell
cd server
npm test
```

## Test Files

| File | Coverage |
|---|---|
| `tests/auth.test.js` | bcrypt hashing, JWT sign/verify, expiry, wrong secret |
| `tests/analytics.test.js` | isQualifyingOrder, filterByDateRange, getSalesMetrics shape |
| `tests/integration.test.js` | Mock provider, normalizer, CSV reporter |
| `tests/cultureframeAdapter.test.js` | CultureFrame pagination behavior and safety bound |

## Test Strategy

- Tests run against the mock provider — no live database or CultureFrame connection needed.
- Jest with `--runInBand` prevents race conditions in async tests.
- Environment variables are set at the top of each test file.

## Adding Tests

Create a new file in `server/tests/` with `.test.js` extension.  
Import the service or function to test and use Jest's `describe`/`it`/`expect` API.

## What Is Tested

- Password hashing and verification
- JWT token signing, verification, expiry
- Order qualification logic (paid/completed vs cancelled/pending)
- Date range filtering
- Sales metric shape and calculations
- Mock provider data mode labeling
- Normalizer rejection of invalid records
- Normalizer not converting missing paymentStatus to 'paid'
- CSV generation without errors
- CSV data mode labeling
- Complete paginated API collection with a bounded page count
