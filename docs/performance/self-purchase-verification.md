# Self-purchased receiving verification — 23 October 2026

Application code: `3453d9d`. Automated API checks: **41 / 41 passed**.

## Environment and scope

- Runs the real FastAPI authentication, authorization, receiving, recipe-cost and history routes in process through HTTPX ASGI transport.
- Uses a unique **SQLite file with foreign keys enabled**, with fictional accounts, three shops, suppliers, ingredients and recipes. API requests commit normally to this file.
- Overrides only the database-session dependency. Does not mock stock updates, cost calculations, receipts or history serialization.
- Never connects to a deployment database or writes to a real shop. Production connections are replaced with an unreachable loopback URL before importing the application.
- Docker Desktop returned `Docker Desktop is unable to start`. PostgreSQL row locks, concurrent receiving, and PostgreSQL upgrade/startup migrations were **not** exercised in this run.

## Main calculation

| Stage | Stock | Receipt quantity | Receipt unit cost | Stock after | Average cost after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial | 10 | — | — | 10 | 40 |
| Self purchase 1 | 10 | 5 | 52 | 15 | 44 |
| Self purchase 2 | 15 | 3 | 60 | 18 | 46.6666666667 |

First calculation: `(10 × 40 + 5 × 52) / 15 = 44`.

Second calculation: `(15 × 44 + 3 × 60) / 18 = 46.6666666667`.

The expected values are calculated independently with `Decimal`; persisted float values must match within `0.00000001`. The two receipts have values 260 and 180, with a history summary of 440 across both pages.

## Verified behavior

- Both explicit `supplier_id=null` and an omitted supplier are accepted without making a fictitious supplier record.
- Quantity, average cost, expiry, receipt, purchase place, lot, receipt total and actor audit are committed.
- Place names are trimmed; an absent place remains optional.
- A 100 ml recipe updates correctly against ingredient costs measured per litre.
- Empty starting stock, zero-cost receipts and fractional quantities/prices calculate correctly.
- Both history endpoints, pagination, date filtering and whole-period summary return the committed receipts.
- Closing the SQLAlchemy pool, creating a new engine and HTTP client, and reading again returns the same history, stock and costs.
- An independent Python process reads the committed stock and first receipt from the SQLite file in read-only mode.
- Invalid input, wrong-shop IDs, missing authentication and insufficient permissions leave stock, receipts and audits unchanged.
- A recipe-cost failure after the receipt is flushed rolls back the complete transaction.
- Shops A and B remain isolated. Inventory staff can receive with the existing permissions; cashiers cannot by default.
- Supplier receiving, partial PO receiving, over-receipt rejection and completing a PO still work.

## Deployment read-only check

At verification time, `https://khunflow.onrender.com/api/health` returned `healthy` at revision `3453d9d845129a9829498e40514b2294e2e20caa`. The deployed OpenAPI schema confirmed that `supplier_id` is optional and `purchase_place` is supported.

These deployment checks do not constitute a live stock-changing receipt test. No production stock or receiving history was changed.

## Reproduce

```powershell
& ./.venv/Scripts/python.exe backend/tests/test_self_purchase_receiving.py
```

Python dependencies: the backend requirements plus `aiosqlite` and `httpx` already used by the repository's local fixtures. Windows may require running outside the restricted sandbox for SQLite worker threads/file access.

For a **new, empty dedicated local PostgreSQL test database**, set `SELF_PURCHASE_TEST_DATABASE_URL` to a `postgresql+asyncpg` URL on `127.0.0.1:55441` with database name `khunflow_self_purchase_test`. The runner refuses other PostgreSQL destinations and refuses to reset an existing populated test database.

Structured results: [self-purchase-api-tests.json](self-purchase-api-tests.json).
