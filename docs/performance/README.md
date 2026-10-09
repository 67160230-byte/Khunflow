# KhunFlow performance changes

## Results measured on 10 October 2026

Baseline: commit `898a121`. Both versions used the same isolated PostgreSQL 16 fixture: 1,000 orders, receiving records, waste records, purchase orders and audit entries, 20 products/recipes/ingredients, and a second tenant for isolation checks. Median of three handler calls, including JSON encoding. These measurements exclude HTTP/authentication, internet latency and Render cold starts. They are not production speed guarantees.

### Same full history output, with batched reads

| Read | Before ms | After ms | Before queries | After queries |
|---|---:|---:|---:|---:|
| Orders, 1,000 records | 1,618.42 | 61.06 | 2,001 | 2 |
| Receiving, 1,000 records | 1,835.46 | 61.48 | 2,001 | 3 |
| Waste, 1,000 records | 950.21 | 45.24 | 1,001 | 3 |
| Purchase orders, 1,000 records | 2,682.09 | 86.31 | 3,001 | 3 |
| Recipes, 20 records | 47.48 | 5.84 | 61 | 2 |
| Audit, latest 200 records | 177.12 | 8.13 | 201 | 2 |

### What the new history screens request

| First page, 25 records + full-range totals | Median ms | Queries | JSON bytes |
|---|---:|---:|---:|
| Orders | 5.95 | 4 | 5,980 |
| Receiving | 5.11 | 5 | 6,295 |
| Waste | 4.85 | 5 | 5,783 |
| Purchase orders | 6.02 | 5 | 7,008 |
| Audit | 3.05 | 3 | 3,625 |

The old order page transferred 234,993 JSON bytes. The new page transfers 5,980 bytes while its summary still covers all matching orders, not just the 25 displayed rows. A date filter adds one bounded business-timezone query.

Dashboard now uses one overview request instead of separate KPI/alerts/chart/trend requests plus a full order history request. Its handler uses six bounded aggregate queries (previously five queries loading full entities); top sellers are computed by SQL. Setup status uses one `EXISTS` query instead of five full-list requests.

Main JavaScript entry: **915.86 KB → 286.44 KB**, gzip **244.05 KB → 89.41 KB**. Charts and individual screens load when visited. This is the entry file, not the sum of every JavaScript file.

The original recommendations endpoint raised `NameError: Supplier is not defined` on this fixture. That missing import/read path was corrected; its old timing is not a valid successful-response comparison.

Raw measurements: `before.json`, `after.json`, `frontend-build.json`. Raw read plans: `explain-before.json`, `explain-after.json`. No production or customer data is included.

## Indexes and read plans

Eleven indexes are installed by an idempotent migration. Existing equivalent non-partial B-tree indexes are reused; existing tenant/primary/unique indexes stay intact. Invalid indexes left by an interrupted build are recovered. Unexpected definitions under the reserved index names stop migration for inspection.

With one warm-up plus three read-only `EXPLAIN (ANALYZE, BUFFERS)` runs, the saved median plans showed:

| Query | Before | After | Execution ms before → after |
|---|---|---|---:|
| Latest 25 orders | Sequential scan + sort | Index-only scan on business history | 0.253 → 0.041 |
| Lines of one order | Sequential scan | Index scan on order_id | 0.069 → 0.029 |
| Completed orders in date range | Sequential scan | Bitmap scan on business/status/date | 0.154 → 0.109 |

Small tables or wide ranges may still use sequential scans. Query count reductions and bounded responses provide the larger measured improvement here. No index is added solely for low-cardinality status, and no function wraps the date column in filtering predicates.

## API compatibility and behavior

- Existing list routes retain their array responses. New `/orders/paged`, `/waste/paged`, `/receiving/paged`, `/purchase-orders/paged`, `/auth/audit-logs/paged` accept `page` (default 1), `limit` (default 25, max 100), `from` and `to` (`YYYY-MM-DD`). Response: `{items, page, limit, total}`; financial histories also include `summary.amount`, and orders include `summary.active_count`. Cancelled orders are excluded from order summaries, preserving the original screen rule.
- Pages sort by timestamp descending then ID descending, including when timestamps are equal. Date ranges use the shop timezone, inclusive start and exclusive next-day end. Invalid reversed dates return 422. Missing timezone uses Asia/Bangkok.
- Existing UTC timestamp-without-time-zone storage is explicitly preserved across SQLModel versions. UTC-aware values are normalized on write/read; this does not alter stored dates or column types.
- `/setup-status` returns `{steps: boolean[5], costWarning: boolean}` for owners/managers. `/dashboard` adds `topSellers` and `today` while keeping existing response fields.
- GET sharing is limited to requests currently in flight, scoped to account/token, shop and demo mode. Navigation, logout, business switch and successful writes cancel pending stale reads. No persistent financial-data cache is introduced.

