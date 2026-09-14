import { Field, HStack, Portal, Select, Span, createListCollection } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuCable, LuGlobe } from 'react-icons/lu'
import { useSession, useSessionState } from '../hooks/session-context'
import type { Device } from '../lib/device'
import { useWorkspace } from '../store/workspace-store'

const GROUPS: { kind: Device['kind']; labelKey: string }[] = [
  { kind: 'serial', labelKey: 'connection.groupSerial' },
  { kind: 'websocket', labelKey: 'connection.groupWebsocket' },
]

export function DeviceSelect() {
  const { t } = useTranslation()
  const session = useSession()
  const deviceId = useSessionState((s) => s.deviceId)
  const status = useSessionState((s) => s.status)
  const devices = useWorkspace((s) => s.devices)
  const sessions = useWorkspace((s) => s.sessions)
  const lostLabel = useSessionState((s) => s.lostDeviceLabel)

  const busyIds = new Set(
    sessions.flatMap((s) => {
      const st = s.store.getState()
      return s.id !== session.id && st.status !== 'idle' && st.deviceId ? [st.deviceId] : []
    }),
  )
  const collection = createListCollection({
    items: devices,
    itemToValue: (d) => d.id,
    itemToString: (d) => d.label,
    isItemDisabled: (d) => busyIds.has(d.id),
  })
  const selected = devices.find((d) => d.id === deviceId)

  return (
    <Field.Root width="auto" flex="1" minW="28" maxW="56" disabled={status !== 'idle'}>
      <Select.Root
        size="sm"
        collection={collection}
        value={selected ? [selected.id] : []}
        onValueChange={(e) => session.selectDevice(e.value[0] ?? null)}
        positioning={{ sameWidth: false, placement: 'bottom-start' }}
      >
        <Select.HiddenSelect />
        <Select.Label srOnly>{t('connection.device')}</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={lostLabel ?? (devices.length ? t('connection.selectDevice') : t('connection.noDevice'))}>
              {selected && (
                <HStack gap="1.5">
                  {selected.kind === 'serial' ? <LuCable /> : <LuGlobe />}
                  <Span truncate>{selected.label}</Span>
                </HStack>
              )}
            </Select.ValueText>
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content minW="64">
              {GROUPS.map(({ kind, labelKey }) => {
                const items = devices.filter((d) => d.kind === kind)
                if (items.length === 0) return null
                return (
                  <Select.ItemGroup key={kind}>
                    <Select.ItemGroupLabel>{t(labelKey)}</Select.ItemGroupLabel>
                    {items.map((device) => (
                      <Select.Item item={device} key={device.id}>
                        <Select.ItemText flex="1" truncate>
                          {device.label}
                        </Select.ItemText>
                        <Span textStyle="xs" color="fg.muted" fontFamily="mono" truncate maxW="40">
                          {busyIds.has(device.id) ? t('connection.inUse') : device.detail}
                        </Span>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.ItemGroup>
                )
              })}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field.Root>
  )
}
