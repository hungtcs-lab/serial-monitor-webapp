import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_HIGHLIGHT_RULES, DEFAULT_PROFILE, DEFAULT_TIMED_SEND, SEND_HISTORY_LIMIT } from '../lib/constants'
import type { DeviceProfile, HighlightRule, TimedSendConfig } from '../lib/types'

export type LanguagePreference = 'auto' | 'zh-CN' | 'en'

interface PreferencesState {
  /** 按设备（USB VID:PID / WebSocket 地址）记住的参数 */
  profiles: Record<string, DeviceProfile>
  /** 最近一次使用的参数，作为新设备的默认值 */
  lastProfile: DeviceProfile
  lastDeviceKey: string | null
  /** 上次打开的标签页（每个标签绑定的设备），用于恢复 */
  tabs: (string | null)[]

  showTimestamp: boolean
  autoScroll: boolean
  ansi: boolean
  showTx: boolean
  autoReconnect: boolean
  history: string[]
  highlightRules: HighlightRule[]
  wsEndpoints: string[]
  timedSend: TimedSendConfig
  language: LanguagePreference

  getProfile: (key: string) => DeviceProfile
  saveProfile: (key: string, profile: DeviceProfile) => void
  set: (patch: Partial<PreferencesData>) => void
  pushHistory: (entry: string) => void
  clearHistory: () => void
  addWsEndpoint: (url: string) => void
  removeWsEndpoint: (url: string) => void
}

type PreferencesData = Omit<
  PreferencesState,
  'getProfile' | 'saveProfile' | 'set' | 'pushHistory' | 'clearHistory' | 'addWsEndpoint' | 'removeWsEndpoint'
>

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      profiles: {},
      lastProfile: DEFAULT_PROFILE,
      lastDeviceKey: null,
      tabs: [],
      showTimestamp: true,
      autoScroll: true,
      ansi: true,
      showTx: true,
      autoReconnect: true,
      history: [],
      highlightRules: DEFAULT_HIGHLIGHT_RULES,
      wsEndpoints: [],
      timedSend: DEFAULT_TIMED_SEND,
      language: 'auto',

      getProfile: (key) => get().profiles[key] ?? get().lastProfile,
      saveProfile: (key, profile) =>
        set((s) => ({ profiles: key ? { ...s.profiles, [key]: profile } : s.profiles, lastProfile: profile })),
      set: (patch) => set(patch),
      pushHistory: (entry) =>
        set((s) => ({ history: [entry, ...s.history.filter((h) => h !== entry)].slice(0, SEND_HISTORY_LIMIT) })),
      clearHistory: () => set({ history: [] }),
      addWsEndpoint: (url) => set((s) => ({ wsEndpoints: s.wsEndpoints.includes(url) ? s.wsEndpoints : [...s.wsEndpoints, url] })),
      removeWsEndpoint: (url) => set((s) => ({ wsEndpoints: s.wsEndpoints.filter((u) => u !== url) })),
    }),
    {
      name: 'serial-monitor:preferences',
      version: 1,
    },
  ),
)
