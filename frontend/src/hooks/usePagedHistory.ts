import { useCallback, useEffect, useRef, useState } from 'react'
import type { HistoryParams, PagedHistory } from '@/services'

export function usePagedHistory<T>(load: (params: HistoryParams) => Promise<PagedHistory<T>>) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [from, setFromValue] = useState('')
  const [to, setToValue] = useState('')
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<PagedHistory<T>['summary']>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++ } }, [])
  const refresh = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true); setError('')
    try {
      if (from && to && from > to) throw new Error('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด')
      const result = await load({ page, limit: 25, from, to })
      if (alive.current && sequence.current === request) {
        if (result.total > 0 && page > Math.ceil(result.total / 25)) { setPage(Math.ceil(result.total / 25)); return result.items }
        setItems(result.items); setTotal(result.total); setSummary(result.summary)
      }
      return result.items
    } catch (error) {
      if (alive.current && sequence.current === request && !(error instanceof DOMException && error.name === 'AbortError')) setError(error instanceof Error ? error.message : 'โหลดประวัติไม่สำเร็จ')
      throw error
    } finally { if (alive.current && sequence.current === request) setLoading(false) }
  }, [load, page, from, to])
  useEffect(() => { void refresh().catch(() => {}); return () => { sequence.current++ } }, [refresh])
  const setFrom = (value: string) => { setFromValue(value); setPage(1) }
  const setTo = (value: string) => { setToValue(value); setPage(1) }
  return { items, setItems, page, setPage, from, setFrom, to, setTo, total, summary, loading, error, refresh }
}
