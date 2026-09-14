import { IconButton, Menu, Portal } from '@chakra-ui/react'
import { useTheme } from 'next-themes'
import { LuDownload, LuMenu, LuMonitor, LuMoon, LuPlus, LuSun, LuTrash2 } from 'react-icons/lu'
import { useSerialMonitor } from '../context/serial-monitor-context'
import { isSerialSupported } from '../hooks/use-serial-port'

const THEMES = [
  { value: 'system', label: '跟随系统', icon: <LuMonitor /> },
  { value: 'light', label: '浅色', icon: <LuSun /> },
  { value: 'dark', label: '深色', icon: <LuMoon /> },
]

export function AppMenu() {
  const { entries, exportLog, clearLog, requestPort, status } = useSerialMonitor()
  const { theme, setTheme } = useTheme()
  const empty = entries.length === 0

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <IconButton aria-label="菜单" size="sm" variant="ghost">
          <LuMenu />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="52">
            <Menu.Item value="add-port" disabled={!isSerialSupported || status !== 'closed'} onSelect={requestPort}>
              <LuPlus />
              <Menu.ItemText>添加串口设备…</Menu.ItemText>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item value="export" disabled={empty} onSelect={exportLog}>
              <LuDownload />
              <Menu.ItemText>导出日志</Menu.ItemText>
            </Menu.Item>
            <Menu.Item value="clear" disabled={empty} onSelect={clearLog}>
              <LuTrash2 />
              <Menu.ItemText>清空终端</Menu.ItemText>
            </Menu.Item>
            <Menu.Separator />
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel>主题</Menu.ItemGroupLabel>
              <Menu.RadioItemGroup value={theme} onValueChange={(e) => setTheme(e.value)}>
                {THEMES.map((item) => (
                  <Menu.RadioItem key={item.value} value={item.value}>
                    {item.icon}
                    <Menu.ItemText>{item.label}</Menu.ItemText>
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
