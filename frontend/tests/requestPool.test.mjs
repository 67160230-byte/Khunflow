import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import ts from 'typescript'

const source = await readFile(new URL('../src/services/requestPool.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { scopedGet, resetApiRequests } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
let calls = 0
const load = (signal) => new Promise((resolve, reject) => {
  calls++
  signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')))
  setTimeout(() => resolve(calls), 10)
})
const first = scopedGet('user1:shop1:live', '/orders', load)
const shared = scopedGet('user1:shop1:live', '/orders', load)
assert.equal(first, shared)
await first
assert.equal(calls, 1)
await scopedGet('user1:shop1:live', '/orders', load)
assert.equal(calls, 2, 'Completed requests must not cache business data')
const old = scopedGet('user1:shop1:live', '/orders', load).catch((error) => error.name)
const replacement = scopedGet('user1:shop2:live', '/orders', load)
assert.equal(await old, 'AbortError')
assert.equal(scopedGet('user1:shop2:live', '/orders', load), replacement)
await replacement
for (const scope of ['user2:shop2:live', 'user2:shop2:demo']) {
  const pending = scopedGet(scope, '/dashboard', load).catch((error) => error.name)
  resetApiRequests()
  assert.equal(await pending, 'AbortError')
}
console.log('PASS: deduplication, no persistent cache, tenant/account/demo isolation, abort and replacement races')
