import { createStore, type StoreApi } from 'zustand/vanilla'
import i18n from '@/i18n'
import { FileSink } from '@/lib/file-sink'
import { startInterval } from '@/lib/interval-timer'
import { encodeInput, errorMessage, formatFrame, sleep } from '../lib/codec'
import { BREAK_DURATION_MS, SIGNAL_POLL_INTERVAL_MS, WEBSOCKET_RETRY_MS } from '../lib/constants'
import { createTransport, type Device } from '../lib/device'
import { exportHexRow, exportLine } from '../lib/row-text'
import type {
  DataFormat,
  DeviceProfile,
  HexRow,
  OutputSignals,
  SendOptions,
  SerialParams,
  SessionStatus,
  SysLevel,
  TextLine,
  TimedSendConfig,
  TrafficStats,
} from '../lib/types'
import type { Transport } from '../transport/transport'
import { LogModel } from './log-model'

export interface SessionState {
  deviceId: string | null
  status: SessionStatus
  params: SerialParams
  send: SendOptions
  displayFormat: DataFormat
  signals: OutputSignals
  inputSignals: SerialInputSignals | null
  stats: TrafficStats
  lines: TextLine[]
  hexRows: HexRow[]
  timedSend: { running: boolean; sent: number }
  fileLog: { name: string; bytes: number } | null
  /** 正在执行复位时序等不可打断的操作 */
  busy: boolean
  /** 等待重连期间设备已从列表消失，保留其名称用于显示 */
  lostDeviceLabel: string | null
}

export type NotifyType = 'success' | 'error' | 'warning' | 'info'

/** 会话依赖的外部能力，由工作区注入，避免引擎直接依赖 UI 与存储 */
export interface SessionHost {
  getDevice(id: string | null): Device | null
  isDeviceInUse(deviceId: string, sessionId: string): boolean
  loadProfile(profileKey: string): DeviceProfile
  saveProfile(profileKey: string, profile: DeviceProfile): void
  onConnected(device: Device): void
  autoReconnect(): boolean
  notify(type: NotifyType, title: string, description?: string): void
}

export type ResetMode = 'reset' | 'bootloader'

const NO_SIGNALS: OutputSignals = { dataTerminalReady: false, requestToSend: false }

/**
 * 一个串口会话（对应一个标签页）。持有连接、日志与定时任务等非序列化资源，
 * 对外通过 zustand vanilla store 暴露不可变状态供 UI 订阅。
 */
export class SerialSession {
  readonly id = crypto.randomUUID()
  readonly store: StoreApi<SessionState>

  private readonly log = new LogModel()
  private transport: Transport | null = null
  private reconnectKey: string | null = null
  private retryTimer: ReturnType<typeof setInterval> | null = null
  private flushFrame: number | null = null
  private stats: TrafficStats = { rx: 0, tx: 0 }
  private stopSignalPoll: (() => void) | null = null
  private stopTimedSend: (() => void) | null = null
  private fileSink: FileSink | null = null
  private readonly host: SessionHost

  constructor(host: SessionHost, deviceId: string | null) {
    this.host = host
    const device = host.getDevice(deviceId)
    const profile = device ? host.loadProfile(device.profileKey) : host.loadProfile('')
    this.store = createStore<SessionState>(() => ({
      deviceId: device?.id ?? null,
      status: 'idle',
      params: profile.params,
      send: profile.send,
      displayFormat: profile.displayFormat,
      signals: NO_SIGNALS,
      inputSignals: null,
      stats: this.stats,
      lines: [],
      hexRows: [],
      timedSend: { running: false, sent: 0 },
      fileLog: null,
      busy: false,
      lostDeviceLabel: null,
    }))
  }

  get state() {
    return this.store.getState()
  }

  get device() {
    return this.host.getDevice(this.state.deviceId)
  }

  private set(patch: Partial<SessionState>) {
    this.store.setState(patch)
  }

  private t(key: string, options?: Record<string, unknown>) {
    return i18n.t(key, options)
  }

  // ───────────────────────── 配置 ─────────────────────────