## Verification and reproduction

Passed HTTP regression checks: five history routes, bounds validation, equal-time pagination, empty/out-of-range pages, full-range summaries, tenant isolation, roles, setup status, Bangkok midnight boundaries, a 23-hour daylight-saving day, dashboard reference sums, forecasts, recommendations, shared-owner subscription access, creation/cancellation/restoration of orders, insufficient stock and double cancellation. Test writes run under an outer transaction which is rolled back. Request-pool tests passed sharing, cancellation, account/shop/demo isolation and replacement races. Production frontend build passed.

Browser checks on the isolated local API: login, dashboard, order page 1→2 with unchanged totals, date range 1–3 October (102 records / 20,400 baht), and receiving (1,000 records / 40,000 baht). `orders-filtered.jpg` is the test screenshot. These are fixture values.

To reproduce on Windows PowerShell, from the repository root:

```powershell
docker network create khunflow-perf-test
docker run -d --name khunflow-perf-db --network khunflow-perf-test -e POSTGRES_PASSWORD=perf_test_only -e POSTGRES_DB=khunflow_perf_test postgres:16-alpine
docker build -t khunflow-perf-runner backend
$taskRoot = (Resolve-Path .).Path
$taskDb = 'postgresql+asyncpg://postgres:perf_test_only@khunflow-perf-db/khunflow_perf_test'
docker run --rm --network khunflow-perf-test -e PYTHONPATH=/app -e ENVIRONMENT=test -e "DATABASE_URL=$taskDb" -v "${taskRoot}/backend:/app:ro" khunflow-perf-runner python tests/performance_probe.py
docker run --rm --network khunflow-perf-test -e PYTHONPATH=/app -e ENVIRONMENT=test -e "DATABASE_URL=$taskDb" -v "${taskRoot}/backend:/app:ro" khunflow-perf-runner python scripts/migrate_performance_indexes.py
docker run --rm --network khunflow-perf-test -e PYTHONPATH=/app -e ENVIRONMENT=test -e "DATABASE_URL=$taskDb" -v "${taskRoot}/backend:/app:ro" khunflow-perf-runner python tests/test_performance_regression.py
node frontend/tests/requestPool.test.mjs
npm run build --prefix frontend
```

The probe seeds only `khunflow_perf_test`. To compare a baseline again, use the baseline commit's application code with the same probe/fixture; use the EXPLAIN script's `--drop-test-indexes` only on that disposable fixture. Do not run the supplied classroom seed/drop exercises on the application database.

## Rollout and actual index status

Backend startup runs schema initialization, then the concurrent index migration outside a transaction. Standalone migration from the backend directory: `PYTHONPATH=. python scripts/migrate_performance_indexes.py` (use the appropriate environment-variable syntax on Windows).

Concurrent migration needs a **direct or session PostgreSQL connection**. If application traffic uses a transaction pooler, set `MIGRATION_DATABASE_URL` to a direct/session URL for the same database. Known transaction-pooler port 6543 is skipped during startup with an actionable warning; the standalone migration fails explicitly. Never place database credentials in frontend variables.

Check `/api/health`: `revision` identifies the deployed Render commit using its [documented environment variable](https://render.com/docs/environment-variables); `performance_indexes_ready: true` means this running instance verified all required indexes or equivalents. The migration uses [`CREATE INDEX CONCURRENTLY`](https://www.postgresql.org/docs/current/sql-createindex.html), which avoids blocking ordinary writes during index creation.

**Verified in this task:** all eleven indexes are valid in the isolated test database, migration reruns passed, and a local backend startup completed. After pushing application commit `7a992fb`, the live Render health response confirmed that same revision, `environment: production`, and `performance_indexes_ready: true`. The live Vercel entry asset was 286,441 bytes and contained the new setup/paged API code. Raw public verification is in `deployment-verification.json`. The first backend check timed out during rollout; the next check succeeded. Production load performance has not been benchmarked.

Rollback: redeploy the previous application commit. The additive indexes can remain. Do not drop them on production as a routine rollback; remove only a demonstrated problematic index with concurrent DDL after measurement.
