import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/MLII-Final/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