  selectDevice(deviceId: string | null) {
    if (this.state.status !== 'idle') return
    const device = this.host.getDevice(deviceId)
    if (!device) {
      this.set({ deviceId: null })
      return
    }
    const profile = this.host.loadProfile(device.profileKey)
    this.set({ deviceId: device.id, params: profile.params, send: profile.send, displayFormat: profile.displayFormat })
  }

  updateParams(patch: Partial<SerialParams>) {
    this.set({ params: { ...this.state.params, ...patch } })
    this.persistProfile()
  }

  updateSendOptions(patch: Partial<SendOptions>) {
    this.set({ send: { ...this.state.send, ...patch } })
    this.persistProfile()
  }

  setDisplayFormat(displayFormat: DataFormat) {
    this.set({ displayFormat })
    this.persistProfile()
  }

  private persistProfile() {
    const device = this.device
    if (!device) return
    const { params, send, displayFormat } = this.state
    this.host.saveProfile(device.profileKey, { params, send, displayFormat })
  }

  // ───────────────────────── 连接 ─────────────────────────

  async connect({ silent = false } = {}): Promise<boolean> {
    const { status, params } = this.state
    if (status !== 'idle' && status !== 'reconnecting') return false
    const device = this.device
    if (!device) return false
    if (this.host.isDeviceInUse(device.id, this.id)) {
      this.host.notify('warning', this.t('notify.deviceInUse'))
      return false
    }

    const transport = createTransport(device)
    this.set({ status: 'opening' })
    try {
      await transport.open(params)
    } catch (error) {
      if (this.reconnectKey) {
        this.set({ status: 'reconnecting' })
      } else {
        this.set({ status: 'idle' })
      }
      if (!silent) {
        this.appendSys(this.t('sys.openFailed', { error: errorMessage(error) }), 'error')
        this.host.notify('error', this.t('notify.openFailed'), errorMessage(error))
      }
      return false
    }

    this.transport = transport
    this.clearReconnect()
    this.log.resetStream()
    this.set({ status: 'open', signals: NO_SIGNALS, inputSignals: null })
    this.appendSys(
      device.kind === 'serial'
        ? this.t('sys.connected', { device: device.label, frame: formatFrame(params) })
        : this.t('sys.connectedWs', { url: device.url }),
    )
    this.persistProfile()
    this.host.onConnected(device)
    this.startSignalPolling(transport)
    void this.readLoop(transport, device)
    return true
  }

  async disconnect() {
    const { status } = this.state
    if (status === 'reconnecting') {
      this.clearReconnect()
      this.set({ status: 'idle' })
      this.appendSys(this.t('sys.reconnectCancelled'))
      return
    }
    if (status !== 'open' || !this.transport) return
    const transport = this.transport
    this.set({ status: 'closing' })
    this.teardownConnection()
    await transport.close()
    this.set({ status: 'idle' })
    this.appendSys(this.t('sys.disconnected'))
  }

  private async readLoop(transport: Transport, device: Device) {
    const reason = await transport.read({
      onData: (chunk) => this.onData(chunk),
      onError: (error) => this.appendSys(this.t('sys.readError', { error: errorMessage(error) }), 'warn'),
    })
    // 主动断开时 transport 已被置空，无需处理
    if (reason === 'closed' || this.transport !== transport) return

    this.teardownConnection()
    await transport.close()
    this.appendSys(this.t('sys.connectionLost'), 'error')

    if (this.host.autoReconnect()) {
      this.reconnectKey = device.profileKey
      this.set({ status: 'reconnecting', lostDeviceLabel: device.label })
      this.appendSys(this.t('sys.waitingReconnect'), 'warn')
      this.host.notify('warning', this.t('notify.connectionLost'), this.t('notify.waitingReconnect'))
      // WebSocket 没有热插拔事件，定时重试
      if (device.kind === 'websocket') {
        this.retryTimer = setInterval(() => void this.connect({ silent: true }), WEBSOCKET_RETRY_MS)
      }
    } else {
      this.set({ status: 'idle' })
      this.host.notify('warning', this.t('notify.connectionLost'))
    }
  }

