import { useEffect, useRef, useState } from 'react'
import type { SerialStatus } from '../lib/types'

export const isSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator

interface UseSerialPortOptions {
  onData: (chunk: Uint8Array) => void
  onError?: (error: unknown) => void
  onDisconnect?: () => void
}

/** Web Serial API 的底层封装：端口授权/枚举、打开关闭、读循环、写入与控制信号 */
export function useSerialPort({ onData, onError, onDisconnect }: UseSerialPortOptions) {
  const [ports, setPorts] = useState<SerialPort[]>([])
  const [selected, setSelected] = useState<SerialPort | null>(null)
  const [status, setStatus] = useState<SerialStatus>('closed')
  // 选中的端口被拔出后回退到第一个已授权端口
  const port = selected && ports.includes(selected) ? selected : (ports[0] ?? null)

  const callbacks = useRef({ onData, onError, onDisconnect })
  useEffect(() => {
    callbacks.current = { onData, onError, onDisconnect }
  })

  const openPortRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const readLoopRef = useRef<Promise<void> | null>(null)
  const keepReadingRef = useRef(false)

  useEffect(() => {
    if (!isSerialSupported) return
    const refresh = () => navigator.serial.getPorts().then(setPorts)
    const handleDisconnect = (event: Event) => {
      refresh()
      if (event.target !== openPortRef.current) return
      keepReadingRef.current = false
      openPortRef.current = null
      setStatus('closed')
      callbacks.current.onDisconnect?.()
    }
    refresh()
    navigator.serial.addEventListener('connect', refresh)
    navigator.serial.addEventListener('disconnect', handleDisconnect)
    return () => {
      navigator.serial.removeEventListener('connect', refresh)
      navigator.serial.removeEventListener('disconnect', handleDisconnect)
    }
  }, [])

  async function requestPort(): Promise<SerialPort | null> {
    try {
      const granted = await navigator.serial.requestPort()
      setPorts(await navigator.serial.getPorts())
      setSelected(granted)
      return granted
    } catch (error) {
      // 用户取消选择时会抛 NotFoundError，忽略
      if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
        callbacks.current.onError?.(error)
      }
      return null
    }
  }

  async function readLoop(target: SerialPort) {
    while (keepReadingRef.current && target.readable) {
      const reader = target.readable.getReader()
      readerRef.current = reader
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) callbacks.current.onData(value)
        }
      } catch (error) {
        // 帧错误/校验错误等非致命错误后 readable 会被重建，继续读取
        if (keepReadingRef.current) callbacks.current.onError?.(error)
      } finally {
        reader.releaseLock()
        readerRef.current = null
      }
    }
  }

  /** 打开当前选中的端口；传入 target 时打开指定端口（如刚授权、state 尚未更新的端口） */
  async function open(options: SerialOptions, target: SerialPort | null = port): Promise<boolean> {
    if (!target || status !== 'closed') return false
    setStatus('opening')
    try {
      await target.open(options)
      openPortRef.current = target
      keepReadingRef.current = true
      setStatus('open')
      readLoopRef.current = readLoop(target)
      return true
    } catch (error) {
      setStatus('closed')
      callbacks.current.onError?.(error)
      return false
    }
  }

  async function close() {
    const target = openPortRef.current
    if (!target) return
    setStatus('closing')
    keepReadingRef.current = false
    try {
      await readerRef.current?.cancel()
      await readLoopRef.current
      await target.close()
    } catch (error) {
      callbacks.current.onError?.(error)
    } finally {
      openPortRef.current = null
      setStatus('closed')
    }
  }

  async function write(data: Uint8Array) {
    const target = openPortRef.current
    if (!target?.writable) throw new Error('串口未打开')
    const writer = target.writable.getWriter()
    try {
      await writer.write(data)
    } finally {
      writer.releaseLock()
    }
  }

  async function setSignals(signals: SerialOutputSignals) {
    await openPortRef.current?.setSignals(signals)
  }

  return { ports, port, selectPort: setSelected, status, requestPort, open, close, write, setSignals }
}
