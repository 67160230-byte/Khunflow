import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/services/formatting.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
globalThis.window = new EventTarget()
let moduleVersion = 0
const load = () => import(`data:text/javascript;base64,${Buffer.from(compiled + `\n// reload ${moduleVersion++}`).toString('base64')}`)
let money = await load()
const checks = []
function check(name, fn) { fn(); checks.push({ name, passed: true }) }
const shop = id => localStorage.setItem('khumflow_business_id', id)
check('New shop defaults to THB', () => assert.equal(money.shopPreferences().currency, 'THB'))
shop('currency-shop-a')
money.storeShopPreferences('THB', 'Asia/Bangkok')
check('Shop A displays baht', () => assert.match(money.formatMoney(1250), /฿1,250\.00/))
shop('currency-shop-b')
money.storeShopPreferences('USD', 'UTC')
check('Shop B displays dollars', () => assert.match(money.formatMoney(1250), /US\$1,250\.00/))
check('Shop B input unit is USD', () => assert.equal(money.currencyUnit(), 'USD'))
shop('currency-shop-a')
check('Switch B to A restores baht', () => assert.equal(money.shopPreferences().currency, 'THB'))
check('Shop A timezone remains Bangkok', () => assert.equal(money.shopTimezone(), 'Asia/Bangkok'))
shop('currency-shop-b')
check('Switch A to B restores USD', () => assert.equal(money.shopPreferences().currency, 'USD'))
money = await load()
check('Module reload retains selected shop currency', () => assert.equal(money.shopPreferences().currency, 'USD'))
localStorage.removeItem('khumflow_business_id')
shop('currency-shop-a')
check('Selecting A after simulated sign-in retains THB', () => assert.equal(money.shopPreferences().currency, 'THB'))
shop('currency-shop-b')
localStorage.setItem('khumflow_demo_mode', 'true')
check('Demo uses THB independently', () => assert.equal(money.shopPreferences().currency, 'THB'))
money.storeShopPreferences('EUR', 'UTC')
localStorage.removeItem('khumflow_demo_mode')
check('Leaving demo restores USD without overwriting shop', () => assert.equal(money.shopPreferences().currency, 'USD'))
let events = 0
window.addEventListener(money.shopPreferencesEvent, () => events++)
money.storeShopPreferences('EUR', 'UTC')
check('Saving new currency emits refresh event', () => assert.equal(events, 1))
money.storeShopPreferences('EUR', 'UTC')
check('Repeated identical settings do not emit refresh loop', () => assert.equal(events, 1))
check('Saving B does not change A', () => assert.equal(JSON.parse(storage.get('khumflow_format:currency-shop-a')).currency, 'THB'))
for (const currency of money.supportedCurrencies) {
  money.storeShopPreferences(currency.code, 'Asia/Bangkok')
  check(`${currency.code} uses Intl currency formatting`, () => assert.equal(money.formatMoney(1250), new Intl.NumberFormat('th-TH', { style: 'currency', currency: currency.code }).format(1250)))
}
localStorage.setItem('khumflow_format:currency-shop-b', '{broken')
check('Damaged cache falls back to THB', () => assert.equal(money.shopPreferences().currency, 'THB'))
localStorage.setItem('khumflow_format:currency-shop-b', JSON.stringify({ currency: 'INVALID', timezone: 'UTC' }))
check('Unsupported cached currency does not crash formatting', () => assert.equal(money.shopPreferences().currency, 'THB'))
await writeFile(new URL('../../docs/performance/currency-formatting-tests.json', import.meta.url), JSON.stringify({ checks: checks.length, passed: checks.length, results: checks }, null, 2))
console.log(`PASS ${checks.length}/${checks.length}: currency scope, reload, demo isolation and formatting`)
