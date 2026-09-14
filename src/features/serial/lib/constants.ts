import type { DeviceProfile, HighlightRule, LineEnding, RuleColor, SendOptions, SerialParams, TimedSendConfig } from './types'

export const BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600, 1000000, 1500000,
  2000000,
]

export const DATA_BITS = ['8', '7'] as const
export const STOP_BITS = ['1', '2'] as const
export const PARITIES: ParityType[] = ['none', 'even', 'odd']
export const FLOW_CONTROLS: FlowControlType[] = ['none', 'hardware']
export const LINE_ENDING_VALUES: LineEnding[] = ['none', 'lf', 'cr', 'crlf']

export const LINE_ENDINGS: Record<LineEnding, string> = {
  none: '',
  lf: '\n',
  cr: '\r',
  crlf: '\r\n',
}

export const DEFAULT_PARAMS: SerialParams = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
}

export const DEFAULT_SEND_OPTIONS: SendOptions = {
  format: 'text',
  lineEnding: 'lf',
  escapes: true,
}

export const DEFAULT_PROFILE: DeviceProfile = {
  params: DEFAULT_PARAMS,
  send: DEFAULT_SEND_OPTIONS,
  displayFormat: 'text',
}

export const DEFAULT_TIMED_SEND: TimedSendConfig = {
  intervalMs: 1000,
  count: 0,
}

export const RULE_COLORS: RuleColor[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink']

export const DEFAULT_HIGHLIGHT_RULES: HighlightRule[] = [
  { id: 'error', pattern: '\\b(ERROR|FATAL|PANIC)\\b|\\bE \\(\\d+\\)', regex: true, caseSensitive: false, color: 'red', enabled: true },
  { id: 'warn', pattern: '\\bWARN(ING)?\\b|\\bW \\(\\d+\\)', regex: true, caseSensitive: false, color: 'orange', enabled: true },
]

/** 文本视图最多保留的行数 / hexdump 视图最多保留的行数 */
export const MAX_TEXT_LINES = 100_000
export const MAX_HEX_ROWS = 100_000

/** 没有换行的超长数据强制断行，避免单行无限增长 */
export const MAX_LINE_LENGTH = 4096

export const HEX_ROW_BYTES = 16

export const SEND_HISTORY_LIMIT = 100

export const SIGNAL_POLL_INTERVAL_MS = 250

export const BREAK_DURATION_MS = 250

export const WEBSOCKET_RETRY_MS = 2000

/** 发送输入框的 DOM id，快捷键 / 用它聚焦 */
export const SEND_INPUT_ID = 'send-input'
