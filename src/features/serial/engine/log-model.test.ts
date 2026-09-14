import { describe, expect, it } from 'vitest'
import { LogModel } from './log-model'

const enc = new TextEncoder()
const texts = (m: LogModel) => m.lines.map((l) => `${l.dir}:${l.text}`)

describe('LogModel 文本行', () => {
  it('按 \\r\\n / \\n / \\r 断行，并保留空行', () => {
    const m = new LogModel()
    m.appendRx(enc.encode('a\r\nb\n\nc\rd'))
    expect(texts(m)).toEqual(['rx:a', 'rx:b', 'rx:', 'rx:c', 'rx:d'])
  })

  it('跨分片的 \\r\\n 不会产生多余空行', () => {
    const m = new LogModel()
    m.appendRx(enc.encode('hello\r'))
    m.appendRx(enc.encode('\nworld\r\n'))
    expect(texts(m)).toEqual(['rx:hello', 'rx:world'])
  })

  it('没有换行时同一行持续追加', () => {
    const m = new LogModel()
    m.appendRx(enc.encode('ab'))
    m.appendRx(enc.encode('cd'))
    expect(texts(m)).toEqual(['rx:abcd'])
  })

  it('跨分片的 UTF-8 多字节字符正确解码', () => {
    const m = new LogModel()
    const bytes = enc.encode('温度\n')
    m.appendRx(bytes.slice(0, 4))
    m.appendRx(bytes.slice(4))
    expect(texts(m)).toEqual(['rx:温度'])
  })

  it('发送与系统消息会插入独立的行，并打断未结束的接收行', () => {
    const m = new LogModel()
    m.appendSys('connected')
    m.appendRx(enc.encode('partial'))
    m.appendTx(enc.encode('AT\r\n'))
    m.appendRx(enc.encode(' tail\n'))
    expect(texts(m)).toEqual(['sys:connected', 'rx:partial', 'tx:AT', 'rx: tail'])
  })

  it('没有设置 onLineClosed 时也会记录发送与系统消息', () => {
    const m = new LogModel()
    m.appendSys('x')
    m.appendTx(enc.encode('y'))
    expect(m.lines).toHaveLength(2)
  })

  it('ANSI 样式延续到下一行', () => {
    const m = new LogModel()
    m.appendRx(enc.encode('\x1b[31mred\nstill red\x1b[0m\n'))
    expect(m.lines[1].startStyle.fg).toEqual({ type: 'palette', index: 1 })
  })

  it('完成的行触发 onLineClosed', () => {
    const m = new LogModel()
    const closed: string[] = []
    m.onLineClosed = (line) => closed.push(`${line.dir}:${line.text}`)
    m.appendRx(enc.encode('one\ntwo'))
    m.appendTx(enc.encode('cmd'))
    expect(closed).toEqual(['rx:one', 'rx:two', 'tx:cmd'])
  })

  it('写时复制：commit 之后的修改不会影响已交出的数组', () => {
    const m = new LogModel()
    m.appendRx(enc.encode('a\n'))
    expect(m.commit()).toBe(true)
    const snapshot = m.lines
    m.appendRx(enc.encode('b\n'))
    expect(snapshot).toHaveLength(1)
    expect(m.lines).toHaveLength(2)
    expect(m.commit()).toBe(true)
    expect(m.commit()).toBe(false)
  })
})

describe('LogModel hexdump 行', () => {
  it('每行最多 16 字节，偏移量连续', () => {
    const m = new LogModel()
    m.appendRx(new Uint8Array(40).fill(0x41), 1000)
    const rows = m.hexRows.filter((r) => r.kind === 'bytes')
    expect(rows.map((r) => r.bytes.length)).toEqual([16, 16, 8])
    expect(rows.map((r) => r.offset)).toEqual([0, 16, 32])
  })

  it('间隔很短的同方向分片会合并到同一行', () => {
    const m = new LogModel()
    m.appendRx(new Uint8Array([1, 2, 3]), 1000)
    m.appendRx(new Uint8Array([4, 5]), 1010)
    expect(m.hexRows).toHaveLength(1)
    expect(Array.from((m.hexRows[0] as { bytes: Uint8Array }).bytes)).toEqual([1, 2, 3, 4, 5])
  })

  it('方向变化或间隔较长时另起一行', () => {
    const m = new LogModel()
    m.appendRx(new Uint8Array([1]), 1000)
    m.appendTx(new Uint8Array([2]), 1001)
    m.appendRx(new Uint8Array([3]), 2000)
    expect(m.hexRows.map((r) => r.dir)).toEqual(['rx', 'tx', 'rx'])
    expect(m.hexRows.map((r) => (r.kind === 'bytes' ? r.offset : -1))).toEqual([0, 0, 1])
  })
})
