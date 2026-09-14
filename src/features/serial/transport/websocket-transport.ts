import type { ReadEndReason, ReadHandlers, Transport } from './transport'

const encoder = new TextEncoder()

/**
 * WebSocket 桥接：配合 websocat 等工具把 /dev/pts/N、TCP 串口服务器等转发到浏览器。
 * 串口参数与控制信号由桥接端决定，这里不支持。
 */
export class WebSocketTransport implements Transport {
  readonly kind = 'websocket'
  private socket: WebSocket | null = null
  private closing = false

  readonly url: string

  constructor(url: string) {
    this.url = url
  }

  open() {
    this.closing = false
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url)
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        this.socket = socket
        resolve()
      }
      socket.onerror = () => reject(new Error(`WebSocket connection failed: ${this.url}`))
    })
  }

  read({ onData }: ReadHandlers) {
    const socket = this.socket
    if (!socket) return Promise.resolve<ReadEndReason>('closed')
    return new Promise<ReadEndReason>((resolve) => {
      socket.onmessage = (event) => {
        onData(typeof event.data === 'string' ? encoder.encode(event.data) : new Uint8Array(event.data))
      }
      socket.onclose = () => resolve(this.closing ? 'closed' : 'lost')
    })
  }

  async write(data: Uint8Array) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open')
    this.socket.send(data as Uint8Array<ArrayBuffer>)
  }

  async close() {
    this.closing = true
    this.socket?.close()
    this.socket = null
  }
}
