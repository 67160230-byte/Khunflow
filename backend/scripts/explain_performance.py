"""EXPLAIN read queries only; deliberately restricted to the isolated test DB."""
import asyncio
import argparse
import json
from pathlib import Path
from sqlalchemy import text
from app.database import engine
from app.services.performance_indexes import INDEXES

QUERIES = {
    'history_page': 'SELECT id, created_at FROM orders WHERE business_id=9001 ORDER BY created_at DESC, id DESC LIMIT 25',
    'order_lines': 'SELECT order_id, product_id, quantity FROM order_items WHERE order_id=42',
    'report_range': "SELECT count(*), sum(total_amount) FROM orders WHERE business_id=9001 AND status='COMPLETED' AND created_at >= (CURRENT_DATE - 7)::timestamp AND created_at < (CURRENT_DATE + 1)::timestamp",
}

async def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--output', required=True)
    parser.add_argument('--drop-test-indexes', action='store_true', help='Restore only this task\'s disposable fixture to its baseline indexes')
    args = parser.parse_args()
    assert engine.url.database == 'khunflow_perf_test', 'Only the isolated test fixture is allowed'
    results = {}
    async with engine.connect() as conn:
        if args.drop_test_indexes:
            for name, _, _, _ in INDEXES:
                await conn.execute(text(f'DROP INDEX IF EXISTS "{name}"'))
            await conn.commit()
        for name, query in QUERIES.items():
            plans = []
            for run in range(4):
                plan = (await conn.execute(text('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query))).scalar_one()
                if run: plans.append(plan)
            results[name] = sorted(plans, key=lambda plan: plan[0]['Execution Time'])[1]
    Path(args.output).write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
    print('Saved query plans for history_page, order_lines, report_range')
    await engine.dispose()

if __name__ == '__main__': asyncio.run(main())
