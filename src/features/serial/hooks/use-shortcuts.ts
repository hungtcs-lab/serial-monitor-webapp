import { useEffect } from 'react'
import { SEND_INPUT_ID } from '../lib/constants'
import { useSessionActions } from './use-session-actions'
import { useSession } from './session-context'
import { useUi } from '../store/ui-store'
import { useWorkspace } from '../store/workspace-store'

export interface ShortcutDefinition {
  keys: string[]
  descriptionKey: string
}

/** 快捷键列表（同时用于帮助对话框）。Alt 组合键避开浏览器保留的 Ctrl+T / Ctrl+W 等 */
export const SHORTCUTS: { groupKey: string; items: ShortcutDefinition[] }[] = [
  {
    groupKey: 'shortcuts.groupConnection',
    items: [
      { keys: ['Alt', 'Enter'], descriptionKey: 'shortcuts.toggleConnection' },
      { keys: ['Alt', 'T'], descriptionKey: 'shortcuts.newTab' },
      { keys: ['Alt', 'W'], descriptionKey: 'shortcuts.closeTab' },
      { keys: ['Alt', '1…9'], descriptionKey: 'shortcuts.switchTab' },
      { keys: ['Alt', '[ / ]'], descriptionKey: 'shortcuts.prevNextTab' },
    ],
  },
  {
    groupKey: 'shortcuts.groupTerminal',
    items: [
      { keys: ['Ctrl', 'F'], descriptionKey: 'shortcuts.search' },
      { keys: ['Enter / Shift+Enter'], descriptionKey: 'shortcuts.searchNext' },
      { keys: ['Alt', 'H'], descriptionKey: 'shortcuts.toggleHex' },
      { keys: ['Alt', 'L'], descriptionKey: 'shortcuts.clear' },
      { keys: ['Ctrl', 'S'], descriptionKey: 'shortcuts.export' },
    ],
  },
  {
    groupKey: 'shortcuts.groupSend',
    items: [
      { keys: ['/'], descriptionKey: 'shortcuts.focusInput' },
      { keys: ['Enter'], descriptionKey: 'shortcuts.send' },
      { keys: ['↑ / ↓'], descriptionKey: 'shortcuts.history' },
      { keys: ['?'], descriptionKey: 'shortcuts.help' },
    ],
  },
]

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function useShortcuts() {
  const session = useSession()
  const { connect, exportLog } = useSessionActions()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const ui = useUi.getState()
      const workspace = useWorkspace.getState()
      const run = (action: () => void) => {
        e.preventDefault()
        action()
      }

      if (mod && !e.altKey && e.code === 'KeyF') return run(ui.openSearch)
      if (mod && !e.altKey && e.code === 'KeyS') return run(exportLog)

      if (e.altKey && !mod) {
        if (e.code === 'Enter') {
          return run(() => {
            const { status } = session.state
            if (status === 'idle') void connect()
            else void session.disconnect()
          })
        }
        if (e.code === 'KeyL') return run(() => session.clear())
        if (e.code === 'KeyH') {
          return run(() => session.setDisplayFormat(session.state.displayFormat === 'hex' ? 'text' : 'hex'))
        }
        if (e.code === 'KeyT') return run(() => workspace.newSession())
        if (e.code === 'KeyW') return run(() => workspace.closeSession(session.id))
        if (e.code === 'BracketLeft') return run(() => workspace.activateByOffset(-1))
        if (e.code === 'BracketRight') return run(() => workspace.activateByOffset(1))
        const digit = /^Digit([1-9])$/.exec(e.code)
        if (digit) {
          const target = workspace.sessions[Number(digit[1]) - 1]
          if (target) return run(() => workspace.activate(target.id))
        }
      }

      if (!mod && !e.altKey && !isTyping(e.target)) {
        if (e.key === '?') return run(() => ui.openDialog('shortcuts'))
        if (e.key === '/') return run(() => document.getElementById(SEND_INPUT_ID)?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [session, connect, exportLog])
}
