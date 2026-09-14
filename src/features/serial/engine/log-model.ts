import { ansiEndStyle } from '../lib/ansi'
import { HEX_ROW_BYTES, MAX_HEX_ROWS, MAX_LINE_LENGTH, MAX_TEXT_LINES } from '../lib/constants'
import type { AnsiStyle, Direction, HexRow, SysLevel, TextLine } from '../lib/types'

/** 同方向数据间隔超过该值时，hexdump 另起一行，方便分辨数据包边界 */
const HEX_PACKET_GAP_MS = 50

const LINE_BREAK = /\r\n|\r|\n/

function trimFront<T>(rows: T[], max: number) {
  // 超出 10% 再一次性裁剪，避免每追加一行就 splice
  if (rows.length > max * 1.1) rows.splice(0, rows.length - max)
}

/**
 * 日志模型：把收发的原始字节增量构建成两种视图
 * - 文本行：按 \r\n / \r / \n 断行，跨分片的 UTF-8 与 ANSI 样式都会延续
 * - hexdump 行：每行 16 字节，带偏移量，方向变化或数据间隔较长时换行
 *
 * 数组采用写时复制：每个刷新周期内第一次修改时复制一份，commit() 后交给 UI，
 * 保证 UI 拿到的数组与行对象都是不可变的。
 */
export class LogModel {
  lines: TextLine[] = []
  hexRows: HexRow[] = []

  /** 文本行完成（遇到换行、被发送/系统消息打断）时回调，用于写入日志文件 */
  onLineClosed?: (line: TextLine) => void

  private nextId = 0
  private linesCopied = false
  private hexCopied = false

  private rxDecoder = new TextDecoder()
  private rxOpen = false
  private rxStyle: AnsiStyle = {}
  private pendingCR = false

  private hexOpen = false
  private hexLastTime = 0
  private hexOffset = { rx: 0, tx: 0 }

  /** 返回本周期是否有变化，并重置写时复制标记 */
  commit(): boolean {
    const changed = this.linesCopied || this.hexCopied
    this.linesCopied = false
    this.hexCopied = false
    return changed
  }

  appendRx(bytes: Uint8Array, time = Date.now()) {
    let text = this.rxDecoder.decode(bytes, { stream: true })
    // 上个分片以 \r 结尾、这个分片以 \n 开头：属于同一个 \r\n
    if (this.pendingCR && text.startsWith('\n')) text = text.slice(1)
    if (text) this.pendingCR = text.endsWith('\r')

    const lines = this.editableLines()
    const pieces = text ? text.split(LINE_BREAK) : []
    pieces.forEach((piece, index) => {
      const isLast = index === pieces.length - 1
      if (this.rxOpen) {
        const open = lines[lines.length - 1]
        lines[lines.length - 1] = { ...open, text: open.text + piece }
      } else if (piece || !isLast) {
        this.pushLine(lines, 'rx', piece, time)
        this.rxOpen = true
      }
      if (!isLast || (this.rxOpen && lines[lines.length - 1].text.length >= MAX_LINE_LENGTH)) {
        this.closeRx()
      }
    })

    this.appendHex('rx', bytes, time)
  }

  appendTx(bytes: Uint8Array, time = Date.now()) {
    this.interruptRx()
    const lines = this.editableLines()
    const text = new TextDecoder().decode(bytes)
    const pieces = text.split(LINE_BREAK)
    if (pieces.length > 1 && pieces.at(-1) === '') pieces.pop()
    for (const piece of pieces) {
      this.onLineClosed?.(this.pushLine(lines, 'tx', piece, time))
    }
    this.appendHex('tx', bytes, time)
  }

  appendSys(text: string, level: SysLevel = 'info', time = Date.now()) {
    this.interruptRx()
    this.onLineClosed?.(this.pushLine(this.editableLines(), 'sys', text, time, level))
    const rows = this.editableHex()
    rows.push({ kind: 'sys', id: this.nextId++, dir: 'sys', time, text, level })
    this.hexOpen = false
    trimFront(rows, MAX_HEX_ROWS)
  }

  /** 新会话开始：丢弃半个 UTF-8 字符与残留的 ANSI 样式 */
  resetStream() {
    this.interruptRx()
    this.rxDecoder = new TextDecoder()
    this.rxStyle = {}
    this.pendingCR = false
    this.hexOpen = false
  }

  clear() {
    this.lines = []
    this.hexRows = []
    this.linesCopied = true
    this.hexCopied = true
    this.rxOpen = false
    this.hexOpen = false
    this.hexOffset = { rx: 0, tx: 0 }
  }

  /** 当前尚未结束的接收行（停止写文件时需要一并写入） */
  openLine(): TextLine | null {
    return this.rxOpen ? (this.lines.at(-1) ?? null) : null
  }

  private editableLines() {
    if (!this.linesCopied) {
      this.lines = this.lines.slice()
      this.linesCopied = true
    }
    return this.lines
  }

  private editableHex() {
    if (!this.hexCopied) {
      this.hexRows = this.hexRows.slice()
      this.hexCopied = true
    }
    return this.hexRows
  }

  private pushLine(lines: TextLine[], dir: Direction, text: string, time: number, level?: SysLevel): TextLine {
    const line: TextLine = { id: this.nextId++, dir, time, text, startStyle: dir === 'rx' ? this.rxStyle : {}, level }
    lines.push(line)
    trimFront(lines, MAX_TEXT_LINES)
    return line
  }

  private closeRx() {
    if (!this.rxOpen) return
    const line = this.lines[this.lines.length - 1]
    this.rxStyle = ansiEndStyle(line.text, line.startStyle)
    this.rxOpen = false
    this.onLineClosed?.(line)
  }

  /** 发送或系统消息插入时结束当前接收行，后续接收数据另起一行 */
  private interruptRx() {
    this.closeRx()
  }

  private appendHex(dir: 'rx' | 'tx', bytes: Uint8Array, time: number) {
    if (bytes.length === 0) return
    const rows = this.editableHex()
    if (time - this.hexLastTime > HEX_PACKET_GAP_MS) this.hexOpen = false
    this.hexLastTime = time

    let i = 0
    while (i < bytes.length) {
      const last = rows.at(-1)
      const canExtend =
        this.hexOpen && last?.kind === 'bytes' && last.dir === dir && last.bytes.length < HEX_ROW_BYTES
      if (canExtend) {
        const take = Math.min(HEX_ROW_BYTES - last.bytes.length, bytes.length - i)
        const merged = new Uint8Array(last.bytes.length + take)
        merged.set(last.bytes)
        merged.set(bytes.subarray(i, i + take), last.bytes.length)
        rows[rows.length - 1] = { ...last, bytes: merged }
        this.hexOffset[dir] += take
        i += take
      } else {
        const take = Math.min(HEX_ROW_BYTES, bytes.length - i)
        rows.push({ kind: 'bytes', id: this.nextId++, dir, time, offset: this.hexOffset[dir], bytes: bytes.slice(i, i + take) })
        this.hexOffset[dir] += take
        i += take
      }
      this.hexOpen = true
    }
    trimFront(rows, MAX_HEX_ROWS)
  }
}
