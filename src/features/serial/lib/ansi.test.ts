import { describe, expect, it } from 'vitest'
import { parseAnsi, rawSegments, visualizeControls } from './ansi'
import { compilePattern, compileRules, findRanges, matchRule } from './matcher'

describe('parseAnsi', () => {
  it('解析 ESP-IDF 风格的彩色日志', () => {
    const { segments, endStyle } = parseAnsi('\x1b[0;32mI (100) wifi\x1b[0m')
    expect(segments).toEqual([{ text: 'I (100) wifi', style: { fg: { type: 'palette', index: 2 } } }])
    expect(endStyle).toEqual({})
  })

  it('支持加粗、亮色、256 色与真彩色', () => {
    expect(parseAnsi('\x1b[1;91mx').segments[0].style).toEqual({ bold: true, fg: { type: 'palette', index: 9 } })
    expect(parseAnsi('\x1b[38;5;196mx').segments[0].style.fg).toEqual({ type: 'rgb', value: 'rgb(255,0,0)' })
    expect(parseAnsi('\x1b[48;2;1;2;3mx').segments[0].style.bg).toEqual({ type: 'rgb', value: 'rgb(1,2,3)' })
  })

  it('丢弃非 SGR 的 CSI 与 OSC 序列', () => {
    expect(parseAnsi('a\x1b[2Kb\x1b]0;title\x07c').segments.map((s) => s.text).join('')).toBe('abc')
  })

  it('行尾不完整的转义序列暂不显示', () => {
    expect(parseAnsi('text\x1b[3').segments.map((s) => s.text).join('')).toBe('text')
  })

  it('其它控制字符显示为符号', () => {
    expect(visualizeControls('a\x07b\x7f')).toBe('a␇b␡')
    expect(rawSegments('\x1b[31m')[0].text).toBe('␛[31m')
  })
})

describe('matcher', () => {
  it('普通文本搜索会转义正则字符', () => {
    const pattern = compilePattern({ text: 'a.b', regex: false, caseSensitive: false })!
    expect(findRanges('axb a.b A.B', pattern)).toEqual([
      [4, 7],
      [8, 11],
    ])
  })

  it('非法正则返回 null', () => {
    expect(compilePattern({ text: '(', regex: true, caseSensitive: false })).toBeNull()
  })

  it('按顺序匹配第一条启用的规则', () => {
    const rules = compileRules([
      { id: '1', pattern: 'ERR', regex: false, caseSensitive: true, color: 'red', enabled: false },
      { id: '2', pattern: 'err', regex: false, caseSensitive: false, color: 'orange', enabled: true },
    ])
    expect(matchRule('some ERROR', rules)?.id).toBe('2')
    expect(matchRule('fine', rules)).toBeNull()
  })
})
