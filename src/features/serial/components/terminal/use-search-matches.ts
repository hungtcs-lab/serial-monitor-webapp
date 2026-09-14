import { useDeferredValue, useMemo } from 'react'
import { compilePattern, findRanges, type Range } from '../../lib/matcher'
import { rowPlainText } from '../../lib/row-text'
import type { SearchQuery } from '../../lib/types'
import type { LogRowData } from './log-row'

export interface SearchMatches {
  /** 按出现顺序排列的全部命中：所在行、行内第几个命中 */
  list: { rowIndex: number; rangeIndex: number }[]
  byRow: Map<number, Range[]>
  invalid: boolean
}

const EMPTY: SearchMatches = { list: [], byRow: new Map(), invalid: false }

/** 在当前视图的所有行中搜索；行数据使用延迟值，避免高速接收时阻塞输入 */
export function useSearchMatches(rows: LogRowData[], query: SearchQuery, enabled: boolean, ansi: boolean): SearchMatches {
  const deferredRows = useDeferredValue(rows)
  return useMemo(() => {
    if (!enabled || !query.text) return EMPTY
    const pattern = compilePattern(query)
    if (!pattern) return { ...EMPTY, invalid: true }
    const list: SearchMatches['list'] = []
    const byRow = new Map<number, Range[]>()
    deferredRows.forEach((row, rowIndex) => {
      const ranges = findRanges(rowPlainText(row, ansi), pattern)
      if (ranges.length === 0) return
      byRow.set(rowIndex, ranges)
      ranges.forEach((_, rangeIndex) => list.push({ rowIndex, rangeIndex }))
    })
    return { list, byRow, invalid: false }
  }, [deferredRows, query, enabled, ansi])
}
