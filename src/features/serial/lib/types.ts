export type SerialStatus = 'closed' | 'opening' | 'open' | 'closing'

export type DataFormat = 'text' | 'hex'

export type LineEnding = 'none' | 'lf' | 'cr' | 'crlf'

export interface PortSettings {
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: ParityType
  flowControl: FlowControlType
}

export interface OutputSignals {
  dataTerminalReady: boolean
  requestToSend: boolean
}

export type LogDirection = 'rx' | 'tx' | 'sys'

export interface LogEntry {
  id: number
  dir: LogDirection
  time: number
  bytes: Uint8Array
  text: string
}

export interface TrafficStats {
  rx: number
  tx: number
}

export interface ViewOptions {
  format: DataFormat
  showTimestamp: boolean
  autoScroll: boolean
}

export interface Option<T extends string = string> {
  label: string
  value: T
}
