import type { SerialParams } from '../lib/types'
import type { ReadEndReason, ReadHandlers, Transport } from './transport'

/** 读取过程中可恢复的错误，出现后 readable 会被重建 */
const RECOVERABLE_ERRORS = new Set(['BufferOverrunError', 'BreakError', 'FramingError', 'ParityError'])

export class SerialTransport implements Transport {
  readonly kind = 'serial'
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private closing = false

  readonly port: SerialPort

  constructor(port: SerialPort) {
    this.port = port
  }

  async open(params: SerialParams) {
    this.closing = false
    await this.port.open(params)
  }

  async read({ onData, onError }: ReadHandlers): Promise<ReadEndReason> {
    while (!this.closing) {
      const readable = this.port.readable
      if (!readable) return this.closing ? 'closed' : 'lost'
      const reader = readable.getReader()
      this.reader = reader
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) onData(value)
        }
      } catch (error) {
        if (this.closing) break
        if (error instanceof DOMException && RECOVERABLE_ERRORS.has(error.name)) {
          onError(error)
        } else {
          reader.releaseLock()
          this.reader = null
          return 'lost'
        }
      } finally {
        if (this.reader === reader) {
          reader.releaseLock()
          this.reader = null
        }
      }
    }
    return 'closed'
  }

  async write(data: Uint8Array) {
    const writable = this.port.writable
    if (!writable) throw new Error('Port is not open')
    const writer = writable.getWriter()
    try {
      await writer.write(data)
    } finally {
      writer.releaseLock()
    }
  }

  async close() {
    this.closing = true
    try {
      await this.reader?.cancel()
    } catch {
      // 设备已拔出时 cancel 可能失败，忽略
    }
    // 等待读循环释放锁后再关闭端口
    for (let i = 0; i < 50 && this.reader; i++) await new Promise((r) => setTimeout(r, 10))
    try {
      await this.port.close()
    } catch {
      // 端口可能已因设备丢失而关闭
    }
  }

  setSignals(signals: SerialOutputSignals) {
    return this.port.setSignals(signals)
  }

  getSignals() {
    return this.port.getSignals()
  }
}
