// Share only requests currently in flight; never cache a shop's business data.
type Pending = { controller: AbortController; promise: Promise<unknown> }
const pending = new Map<string, Pending>()
let identity = ''

export function resetApiRequests() {
  const entries = [...pending.values()]
  pending.clear()
  entries.forEach((entry) => entry.controller.abort())
}

export function scopedGet<T>(scope: string, path: string, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (scope !== identity) { resetApiRequests(); identity = scope }
  const key = `${scope}:${path}`
  const existing = pending.get(key)
  if (existing) return existing.promise as Promise<T>
  const controller = new AbortController()
  const entry: Pending = { controller, promise: Promise.resolve() }
  const request = load(controller.signal).finally(() => {
    // A cancelled older request must never remove its replacement.
    if (pending.get(key) === entry) pending.delete(key)
  })
  entry.promise = request
  pending.set(key, entry)
  return request
}
