import { Button, CloseButton, Code, Dialog, Field, HStack, IconButton, Input, Portal, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { LuGlobe, LuTrash2 } from 'react-icons/lu'
import { usePreferences } from '../../store/preferences-store'
import { useUi } from '../../store/ui-store'
import { useWorkspace } from '../../store/workspace-store'

function isWebSocketUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'ws:' || url.protocol === 'wss:'
  } catch {
    return false
  }
}

export function WebSocketDialog() {
  const { t } = useTranslation()
  const open = useUi((s) => s.dialog === 'websocket')
  const closeDialog = useUi((s) => s.closeDialog)
  const endpoints = usePreferences((s) => s.wsEndpoints)
  const addWebSocket = useWorkspace((s) => s.addWebSocket)
  const removeWebSocket = useWorkspace((s) => s.removeWebSocket)
  const [url, setUrl] = useState('ws://127.0.0.1:8765')
  const valid = isWebSocketUrl(url.trim())

  function submit() {
    if (!valid) return
    addWebSocket(url.trim())
    closeDialog()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && closeDialog()} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('websocket.title')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Text textStyle="sm" color="fg.muted">
                  {t('websocket.description')}
                </Text>
                <Field.Root invalid={url !== '' && !valid}>
                  <Field.Label>{t('websocket.url')}</Field.Label>
                  <Input
                    fontFamily="mono"
                    value={url}
                    onChange={(e) => setUrl(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="ws://127.0.0.1:8765"
                  />
                  <Field.ErrorText>{t('websocket.invalidUrl')}</Field.ErrorText>
                </Field.Root>

                <Stack gap="1.5" textStyle="xs" color="fg.muted">
                  <Text fontWeight="medium" color="fg">
                    {t('websocket.exampleTitle')}
                  </Text>
                  <Text>
                    <Trans i18nKey="websocket.exampleStep1" components={{ code: <Code size="sm" /> }} />
                  </Text>
                  <Code size="sm" display="block" whiteSpace="pre" overflowX="auto" p="2">
                    {'socat TCP-LISTEN:7000,reuseaddr,fork FILE:/dev/pts/3,raw,echo=0\nwebsocat -b ws-l:127.0.0.1:8765 tcp:127.0.0.1:7000'}
                  </Code>
                </Stack>

                {endpoints.length > 0 && (
                  <Stack gap="1">
                    <Text textStyle="sm" fontWeight="medium">
                      {t('websocket.saved')}
                    </Text>
                    {endpoints.map((endpoint) => (
                      <HStack key={endpoint} gap="2" px="2" py="1" rounded="md" _hover={{ bg: 'bg.muted' }}>
                        <LuGlobe />
                        <Text flex="1" fontFamily="mono" textStyle="sm" truncate>
                          {endpoint}
                        </Text>
                        <IconButton
                          aria-label={t('websocket.remove')}
                          title={t('websocket.remove')}
                          size="xs"
                          variant="ghost"
                          onClick={() => removeWebSocket(endpoint)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" size="sm">
                  {t('common.cancel')}
                </Button>
              </Dialog.ActionTrigger>
              <Button size="sm" colorPalette="blue" disabled={!valid} onClick={submit}>
                {t('websocket.add')}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