  /** 设备列表变化（热插拔）时由工作区调用：等待重连的会话找回同一型号的设备 */
  handleDevicesChanged(devices: Device[]) {
    if (this.state.status !== 'reconnecting' || !this.reconnectKey) return
    const candidate = devices.find(
      (d) => d.kind === 'serial' && d.profileKey === this.reconnectKey && !this.host.isDeviceInUse(d.id, this.id),
    )
    if (!candidate) return
    this.set({ deviceId: candidate.id })
    // 设备刚枚举出来时驱动可能尚未就绪，稍等再打开
    setTimeout(() => void this.connect({ silent: true }), 300)
  }

  private clearReconnect() {
    this.reconnectKey = null
    if (this.state.lostDeviceLabel) this.set({ lostDeviceLabel: null })
    if (this.retryTimer) clearInterval(this.retryTimer)
    this.retryTimer = null
  }

  private teardownConnection() {
    this.transport = null
    this.stopTimed()
    this.stopSignalPoll?.()
    this.stopSignalPoll = null
    this.set({ signals: NO_SIGNALS, inputSignals: null, busy: false })
  }

  // ───────────────────────── 数据 ─────────────────────────

  private onData(chunk: Uint8Array) {
    this.log.appendRx(chunk)
    this.stats = { ...this.stats, rx: this.stats.rx + chunk.length }
    this.scheduleFlush()
  }

  private appendSys(text: string, level: SysLevel = 'info') {
    this.log.appendSys(text, level)
    this.scheduleFlush()
  }

  private scheduleFlush() {
    this.flushFrame ??= requestAnimationFrame(() => {
      this.flushFrame = null
      const changed = this.log.commit()
      const patch: Partial<SessionState> = {}
      if (changed) {
        patch.lines = this.log.lines
        patch.hexRows = this.log.hexRows
      }
      if (this.stats !== this.state.stats) patch.stats = this.stats
      if (this.fileSink && this.state.fileLog?.bytes !== this.fileSink.bytesWritten) {
        patch.fileLog = { name: this.fileSink.name, bytes: this.fileSink.bytesWritten }
      }
      this.set(patch)
    })
  }

  async send(input: string): Promise<boolean> {
    const transport = this.transport
    if (!transport || this.state.status !== 'open') return false
    try {
      const bytes = encodeInput(input, this.state.send)
      await transport.write(bytes)
      this.log.appendTx(bytes)
      this.stats = { ...this.stats, tx: this.stats.tx + bytes.length }
      this.scheduleFlush()
      return true
    } catch (error) {
      this.host.notify('error', this.t('notify.sendFailed'), errorMessage(error))
      return false
    }
  }

  startTimedSend(input: string, { intervalMs, count }: TimedSendConfig) {
    if (this.state.status !== 'open') return
    this.stopTimed()
    let sent = 0
    let pending = false
    const tick = async () => {
      if (pending) return // 上一次写入尚未完成，跳过本次
      pending = true
      const ok = await this.send(input)
      pending = false
      if (!ok) return this.stopTimed()
      sent++
      this.set({ timedSend: { running: true, sent } })
      if (count > 0 && sent >= count) this.stopTimed()
    }
    this.set({ timedSend: { running: true, sent: 0 } })
    this.stopTimedSend = startInterval(Math.max(10, intervalMs), () => void tick())
    void tick()
  }

  stopTimed() {
    this.stopTimedSend?.()
    this.stopTimedSend = null
    if (this.state.timedSend.running) this.set({ timedSend: { ...this.state.timedSend, running: false } })
  }

  clear() {
    this.log.clear()
    this.stats = { rx: 0, tx: 0 }
    this.scheduleFlush()
  }

  exportText(): string {
    const { displayFormat, lines, hexRows } = this.state
    return displayFormat === 'hex' ? hexRows.map(exportHexRow).join('\n') : lines.map(exportLine).join('\n')
  }

  // ───────────────────────── 文件记录 ─────────────────────────

