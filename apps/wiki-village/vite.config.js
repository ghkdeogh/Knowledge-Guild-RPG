import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { repositoryStatusMiddleware } from './server/repository-status.mjs'

export default defineConfig({
  plugins: [react(), {
    name: 'repository-status-api',
    configureServer(server) { server.middlewares.use(repositoryStatusMiddleware()) },
  }],
})
