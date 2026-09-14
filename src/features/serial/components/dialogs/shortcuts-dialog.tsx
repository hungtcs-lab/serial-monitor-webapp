import { CloseButton, Dialog, HStack, Kbd, Portal, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { SHORTCUTS } from '../../hooks/use-shortcuts'
import { useUi } from '../../store/ui-store'

export function ShortcutsDialog() {
  const { t } = useTranslation()
  const open = useUi((s) => s.dialog === 'shortcuts')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && closeDialog()} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('shortcuts.title')}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
                {SHORTCUTS.map((group) => (
                  <Stack key={group.groupKey} gap="2">
                    <Text textStyle="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase">
                      {t(group.groupKey)}
                    </Text>
                    <Table.Root size="sm" variant="line">
                      <Table.Body>
                        {group.items.map((item) => (
                          <Table.Row key={item.descriptionKey}>
                            <Table.Cell ps="0">{t(item.descriptionKey)}</Table.Cell>
                            <Table.Cell pe="0" textAlign="end">
                              <HStack gap="1" justify="flex-end">
                                {item.keys.map((key) => (
                                  <Kbd key={key} size="sm">
                                    {key}
                                  </Kbd>
                                ))}
                              </HStack>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Stack>
                ))}
              </SimpleGrid>
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