  async startFileLog() {
    if (this.fileSink) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    try {
      const sink = await FileSink.pick(`serial-${stamp}.log`)
      if (!sink) return
      this.fileSink = sink
      this.log.onLineClosed = (line) => sink.write(exportLine(line))
      this.set({ fileLog: { name: sink.name, bytes: 0 } })
      this.appendSys(this.t('sys.fileLogStarted', { name: sink.name }))
    } catch (error) {
      this.host.notify('error', this.t('notify.fileLogFailed'), errorMessage(error))
    }
  }

  async stopFileLog() {
    const sink = this.fileSink
    if (!sink) return
    const open = this.log.openLine()
    if (open) sink.write(exportLine(open))
    this.log.onLineClosed = undefined
    this.fileSink = null
    this.set({ fileLog: null })
    try {
      await sink.close()
      this.appendSys(this.t('sys.fileLogStopped', { name: sink.name }))
    } catch (error) {
      this.host.notify('error', this.t('notify.fileLogFailed'), errorMessage(error))
    }
  }

  // ───────────────────────── 控制信号 ─────────────────────────

  private startSignalPolling(transport: Transport) {
    if (!transport.getSignals) return
    let polling = false
    const timer = setInterval(async () => {
      if (polling || this.transport !== transport) return
      polling = true
      try {
        const next = await transport.getSignals!()
        const prev = this.state.inputSignals
        const changed =
          !prev ||
          prev.clearToSend !== next.clearToSend ||
          prev.dataSetReady !== next.dataSetReady ||
          prev.dataCarrierDetect !== next.dataCarrierDetect ||
          prev.ringIndicator !== next.ringIndicator
        if (changed && this.transport === transport) this.set({ inputSignals: next })
      } catch {
        // 部分驱动不支持读取输入信号，忽略
      } finally {
        polling = false
      }
    }, SIGNAL_POLL_INTERVAL_MS)
    this.stopSignalPoll = () => clearInterval(timer)
  }

  async setSignal(key: keyof OutputSignals, value: boolean) {
    const next = { ...this.state.signals, [key]: value }
    await this.applySignals(next)
  }

  private async applySignals(signals: OutputSignals) {
    try {
      await this.transport?.setSignals?.(signals)
      this.set({ signals })
    } catch (error) {
      this.host.notify('error', this.t('notify.signalFailed'), errorMessage(error))
    }
  }

  async sendBreak() {
    const transport = this.transport
    if (!transport?.setSignals || this.state.busy) return
    this.set({ busy: true })
    try {
      await transport.setSignals({ break: true })
      await sleep(BREAK_DURATION_MS)
      await transport.setSignals({ break: false })
      this.appendSys(this.t('sys.breakSent', { ms: BREAK_DURATION_MS }))
    } catch (error) {
      this.host.notify('error', this.t('notify.signalFailed'), errorMessage(error))
    } finally {
      this.set({ busy: false })
    }
  }

  /**
   * ESP32 等板子的自动复位电路：RTS 接 EN（复位），DTR 接 IO0（启动模式），均为低电平有效。
   * 时序参考 esptool 的 ClassicReset / HardReset。
   */
  async resetDevice(mode: ResetMode) {
    const transport = this.transport
    if (!transport?.setSignals || this.state.busy) return
    const set = (dataTerminalReady: boolean, requestToSend: boolean) =>
      transport.setSignals!({ dataTerminalReady, requestToSend })
    this.set({ busy: true })
    try {
      await set(false, true) // EN 拉低，芯片进入复位
      await sleep(100)
      if (mode === 'bootloader') {
        await set(true, false) // IO0 拉低的同时释放 EN
        await sleep(50)
      }
      await set(false, false)
      this.log.resetStream()
      this.set({ signals: NO_SIGNALS })
      this.appendSys(this.t(mode === 'bootloader' ? 'sys.enteredBootloader' : 'sys.resetDone'))
    } catch (error) {
      this.host.notify('error', this.t('notify.signalFailed'), errorMessage(error))
    } finally {
      this.set({ busy: false })
    }
  }

  async dispose() {
    this.clearReconnect()
    await this.stopFileLog()
    await this.disconnect()
    if (this.flushFrame) cancelAnimationFrame(this.flushFrame)
  }
}
