export type SessionStatus = 'idle' | 'opening' | 'open' | 'closing' | 'reconnecting'

export type DataFormat = 'text' | 'hex'

export type LineEnding = 'none' | 'lf' | 'cr' | 'crlf'

export type Direction = 'rx' | 'tx' | 'sys'

export type SysLevel = 'info' | 'warn' | 'error'

export interface SerialParams {
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: ParityType
  flowControl: FlowControlType
}

export interface SendOptions {
  format: DataFormat
  lineEnding: LineEnding
  /** 文本模式下解析 \r \n \t \xHH 等转义 */
  escapes: boolean
}

/** 按设备记住的配置 */
export interface DeviceProfile {
  params: SerialParams
  send: SendOptions
  displayFormat: DataFormat
}

export interface OutputSignals {
  dataTerminalReady: boolean
  requestToSend: boolean
}

export interface TrafficStats {
  rx: number
  tx: number
}

/** 文本视图中的一行 */
export interface TextLine {
  id: number
  dir: Direction
  time: number
  /** 原始文本（可能含 ANSI 转义与控制字符） */
  text: string
  /** 行首的 ANSI 样式（由上一行延续而来） */
  startStyle: AnsiStyle
  level?: SysLevel
}

/** hexdump 视图中的一行：最多 16 字节，或一条系统消息 */
export type HexRow =
  | { kind: 'bytes'; id: number; dir: 'rx' | 'tx'; time: number; offset: number; bytes: Uint8Array }
  | { kind: 'sys'; id: number; dir: 'sys'; time: number; text: string; level: SysLevel }

export type AnsiColor = { type: 'palette'; index: number } | { type: 'rgb'; value: string }

export interface AnsiStyle {
  fg?: AnsiColor
  bg?: AnsiColor
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  inverse?: boolean
}

export interface AnsiSegment {
  text: string
  style: AnsiStyle
}

export type RuleColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink'

export interface HighlightRule {
  id: string
  pattern: string
  regex: boolean
  caseSensitive: boolean
  color: RuleColor
  enabled: boolean
}

export interface SearchQuery {
  text: string
  regex: boolean
  caseSensitive: boolean
}

export interface TimedSendConfig {
  intervalMs: number
  /** 0 表示无限循环 */
  count: number
}

export interface Option<T extends string = string> {
  label: string
  value: T
}
