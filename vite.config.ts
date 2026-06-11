import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Reines SPA-Setup: kein SSR/Nitro mehr — das Backend liefert Tauri (Rust).
// Port 3000 + strictPort, damit `tauri dev` den Dev-Server zuverlässig findet.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    tailwindcss(),
    viteReact(),
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
  // Tauri erwartet einen festen Entry; im Tauri-Dev-Modus nicht den Browser öffnen.
  clearScreen: false,
})

export default config
