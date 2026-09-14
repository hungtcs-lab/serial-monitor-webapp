import { create } from 'zustand'
import type { SearchQuery } from '../lib/types'

export type DialogName = 'highlight-rules' | 'websocket' | 'shortcuts'

interface UiState {
  dialog: DialogName | null
  searchOpen: boolean
  search: SearchQuery
  /** 当前定位到的匹配序号 */
  searchIndex: number
  /** 每次请求打开搜索时递增，用于重新聚焦输入框 */
  searchFocusToken: number
  openDialog: (dialog: DialogName) => void
  closeDialog: () => void
  openSearch: () => void
  closeSearch: () => void
  setSearch: (patch: Partial<SearchQuery>) => void
  setSearchIndex: (index: number) => void
}

export const useUi = create<UiState>()((set) => ({
  dialog: null,
  searchOpen: false,
  search: { text: '', regex: false, caseSensitive: false },
  searchIndex: 0,
  searchFocusToken: 0,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  openSearch: () => set((s) => ({ searchOpen: true, searchFocusToken: s.searchFocusToken + 1 })),
  closeSearch: () => set({ searchOpen: false }),
  setSearch: (patch) => set((s) => ({ search: { ...s.search, ...patch }, searchIndex: 0 })),
  setSearchIndex: (searchIndex) => set({ searchIndex }),
}))
