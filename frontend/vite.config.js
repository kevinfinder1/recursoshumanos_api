import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Esto es necesario para que funcione dentro de Docker
    host: true,
    port: 5173
  }
})