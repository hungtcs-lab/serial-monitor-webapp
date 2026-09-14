import { IconButton, Popover, Portal, SimpleGrid, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuSettings2 } from 'react-icons/lu'
import { useSession, useSessionState } from '../hooks/session-context'
import { DATA_BITS, FLOW_CONTROLS, PARITIES, STOP_BITS } from '../lib/constants'
import { SelectField } from './select-field'

/** 帧格式等不常改动的串口参数，收纳在齿轮按钮的浮层里 */
export function PortSettingsPopover() {
  const { t } = useTranslation()
  const session = useSession()
  const params = useSessionState((s) => s.params)
  const locked = useSessionState((s) => s.status !== 'idle')

  return (
    <Popover.Root positioning={{ placement: 'bottom-start' }} lazyMount>
      <Popover.Trigger asChild>
        <IconButton aria-label={t('connection.params')} title={t('connection.params')} size="sm" variant="ghost">
          <LuSettings2 />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="xs">
            <Popover.Arrow />
            <Popover.Header>
              <Popover.Title fontWeight="semibold">{t('connection.params')}</Popover.Title>
              {locked && (
                <Text textStyle="xs" color="fg.muted">
                  {t('connection.paramsLocked')}
                </Text>
              )}
            </Popover.Header>
            <Popover.Body pt="2">
              <SimpleGrid columns={2} gap="3">
                <SelectField
                  label={t('connection.dataBits')}
                  options={DATA_BITS.map((v) => ({ label: v, value: v }))}
                  value={String(params.dataBits)}
                  onValueChange={(v) => session.updateParams({ dataBits: Number(v) as 7 | 8 })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label={t('connection.stopBits')}
                  options={STOP_BITS.map((v) => ({ label: v, value: v }))}
                  value={String(params.stopBits)}
                  onValueChange={(v) => session.updateParams({ stopBits: Number(v) as 1 | 2 })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label={t('connection.parity')}
                  options={PARITIES.map((v) => ({ label: t(`connection.parityValue.${v}`), value: v }))}
                  value={params.parity}
                  onValueChange={(parity) => session.updateParams({ parity })}
                  disabled={locked}
                  portalled={false}
                />
                <SelectField
                  label={t('connection.flowControl')}
                  options={FLOW_CONTROLS.map((v) => ({ label: t(`connection.flowControlValue.${v}`), value: v }))}
                  value={params.flowControl}
                  onValueChange={(flowControl) => session.updateParams({ flowControl })}
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
