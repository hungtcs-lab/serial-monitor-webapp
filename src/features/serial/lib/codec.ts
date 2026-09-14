import { LINE_ENDINGS } from './constants'
import type { SendOptions, SerialParams } from './types'

const encoder = new TextEncoder()

/** 将 "01 02 ff" / "0x01,0x02" / "0102FF" 这类十六进制文本解析为字节 */
export function parseHex(input: string): Uint8Array {
  const clean = input.replace(/0x/gi, '').replace(/[\s,:-]/g, '')
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new Error('invalid-hex')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

const SIMPLE_ESCAPES: Record<string, number> = {
  n: 0x0a,
  r: 0x0d,
  t: 0x09,
  '0': 0x00,
  a: 0x07,
  b: 0x08,
  e: 0x1b,
  f: 0x0c,
  v: 0x0b,
  '\\': 0x5c,
}

/**
 * 解析文本中的转义序列并编码为字节：\r \n \t \0 \e \\ 以及 \xHH。
 * 非法的转义会抛错，便于在输入框中提示。
 */
export function encodeEscaped(input: string): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch !== '\\') {
      // 普通字符按 UTF-8 编码（逐个码点）
      const codePoint = input.codePointAt(i)!
      const char = String.fromCodePoint(codePoint)
      out.push(...encoder.encode(char))
      i += char.length
      continue
    }
    const next = input[i + 1]
    if (next === undefined) throw new Error('invalid-escape')
    if (next === 'x' || next === 'X') {
      const hex = input.slice(i + 2, i + 4)
      if (!/^[0-9a-f]{2}$/i.test(hex)) throw new Error('invalid-escape')
      out.push(Number.parseInt(hex, 16))
      i += 4
      continue
    }
    const code = SIMPLE_ESCAPES[next]
    if (code === undefined) throw new Error('invalid-escape')
    out.push(code)
    i += 2
  }
  return Uint8Array.from(out)
}

export function encodeInput(input: string, options: SendOptions): Uint8Array {
  if (options.format === 'hex') return parseHex(input)
  const body = options.escapes ? encodeEscaped(input) : encoder.encode(input)
  const ending = encoder.encode(LINE_ENDINGS[options.lineEnding])
  const out = new Uint8Array(body.length + ending.length)
  out.set(body)
  out.set(ending, body.length)
  return out
}

/** 校验输入，返回错误码（null 表示合法） */
export function validateInput(input: string, options: SendOptions): 'invalid-hex' | 'invalid-escape' | null {
  try {
    encodeInput(input, options)
    return null
  } catch (error) {
    return (error as Error).message as 'invalid-hex' | 'invalid-escape'
  }
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function formatFrame({ baudRate, dataBits, parity, stopBits }: SerialParams): string {
  return `${baudRate} ${dataBits}${parity[0].toUpperCase()}${stopBits}`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
