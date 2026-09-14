import { Box, Button, Flex, HStack, Stack, Status, Text } from '@chakra-ui/react'
import { LuPlug, LuUnplug } from 'react-icons/lu'
import { useSerialMonitor } from '../context/serial-monitor-context'
import { isSerialSupported } from '../hooks/use-serial-port'
import { describePort, formatFrame } from '../lib/codec'
import type { SerialStatus } from '../lib/types'
import { AppMenu } from './app-menu'
import { BaudRateCombobox } from './baud-rate-combobox'
import { PortSettingsPopover } from './port-settings-popover'
import { SelectField } from './select-field'

const STATUS_META: Record<SerialStatus, { label: string; color: string }> = {
  closed: { label: '未连接', color: 'gray' },
  opening: { label: '连接中…', color: 'orange' },
  open: { label: '已连接', color: 'green' },
  closing: { label: '断开中…', color: 'orange' },
}

function PortControls() {
  const { ports, port, selectPort, settings, updateSettings, status } = useSerialMonitor()
  const locked = status !== 'closed'
  const options = ports.map((p, i) => ({ label: describePort(p), value: String(i) }))

  return (
    <HStack gap="1.5" flex="1" minW="0">
      <Box flex="1" minW="24" maxW="44">
        <SelectField
          label="端口"
          hideLabel
          options={options}
          value={port ? String(ports.indexOf(port)) : null}
          onValueChange={(v) => selectPort(ports[Number(v)] ?? null)}
          placeholder={ports.length ? '选择端口' : '无可用端口'}
          disabled={locked || ports.length === 0}
        />
      </Box>
      <Box flexShrink="0" width={{ base: '24', md: '32' }}>
        <BaudRateCombobox
          hideLabel
          value={settings.baudRate}
          onValueChange={(baudRate) => updateSettings({ baudRate })}
          disabled={locked}
        />
      </Box>
      <PortSettingsPopover />
    </HStack>
  )
}

function ConnectionStatus() {
  const { status, settings } = useSerialMonitor()
  const meta = STATUS_META[status]

  return (
    <Stack gap="0" align="center" hideBelow="md">
      <Text textStyle="sm" fontWeight="semibold" lineHeight="short">
        Serial Monitor
      </Text>
      <Status.Root size="sm" colorPalette={meta.color} color="fg.muted" textStyle="xs">
        <Status.Indicator />
        {meta.label}
        {status === 'open' && <Text as="span" fontFamily="mono">· {formatFrame(settings)}</Text>}
      </Status.Root>
    </Stack>
  )
}

function ConnectButton() {
  const { status, connect, disconnect } = useSerialMonitor()

  if (status === 'open' || status === 'closing') {
    return (
      <Button
        aria-label="断开"
        size="sm"
        minW={{ sm: '24' }}
        colorPalette="red" variant="subtle" loading={status === 'closing'} onClick={disconnect}>
        <LuUnplug />
        <Box as="span" hideBelow="sm">
          断开
        </Box>
      </Button>
    )
  }
  return (
    <Button
      aria-label="连接"
      size="sm"
      minW={{ sm: '24' }}
      colorPalette="blue" disabled={!isSerialSupported} loading={status === 'opening'} onClick={connect}>
      <LuPlug />
      <Box as="span" hideBelow="sm">
        连接
      </Box>
    </Button>
  )
}

/** 顶部标题栏：左侧端口参数，中间标题与状态，右侧连接与菜单 */
export function ConnectionBar() {
  return (
    <Flex as="header" align="center" gap="2" px="3" py="2" bg="bg.panel" borderBottomWidth="1px">
      <PortControls />
      <ConnectionStatus />
      <HStack gap="1" flex={{ md: '1' }} justify="flex-end">
        <ConnectButton />
        <AppMenu />
      </HStack>
    </Flex>
  )
}
