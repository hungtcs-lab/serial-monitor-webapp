import { Field, Portal, Select, createListCollection } from '@chakra-ui/react'
import type { Option } from '../lib/types'

interface SelectFieldProps<T extends string> {
  label: string
  /** 仅对读屏器可见的标签，用于紧凑的工具栏 */
  hideLabel?: boolean
  options: Option<T>[]
  value: T | null
  onValueChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  width?: string
  /** 放在 Popover 等浮层内部时关闭 Portal，避免被识别为外部点击 */
  portalled?: boolean
}

/** 基于 Chakra Select 的单选下拉框 */
export function SelectField<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  width = 'full',
  portalled = true,
}: SelectFieldProps<T>) {
  const collection = createListCollection({ items: options })

  return (
    <Field.Root width={width} disabled={disabled}>
      <Select.Root
        size="sm"
        collection={collection}
        value={value === null ? [] : [value]}
        onValueChange={(e) => {
          const [next] = e.value
          if (next !== undefined) onValueChange(next as T)
        }}
        positioning={{ sameWidth: true }}
      >
        <Select.HiddenSelect />
        <Select.Label srOnly={hideLabel}>{label}</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={placeholder} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal disabled={!portalled}>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map((item) => (
                <Select.Item item={item} key={item.value}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field.Root>
  )
}
