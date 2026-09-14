import { Combobox, Field, Portal, useFilter, useListCollection } from '@chakra-ui/react'
import { useState } from 'react'
import { BAUD_RATES } from '../lib/constants'

const BAUD_RATE_ITEMS = BAUD_RATES.map((rate) => ({ label: String(rate), value: String(rate) }))

interface BaudRateComboboxProps {
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
  hideLabel?: boolean
  width?: string
}

function parseBaudRate(raw: string): number | null {
  const n = Number(raw.trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

/** 波特率：可从常用值中选择，也可直接输入自定义值（回车或失焦生效） */
export function BaudRateCombobox({ value, onValueChange, disabled, hideLabel, width = 'full' }: BaudRateComboboxProps) {
  const [inputValue, setInputValue] = useState(String(value))
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const { startsWith } = useFilter({ sensitivity: 'base' })
  const { collection, filter } = useListCollection({ initialItems: BAUD_RATE_ITEMS, filter: startsWith })
  const invalid = parseBaudRate(inputValue) === null

  function commit(raw: string) {
    const rate = parseBaudRate(raw)
    if (rate === null) {
      setInputValue(String(value))
      return
    }
    setInputValue(String(rate))
    if (rate !== value) onValueChange(rate)
  }

  return (
    <Field.Root width={width} disabled={disabled} invalid={invalid}>
      <Combobox.Root
        size="sm"
        collection={collection}
        allowCustomValue
        openOnClick
        inputValue={inputValue}
        onInputValueChange={(e) => {
          setInputValue(e.inputValue)
          if (e.reason === 'input-change') filter(e.inputValue)
        }}
        onValueChange={(e) => {
          const [next] = e.value
          if (next !== undefined) commit(next)
        }}
        onHighlightChange={(e) => setHighlighted(e.highlightedValue)}
        onOpenChange={(e) => {
          if (e.open && e.reason !== 'input-change') filter('')
        }}
      >
        <Combobox.Label srOnly={hideLabel}>波特率</Combobox.Label>
        <Combobox.Control>
          <Combobox.Input
            inputMode="numeric"
            placeholder="波特率"
            onBlur={() => commit(inputValue)}
            onKeyDown={(e) => {
              // 有高亮项时交给组件选中该项，否则提交输入的自定义值
              if (e.key === 'Enter' && highlighted === null) commit(e.currentTarget.value)
            }}
          />
          <Combobox.IndicatorGroup>
            <Combobox.Trigger />
          </Combobox.IndicatorGroup>
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner>
            <Combobox.Content>
              <Combobox.Empty>回车使用自定义波特率</Combobox.Empty>
              {collection.items.map((item) => (
                <Combobox.Item item={item} key={item.value}>
                  {item.label}
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.Root>
    </Field.Root>
  )
}
