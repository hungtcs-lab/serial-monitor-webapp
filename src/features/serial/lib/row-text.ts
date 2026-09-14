import { HEX_ROW_BYTES } from './constants'
import { parseAnsi, rawSegments } from './ansi'
import { formatTime } from './codec'
import type { AnsiSegment, HexRow, TextLine } from './types'

/**
 * 行的显示文本在渲染、搜索、导出时都会用到，按行对象缓存。
 * 行对象是不可变的（更新时会替换为新对象），所以 WeakMap 缓存天然失效。
 */
const ansiCache = new WeakMap<TextLine, AnsiSegment[]>()
const rawCache = new WeakMap<TextLine, AnsiSegment[]>()
const plainAnsiCache = new WeakMap<object, string>()
const plainRawCache = new WeakMap<object, string>()

export function lineSegments(line: TextLine, ansi: boolean): AnsiSegment[] {
  const cache = ansi ? ansiCache : rawCache
  let segments = cache.get(line)
  if (!segments) {
    segments = ansi ? parseAnsi(line.text, line.startStyle).segments : rawSegments(line.text)
    cache.set(line, segments)
  }
  return segments
}

function asciiColumn(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('')
}

export interface HexRowParts {
  offset: string
  hex: string
  ascii: string
}

export function hexRowParts(row: Extract<HexRow, { kind: 'bytes' }>): HexRowParts {
  // hexdump -C 风格：8 字节一组，组间多一个空格，不足 16 字节补齐宽度
  const cells = Array.from({ length: HEX_ROW_BYTES }, (_, i) =>
    i < row.bytes.length ? row.bytes[i].toString(16).padStart(2, '0') : '  ',
  )
  const hex = `${cells.slice(0, 8).join(' ')}  ${cells.slice(8).join(' ')}`
  return {
    offset: row.offset.toString(16).padStart(8, '0'),
    hex,
    ascii: asciiColumn(row.bytes),
  }
}

/** 用于搜索与高亮规则匹配的纯文本 */
export function rowPlainText(row: TextLine | HexRow, ansi: boolean): string {
  const cache = ansi ? plainAnsiCache : plainRawCache
  let text = cache.get(row)
  if (text !== undefined) return text
  if ('kind' in row) {
    if (row.kind === 'sys') {
      text = row.text
    } else {
      const parts = hexRowParts(row)
      text = `${parts.hex}  |${parts.ascii}|`
    }
  } else {
    text = lineSegments(row, ansi)
      .map((s) => s.text)
      .join('')
  }
  cache.set(row, text)
  return text
}

/** 导出 / 写入文件时的一行文本（不含 ANSI 转义） */
export function exportLine(line: TextLine): string {
  const text = parseAnsi(line.text, line.startStyle)
    .segments.map((s) => s.text)
    .join('')
  return `[${formatTime(line.time)}] ${line.dir.toUpperCase()} ${text}`
}

export function exportHexRow(row: HexRow): string {
  if (row.kind === 'sys') return `[${formatTime(row.time)}] SYS ${row.text}`
  const parts = hexRowParts(row)
  return `[${formatTime(row.time)}] ${row.dir.toUpperCase()} ${parts.offset}  ${parts.hex}  |${parts.ascii}|`
}

