import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite es el "motor" que arranca la web en desarrollo y la empaqueta para publicarla.
// - react(): permite escribir componentes en JSX/TSX.
// - tailwindcss(): activa Tailwind CSS.
// - alias "@": permite escribir "@/lib/env" en lugar de "../../lib/env".
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
