import type { SerialParams } from '../lib/types'

/** 读循环结束的原因：主动关闭 / 连接丢失（拔出设备、服务端断开） */
export type ReadEndReason = 'closed' | 'lost'

export interface ReadHandlers {
  onData: (chunk: Uint8Array) => void
  /** 非致命错误（帧错误、校验错误、缓冲区溢出等），读取会继续 */
  onError: (error: unknown) => void
}

/** 数据通道抽象：Web Serial 串口与 WebSocket 桥接共用同一套会话逻辑 */
export interface Transport {
  readonly kind: 'serial' | 'websocket'
  open(params: SerialParams): Promise<void>
  /** 持续读取直到连接关闭，返回结束原因 */
  read(handlers: ReadHandlers): Promise<ReadEndReason>
  write(data: Uint8Array): Promise<void>
  close(): Promise<void>
  setSignals?(signals: SerialOutputSignals): Promise<void>
  getSignals?(): Promise<SerialInputSignals>
}
