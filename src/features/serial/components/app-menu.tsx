import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import {
  LuCable,
  LuCircleStop,
  LuDownload,
  LuFileText,
  LuGlobe,
  LuHighlighter,
  LuKeyboard,
  LuMenu,
  LuMonitor,
  LuMoon,
  LuSun,
  LuTrash2,
} from 'react-icons/lu'
import { isFileSinkSupported } from '@/lib/file-sink'
import { useSession, useSessionState } from '../hooks/session-context'
import { useSessionActions } from '../hooks/use-session-actions'
import { usePreferences, type LanguagePreference } from '../store/preferences-store'
import { useUi } from '../store/ui-store'
import { isSerialSupported, useWorkspace } from '../store/workspace-store'

const THEMES = [
  { value: 'system', labelKey: 'menu.themeSystem', icon: <LuMonitor /> },
  { value: 'light', labelKey: 'menu.themeLight', icon: <LuSun /> },
  { value: 'dark', labelKey: 'menu.themeDark', icon: <LuMoon /> },
]

const LANGUAGES: { value: LanguagePreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

export function AppMenu() {
  const { t } = useTranslation()
  const session = useSession()
  const { exportLog } = useSessionActions()
  const fileLog = useSessionState((s) => s.fileLog)
  const requestSerialPort = useWorkspace((s) => s.requestSerialPort)
  const openDialog = useUi((s) => s.openDialog)
  const autoReconnect = usePreferences((s) => s.autoReconnect)
  const language = usePreferences((s) => s.language)
  const setPrefs = usePreferences((s) => s.set)
  const { theme, setTheme } = useTheme()

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <IconButton aria-label={t('menu.open')} size="sm" variant="ghost">
          <LuMenu />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="60">
            <Menu.Item value="add-serial" disabled={!isSerialSupported} onSelect={() => void requestSerialPort()}>
              <LuCable />
              <Menu.ItemText>{t('menu.addSerial')}</Menu.ItemText>
            </Menu.Item>
            <Menu.Item value="add-websocket" onSelect={() => openDialog('websocket')}>
              <LuGlobe />
              <Menu.ItemText>{t('menu.addWebsocket')}</Menu.ItemText>
            </Menu.Item>
            <Menu.Separator />

            <Menu.Item value="export" onSelect={exportLog}>
              <LuDownload />
              <Menu.ItemText>{t('menu.export')}</Menu.ItemText>
              <Menu.ItemCommand>Ctrl+S</Menu.ItemCommand>
            </Menu.Item>
            {fileLog ? (
              <Menu.Item value="file-log" onSelect={() => void session.stopFileLog()}>
                <LuCircleStop />
                <Menu.ItemText>{t('menu.stopFileLog')}</Menu.ItemText>
              </Menu.Item>
            ) : (
              <Menu.Item value="file-log" disabled={!isFileSinkSupported} onSelect={() => void session.startFileLog()}>
                <LuFileText />
                <Menu.ItemText>{t('menu.startFileLog')}</Menu.ItemText>
              </Menu.Item>
            )}
            <Menu.Item value="clear" onSelect={() => session.clear()}>
              <LuTrash2 />
              <Menu.ItemText>{t('menu.clear')}</Menu.ItemText>
              <Menu.ItemCommand>Alt+L</Menu.ItemCommand>
            </Menu.Item>
            <Menu.Separator />

            <Menu.Item value="rules" onSelect={() => openDialog('highlight-rules')}>
              <LuHighlighter />
              <Menu.ItemText>{t('menu.highlightRules')}</Menu.ItemText>
            </Menu.Item>
            <Menu.CheckboxItem
              value="auto-reconnect"
              checked={autoReconnect}
              onCheckedChange={(checked) => setPrefs({ autoReconnect: checked })}
            >
              <Menu.ItemText>{t('menu.autoReconnect')}</Menu.ItemText>
              <Menu.ItemIndicator />
            </Menu.CheckboxItem>
            <Menu.Separator />

            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>{t('menu.theme')}</Menu.ItemGroupLabel>
              <Menu.RadioItemGroup value={theme} onValueChange={(e) => setTheme(e.value)}>
                {THEMES.map((item) => (
                  <Menu.RadioItem key={item.value} value={item.value}>
                    {item.icon}
                    <Menu.ItemText>{t(item.labelKey)}</Menu.ItemText>
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.ItemGroup>
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>{t('menu.language')}</Menu.ItemGroupLabel>
              <Menu.RadioItemGroup
                value={language}
                onValueChange={(e) => setPrefs({ language: e.value as LanguagePreference })}
              >
                {LANGUAGES.map((item) => (
                  <Menu.RadioItem key={item.value} value={item.value}>
                    <Menu.ItemText>{item.value === 'auto' ? t('menu.languageAuto') : item.label}</Menu.ItemText>
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.ItemGroup>
            <Menu.Separator />

            <Menu.Item value="shortcuts" onSelect={() => openDialog('shortcuts')}>
              <LuKeyboard />
              <Menu.ItemText>{t('menu.shortcuts')}</Menu.ItemText>
              <Menu.ItemCommand>?</Menu.ItemCommand>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
