import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  globalCss: {
    '*': {
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--chakra-colors-border-emphasized) transparent',
    },
  },
})

export const system = createSystem(defaultConfig, config)
