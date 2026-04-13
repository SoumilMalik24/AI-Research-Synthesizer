import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      // FIX: Use an environment variable for the server port to avoid conflicts with other services or environments.
      port: parseInt(env.VITE_SERVER_PORT) || 5173,
      proxy: {
        '/api': {
          // FIX: Ensure that VITE_API_BASE_URL does not contain sensitive information or is properly secured.
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})