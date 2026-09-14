import { create } from 'zustand'
import { toaster } from '@/components/ui/toaster'
import { SerialSession, type SessionHost } from '../engine/session'
import { disambiguateLabels, serialDevice, websocketDevice, type Device } from '../lib/device'
import { usePreferences } from './preferences-store'

export const isSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator

const ACTIVE_STATUSES = new Set(['opening', 'open', 'closing'])

interface WorkspaceState {
  /** 已授权的串口 + 保存的 WebSocket 地址 */
  devices: Device[]
  sessions: SerialSession[]
  activeId: string
  ready: boolean

  init: () => Promise<void>
  refreshDevices: () => Promise<void>
  requestSerialPort: () => Promise<Device | null>
  addWebSocket: (url: string) => void
  removeWebSocket: (url: string) => void
  newSession: (deviceId?: string | null) => SerialSession
  closeSession: (id: string) => void
  activate: (id: string) => void
  activateByOffset: (offset: number) => void
}

export const useWorkspace = create<WorkspaceState>()((set, get) => {
  const host: SessionHost = {
    getDevice: (id) => (id ? (get().devices.find((d) => d.id === id) ?? null) : null),
    isDeviceInUse: (deviceId, sessionId) =>
      get().sessions.some(
        (s) => s.id !== sessionId && s.state.deviceId === deviceId && ACTIVE_STATUSES.has(s.state.status),
      ),
    loadProfile: (key) => usePreferences.getState().getProfile(key),
    saveProfile: (key, profile) => usePreferences.getState().saveProfile(key, profile),
    onConnected: (device) => usePreferences.getState().set({ lastDeviceKey: device.profileKey }),
    autoReconnect: () => usePreferences.getState().autoReconnect,
    notify: (type, title, description) => toaster.create({ type, title, description, closable: true }),
  }

  /** 把各标签绑定的设备写入偏好，下次打开时恢复 */
  const syncTabs = () => {
    const { sessions, devices } = get()
    const tabs = sessions.map((s) => devices.find((d) => d.id === s.state.deviceId)?.profileKey ?? null)
    usePreferences.getState().set({ tabs })
  }

  const createSession = (deviceId: string | null) => {
    const session = new SerialSession(host, deviceId)
    session.store.subscribe((state, prev) => {
      if (state.deviceId !== prev.deviceId) syncTabs()
    })
    return session
  }

  /** 为新标签挑一个设备：优先上次使用的，其次第一个空闲的 */
  const pickDevice = (preferredKey: string | null, taken: Set<string>): string | null => {
    const free = get().devices.filter((d) => !taken.has(d.id))
    const preferred = preferredKey ? free.find((d) => d.profileKey === preferredKey) : undefined
    return (preferred ?? free.find((d) => d.kind === 'serial'))?.id ?? null
  }

  const takenDeviceIds = () => new Set(get().sessions.flatMap((s) => (s.state.deviceId ? [s.state.deviceId] : [])))

  const buildDevices = async () => {
    const ports = isSerialSupported ? await navigator.serial.getPorts() : []
    const ws = usePreferences.getState().wsEndpoints
    return disambiguateLabels([...ports.map(serialDevice), ...ws.map(websocketDevice)])
  }

  let initPromise: Promise<void> | null = null

  const initialize = async () => {
    set({ devices: await buildDevices() })

    // 恢复上次的标签页
    const prefs = usePreferences.getState()
    const tabKeys = prefs.tabs.length > 0 ? prefs.tabs : [prefs.lastDeviceKey]
    const taken = new Set<string>()
    const sessions = tabKeys.map((key) => {
      const deviceId = pickDevice(key, taken)
      if (deviceId) taken.add(deviceId)
      return createSession(key === null && prefs.tabs.length > 0 ? null : deviceId)
    })
    set({ sessions, activeId: sessions[0].id, ready: true })

    if (isSerialSupported) {
      navigator.serial.addEventListener('connect', () => void get().refreshDevices())
      navigator.serial.addEventListener('disconnect', () => void get().refreshDevices())
    }
  }

  return {
    devices: [],
    sessions: [],
    activeId: '',
    ready: false,

    init: () => {
      // StrictMode 下 effect 会执行两次，用同一个 Promise 保证只初始化一次
      initPromise ??= initialize()
      return initPromise
    },

    refreshDevices: async () => {
      const devices = await buildDevices()
      set({ devices })
      for (const session of get().sessions) session.handleDevicesChanged(devices)
    },

    requestSerialPort: async () => {
      if (!isSerialSupported) return null
      try {
        const port = await navigator.serial.requestPort()
        await get().refreshDevices()
        const device = get().devices.find((d) => d.kind === 'serial' && d.port === port) ?? null
        const active = get().sessions.find((s) => s.id === get().activeId)
        if (device && active?.state.status === 'idle') active.selectDevice(device.id)
        return device
      } catch (error) {
        // 用户取消选择
        if (error instanceof DOMException && error.name === 'NotFoundError') return null
        host.notify('error', String(error))
        return null
      }
    },

    addWebSocket: (url) => {
      usePreferences.getState().addWsEndpoint(url)
      void get()
        .refreshDevices()
        .then(() => {
          const device = get().devices.find((d) => d.kind === 'websocket' && d.url === url)
          const active = get().sessions.find((s) => s.id === get().activeId)
          if (device && active?.state.status === 'idle') active.selectDevice(device.id)
        })
    },

    removeWebSocket: (url) => {
      usePreferences.getState().removeWsEndpoint(url)
      void get().refreshDevices()
    },

    newSession: (deviceId) => {
      const session = createSession(deviceId === undefined ? pickDevice(null, takenDeviceIds()) : deviceId)
      set((s) => ({ sessions: [...s.sessions, session], activeId: session.id }))
      syncTabs()
      return session
    },

    closeSession: (id) => {
      const { sessions, activeId } = get()
      const index = sessions.findIndex((s) => s.id === id)
      if (index < 0) return
      void sessions[index].dispose()
      let rest = sessions.filter((s) => s.id !== id)
      // 始终保留至少一个标签
      if (rest.length === 0) rest = [createSession(null)]
      const nextActive = activeId === id ? rest[Math.min(index, rest.length - 1)].id : activeId
      set({ sessions: rest, activeId: nextActive })
      syncTabs()
    },

    activate: (id) => set({ activeId: id }),

    activateByOffset: (offset) => {
      const { sessions, activeId } = get()
      const index = sessions.findIndex((s) => s.id === activeId)
      const next = sessions[(index + offset + sessions.length) % sessions.length]
      if (next) set({ activeId: next.id })
    },
  }
})
