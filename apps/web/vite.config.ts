import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const devtoolsPort = Number(
  process.env.TANSTACK_DEVTOOLS_EVENT_BUS_PORT ?? 42179,
)
const safeDevtoolsPort = Number.isFinite(devtoolsPort)
  ? devtoolsPort
  : 42179

const config = defineConfig({
  plugins: [
    devtools({
      eventBusConfig: {
        port: safeDevtoolsPort,
      },
    }),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
