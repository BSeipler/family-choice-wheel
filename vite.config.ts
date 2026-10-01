import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { getRequestListener } from '@hono/node-server'
import { defineConfig, loadEnv } from 'vite'
import type { Connect, Plugin } from 'vite'
import app from './server/app.ts'

function apiPlugin(): Plugin {
  const listener = getRequestListener(app.fetch)
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.startsWith('/api')) {
      void listener(req as IncomingMessage, res as ServerResponse)
      return
    }
    next()
  }

  return {
    name: 'family-choice-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL
  if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN

  return {
    plugins: [react(), apiPlugin()],
    server: {
      port: 5173,
    },
  }
})
