import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import tanstackRouter from "@tanstack/router-plugin/vite"

export default defineConfig(({ mode }) => {
  const env: Record<string, string | undefined> = loadEnv(mode, process.cwd(), "VITE_")
  const proxyTarget = env.VITE_DEV_API_PROXY ?? "http://localhost:8787"

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        enableRouteGeneration: true,
        routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
      }),
      react(),
      cloudflare(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
  }
})
