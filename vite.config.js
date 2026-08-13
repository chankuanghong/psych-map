import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { psychMapGeminiPlugin } from './server/geminiApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), psychMapGeminiPlugin(env)] }
})
