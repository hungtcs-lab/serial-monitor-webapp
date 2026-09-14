import { createContext, use } from 'react'
import { useStore } from 'zustand'
import type { SerialSession, SessionState } from '../engine/session'

export const SessionContext = createContext<SerialSession | null>(null)

/** 当前标签页的会话 */
export function useSession(): SerialSession {
  const session = use(SessionContext)
  if (!session) throw new Error('useSession must be used within <SessionContext>')
  return session
}

/** 订阅当前会话状态的一部分，只有选中的值变化时才重新渲染 */
export function useSessionState<T>(selector: (state: SessionState) => T): T {
  return useStore(useSession().store, selector)
}
