# Table deletion and recovery verification

Date: 23 October 2026. Code under test: `9e6c30434545498d810c99def0da9d634b28636a`.

## Result: 41/41 API checks passed

| Requirement | Observed result |
| --- | --- |
| Delete a table | It disappears from `/tables`, the active seat total falls by four, and the same record appears in `/tables?deleted=true`. |
| Invalidate the old QR | Both menu GET and order POST return HTTP 404, including after restoring and reopening the table. |
| Preserve order history | Original sale ID, 120 baht total, table name, customer note, line items, stock usage and accepted customer receipt remain. The paged POS history is unchanged. |
| Restore a table | A manager restores the original table ID, name and seats. The table starts closed with a new QR. After the owner opens it, the new QR accepts another pending order. |
| Preserve stock | Stock starts at 5 L and falls to 4.8 L only after cashier confirmation. Deletion, recovery and another pending submission do not change that stock. Shop B stays at 5 L. |
| Persist committed state | Archived and restored states survive reopening the connection pool. A fresh API client reads the archive; an independent process reads the committed archive and sale from disk. |

Additional checks cover pending-order deletion protection, rejected receipt retention, role permissions, shop isolation, repeat delete/restore requests, audit records, archived-table edit/QR protection, and the 200-table recovery limit.

## Scope and limitations

- Requests exercise the FastAPI application, actual login/authentication, sales and stock services, and committed database transactions. Authentication is not mocked; only the database session dependency points at the isolated fixture.
- This run uses a unique SQLite file under `.venv`, with foreign keys enabled. Docker Desktop reports that it cannot start, so PostgreSQL was unavailable.
- Browser button clicks, a physical phone camera, production table deletion/recovery, startup migration, and PostgreSQL concurrent row locking are **not** covered by these 41 cases.
- No real shop data was changed. Passing this isolated suite does not claim a completed deletion/recovery test on the production database.
- A read-only check of the deployed backend returned `healthy`, revision `9e6c30434545498d810c99def0da9d634b28636a`; its OpenAPI schema includes DELETE `/api/tables/{tid}` and POST `/api/tables/{tid}/restore`.

## Recovery steps in the app

1. Open **โต๊ะ & QR สั่งอาหาร → โต๊ะที่ลบ**.
2. Click **กู้คืนโต๊ะ**.
3. Open **โต๊ะในร้าน → แก้ไข / เปิด–ปิดโต๊ะ**, enable order acceptance, and save.
4. Download and print the **new QR**. Previously printed codes remain invalid.

An order awaiting staff confirmation must first be accepted or rejected in POS before deleting its table.

## Reproduce

```powershell
& ./.venv/Scripts/python.exe -u backend/tests/test_table_deletion.py
```

Each run creates a new fixture database; it does not reset an existing database or run application startup migrations. The optional `TABLE_DELETE_TEST_DATABASE_URL` accepts only `postgresql+asyncpg` on loopback port `55442`, database `khunflow_table_delete_test`, and requires an empty fixture. Production connection settings are overridden before the app is imported.

Raw results: [table-deletion-api-tests.json](table-deletion-api-tests.json).
