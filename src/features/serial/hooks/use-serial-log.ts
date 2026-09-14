import { useRef, useState } from 'react'
import { MAX_LOG_ENTRIES, RX_MERGE_WINDOW_MS } from '../lib/constants'
import type { LogDirection, LogEntry, TrafficStats } from '../lib/types'

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

function appendEntries(prev: LogEntry[], batch: LogEntry[]): LogEntry[] {
  const next = prev.slice()
  for (const entry of batch) {
    const last = next.at(-1)
    const mergeable =
      entry.dir === 'rx' &&
      last?.dir === 'rx' &&
      !last.text.endsWith('\n') &&
      entry.time - last.time < RX_MERGE_WINDOW_MS
    if (mergeable) {
      next[next.length - 1] = {
        ...last,
        time: entry.time,
        bytes: concat(last.bytes, entry.bytes),
        text: last.text + entry.text,
      }
    } else {
      next.push(entry)
    }
  }
  return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next
}

/**
 * 串口日志：RX 分片按行合并，并通过 requestAnimationFrame 批量刷新，
 * 避免高波特率下每个分片都触发一次渲染。收发字节数随刷新一并统计。
 */
export function useSerialLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<TrafficStats>({ rx: 0, tx: 0 })
  const pending = useRef<LogEntry[]>([])
  const frame = useRef<number | null>(null)
  const nextId = useRef(0)
  const rxDecoder = useRef(new TextDecoder())

  function flush() {
    frame.current = null
    const batch = pending.current
    pending.current = []
    let rx = 0
    let tx = 0
    for (const entry of batch) {
      if (entry.dir === 'rx') rx += entry.bytes.length
      else if (entry.dir === 'tx') tx += entry.bytes.length
    }
    setEntries((prev) => appendEntries(prev, batch))
    if (rx || tx) setStats((s) => ({ rx: s.rx + rx, tx: s.tx + tx }))
  }

  function push(dir: LogDirection, bytes: Uint8Array, text: string) {
    pending.current.push({ id: nextId.current++, dir, time: Date.now(), bytes, text })
    frame.current ??= requestAnimationFrame(flush)
  }

  return {
    entries,
    stats,
    rx: (bytes: Uint8Array) => push('rx', bytes, rxDecoder.current.decode(bytes, { stream: true })),
    tx: (bytes: Uint8Array) => push('tx', bytes, new TextDecoder().decode(bytes)),
    sys: (message: string) => push('sys', new Uint8Array(), message),
    /** 新会话开始：丢弃残留的半个 UTF-8 字符并清零统计 */
    resetSession: () => {
      rxDecoder.current = new TextDecoder()
      setStats({ rx: 0, tx: 0 })
    },
    clear: () => {
      pending.current = []
      setEntries([])
      setStats({ rx: 0, tx: 0 })
    },
  }
}
