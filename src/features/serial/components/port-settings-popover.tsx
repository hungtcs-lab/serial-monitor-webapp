import { IconButton, Popover, Portal, SimpleGrid, Text } from '@chakra-ui/react'
import { LuSettings2 } from 'react-icons/lu'
import { useSerialMonitor } from '../context/serial-monitor-context'
import { DATA_BITS_OPTIONS, FLOW_CONTROL_OPTIONS, PARITY_OPTIONS, STOP_BITS_OPTIONS } from '../lib/constants'
import { SelectField } from './select-field'

/** 帧格式等不常改动的串口参数，收纳在齿轮按钮的浮层里 */
export function PortSettingsPopover() {
  const { settings, updateSettings, status } = useSerialMonitor()
  const locked = status !== 'closed'

  return (
    <Popover.Root positioning={{ placement: 'bottom-start' }} lazyMount>
      <Popover.Trigger asChild>
        <IconButton aria-label="串口参数" title="串口参数" size="sm" variant="ghost">
          <LuSettings2 />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="xs">
            <Popover.Arrow />
            <Popover.Header>
              <Popover.Title fontWeight="semibold">串口参数</Popover.Title>
              {locked && (
                <Text textStyle="xs" color="fg.muted">
                  关闭串口后才能修改
                </Text>
              )}
            </Popover.Header>
            <Popover.Body pt="2">
              <SimpleGrid columns={2} gap="3">
                <SelectField
                  label="数据位"
                  options={DATA_BITS_OPTIONS}
                  value={String(settings.dataBits)}
                  onValueChange={(v) => updateSettings({ dataBits: Number(v) as 7 | 8 })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label="停止位"
                  options={STOP_BITS_OPTIONS}
                  value={String(settings.stopBits)}
                  onValueChange={(v) => updateSettings({ stopBits: Number(v) as 1 | 2 })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label="校验位"
                  options={PARITY_OPTIONS}
                  value={settings.parity}
                  onValueChange={(parity) => updateSettings({ parity })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label="流控"
                  options={FLOW_CONTROL_OPTIONS}
                  value={settings.flowControl}
                  onValueChange={(flowControl) => updateSettings({ flowControl })}
                  disabled={locked}
                  portalled={false}
                />
              </SimpleGrid>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
