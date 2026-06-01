import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.API_PROXY_TARGET?.trim()

  return {
    plugins: [react(), tailwindcss()],
    base: '/foose-frontend/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: apiProxyTarget
        ? {
            '/api': {
              changeOrigin: true,
              target: apiProxyTarget,
            },
          }
        : undefined,
    },
  }
})
