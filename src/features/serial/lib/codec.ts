import { LINE_ENDINGS } from './constants'
import type { DataFormat, LineEnding, LogEntry, PortSettings } from './types'

const encoder = new TextEncoder()

/** 将 "01 02 ff" / "0x01,0x02" / "0102FF" 这类十六进制文本解析为字节 */
export function parseHex(input: string): Uint8Array {
  const clean = input.replace(/0x/gi, '').replace(/[\s,:-]/g, '')
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new Error('无效的十六进制输入')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function isValidHex(input: string): boolean {
  try {
    parseHex(input)
    return true
  } catch {
    return false
  }
}

export function encodeInput(input: string, format: DataFormat, ending: LineEnding): Uint8Array {
  if (format === 'hex') return parseHex(input)
  return encoder.encode(input + LINE_ENDINGS[ending])
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

/** 把不可见控制字符显示成可读形式（保留换行与制表符） */
export function visualizeControl(text: string): string {
  // oxlint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
}

export function formatEntryBody(entry: LogEntry, format: DataFormat): string {
  if (entry.dir === 'sys') return entry.text
  if (format === 'hex') return toHex(entry.bytes)
  return visualizeControl(entry.text.replace(/\r?\n$/, ''))
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.toLocaleTimeString('zh-CN', { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function formatFrame({ baudRate, dataBits, parity, stopBits }: PortSettings): string {
  return `${baudRate} ${dataBits}${parity[0].toUpperCase()}${stopBits}`
}

export function describePort(port: SerialPort): string {
  const { usbVendorId, usbProductId } = port.getInfo()
  if (usbVendorId === undefined) return '串口设备'
  const hex = (n?: number) => (n ?? 0).toString(16).padStart(4, '0')
  return `USB ${hex(usbVendorId)}:${hex(usbProductId)}`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export function serializeLog(entries: LogEntry[], format: DataFormat): string {
  return entries.map((e) => `[${formatTime(e.time)}] ${e.dir.toUpperCase()} ${formatEntryBody(e, format)}`).join('\n')
}
