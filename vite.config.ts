import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import alias from '@rollup/plugin-alias'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from '@honkhonk/vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [
    alias(),
    react(),
    tsconfigPaths(),
    svgr({ keepEmittedAssets: true })
  ],
  build: {
    target: 'esnext'
  }
})
