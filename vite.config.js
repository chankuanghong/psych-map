import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { psychMapInsightPlugin } from './server/insightApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), psychMapInsightPlugin(env)] }
})
