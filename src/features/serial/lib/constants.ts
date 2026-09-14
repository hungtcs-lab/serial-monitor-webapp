import type { LineEnding, Option, OutputSignals, PortSettings, ViewOptions } from './types'

export const BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000, 1500000, 2000000,
]

export const DATA_BITS_OPTIONS: Option[] = [
  { label: '8', value: '8' },
  { label: '7', value: '7' },
]

export const STOP_BITS_OPTIONS: Option[] = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
]

export const PARITY_OPTIONS: Option<ParityType>[] = [
  { label: 'None', value: 'none' },
  { label: 'Even', value: 'even' },
  { label: 'Odd', value: 'odd' },
]

export const FLOW_CONTROL_OPTIONS: Option<FlowControlType>[] = [
  { label: 'None', value: 'none' },
  { label: 'RTS/CTS', value: 'hardware' },
]

export const LINE_ENDINGS: Record<LineEnding, string> = {
  none: '',
  lf: '\n',
  cr: '\r',
  crlf: '\r\n',
}

export const LINE_ENDING_OPTIONS: Option<LineEnding>[] = [
  { label: '无', value: 'none' },
  { label: 'LF', value: 'lf' },
  { label: 'CR', value: 'cr' },
  { label: 'CRLF', value: 'crlf' },
]

export const DEFAULT_SETTINGS: PortSettings = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
}

export const DEFAULT_SIGNALS: OutputSignals = {
  dataTerminalReady: false,
  requestToSend: false,
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  format: 'text',
  showTimestamp: true,
  autoScroll: true,
}

/** 日志最多保留条数 */
export const MAX_LOG_ENTRIES = 5000

/** 同一行内相邻 RX 分片的合并窗口 */
export const RX_MERGE_WINDOW_MS = 50

export const SEND_HISTORY_LIMIT = 50
