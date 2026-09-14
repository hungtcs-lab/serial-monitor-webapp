import type { AnsiColor, AnsiSegment, AnsiStyle } from './types'

const ESC = '\x1b'

/** C0 控制字符（保留 \t）替换为 Unicode 控制符号图形，例如 \x07 → ␇ */
export function visualizeControls(text: string): string {
  // oxlint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0a-\x1f\x7f]/g, (c) => {
    const code = c.charCodeAt(0)
    return code === 0x7f ? '␡' : String.fromCharCode(0x2400 + code)
  })
}

function paletteColor(index: number): AnsiColor {
  return { type: 'palette', index }
}

function xterm256(n: number): AnsiColor {
  if (n < 16) return paletteColor(n)
  if (n >= 232) {
    const level = 8 + (n - 232) * 10
    return { type: 'rgb', value: `rgb(${level},${level},${level})` }
  }
  const i = n - 16
  const steps = [0, 95, 135, 175, 215, 255]
  const r = steps[Math.floor(i / 36) % 6]
  const g = steps[Math.floor(i / 6) % 6]
  const b = steps[i % 6]
  return { type: 'rgb', value: `rgb(${r},${g},${b})` }
}

/** 应用一条 SGR（Select Graphic Rendition）参数序列，返回新样式 */
function applySgr(style: AnsiStyle, params: number[]): AnsiStyle {
  let next: AnsiStyle = { ...style }
  if (params.length === 0) params = [0]
  for (let i = 0; i < params.length; i++) {
    const p = params[i]
    if (p === 0) next = {}
    else if (p === 1) next.bold = true
    else if (p === 2) next.dim = true
    else if (p === 3) next.italic = true
    else if (p === 4) next.underline = true
    else if (p === 7) next.inverse = true
    else if (p === 22) next.bold = next.dim = undefined
    else if (p === 23) next.italic = undefined
    else if (p === 24) next.underline = undefined
    else if (p === 27) next.inverse = undefined
    else if (p >= 30 && p <= 37) next.fg = paletteColor(p - 30)
    else if (p >= 90 && p <= 97) next.fg = paletteColor(p - 90 + 8)
    else if (p === 39) next.fg = undefined
    else if (p >= 40 && p <= 47) next.bg = paletteColor(p - 40)
    else if (p >= 100 && p <= 107) next.bg = paletteColor(p - 100 + 8)
    else if (p === 49) next.bg = undefined
    else if (p === 38 || p === 48) {
      const key = p === 38 ? 'fg' : 'bg'
      if (params[i + 1] === 5 && params[i + 2] !== undefined) {
        next[key] = xterm256(params[i + 2])
        i += 2
      } else if (params[i + 1] === 2 && params[i + 4] !== undefined) {
        next[key] = { type: 'rgb', value: `rgb(${params[i + 2]},${params[i + 3]},${params[i + 4]})` }
        i += 4
      }
    }
  }
  return next
}

export interface AnsiParseResult {
  segments: AnsiSegment[]
  endStyle: AnsiStyle
}

/**
 * 解析一行文本中的 ANSI 转义：SGR 转为样式，其它 CSI/OSC 序列直接丢弃，
 * 行尾不完整的转义序列（数据还没收全）暂不显示。
 */
export function parseAnsi(text: string, startStyle: AnsiStyle = {}): AnsiParseResult {
  const segments: AnsiSegment[] = []
  let style = startStyle
  let buffer = ''
  let i = 0

  const pushBuffer = () => {
    if (buffer) segments.push({ text: visualizeControls(buffer), style })
    buffer = ''
  }

  while (i < text.length) {
    const ch = text[i]
    if (ch !== ESC) {
      buffer += ch
      i++
      continue
    }
    const kind = text[i + 1]
    if (kind === '[') {
      // CSI：ESC [ 参数 中间字节 结束字节(0x40-0x7e)
      let j = i + 2
      while (j < text.length && !(text.charCodeAt(j) >= 0x40 && text.charCodeAt(j) <= 0x7e)) j++
      if (j >= text.length) break // 序列不完整
      if (text[j] === 'm') {
        pushBuffer()
        const params = text
          .slice(i + 2, j)
          .split(/[;:]/)
          .filter((s) => s !== '')
          .map(Number)
          .filter((n) => Number.isFinite(n))
        style = applySgr(style, params)
      }
      i = j + 1
    } else if (kind === ']') {
      // OSC：以 BEL 或 ESC \ 结束
      let j = i + 2
      while (j < text.length && text[j] !== '\x07' && !(text[j] === ESC && text[j + 1] === '\\')) j++
      if (j >= text.length) break
      i = text[j] === '\x07' ? j + 1 : j + 2
    } else if (kind === undefined) {
      break // 行尾单独的 ESC，等待后续数据
    } else {
      i += 2 // 其它两字节序列
    }
  }
  pushBuffer()
  return { segments, endStyle: style }
}

/** 不解析 ANSI：把 ESC 等控制字符显示为符号 */
export function rawSegments(text: string): AnsiSegment[] {
  return text ? [{ text: visualizeControls(text), style: {} }] : []
}

/** 仅计算行尾样式（用于把样式延续到下一行） */
export function ansiEndStyle(text: string, startStyle: AnsiStyle): AnsiStyle {
  return text.includes(ESC) ? parseAnsi(text, startStyle).endStyle : startStyle
}
