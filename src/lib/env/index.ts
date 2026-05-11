import { z } from "zod"

/**
 * Zod schema for the Vite env vars the app consumes. Defaults map to the
 * dev-server proxy path declared in `vite.config.ts`.
 */
const EnvSchema = z.object({
  VITE_API_URL: z.string().default("/api"),
  VITE_APP_NAME: z.string().default("Social Feed"),
})

function parseEnv(source: unknown): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${issues}`)
  }
  return result.data
}

const parsed = parseEnv(import.meta.env)

export const env = {
  apiUrl: parsed.VITE_API_URL,
  appName: parsed.VITE_APP_NAME,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export { EnvSchema, parseEnv }
