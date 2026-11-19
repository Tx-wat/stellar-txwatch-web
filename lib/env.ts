import { z } from 'zod'

// Single source of truth for environment variables. Every `process.env.*`
// read in the app goes through here. next.config.mjs imports this module so
// `next build` fails fast with a readable message on invalid values.

/**
 * Optional http(s) base URL. Empty/unset becomes '' and trailing slashes are
 * stripped so callers can safely append paths that start with '/'.
 */
const optionalBaseUrl = (name: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine((value) => value === '' || /^https?:\/\//i.test(value), {
      message: `${name} must start with http:// or https:// (e.g. https://api.example.com)`,
    })
    .refine((value) => value === '' || z.string().url().safeParse(value).success, {
      message: `${name} must be a valid URL (e.g. https://api.example.com)`,
    })
    .transform((value) => value.replace(/\/+$/, ''))

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_API_URL: optionalBaseUrl('NEXT_PUBLIC_API_URL'),
  NEXT_PUBLIC_HORIZON_URL: optionalBaseUrl('NEXT_PUBLIC_HORIZON_URL'),
  NEXT_PUBLIC_SOROBAN_RPC_URL: optionalBaseUrl('NEXT_PUBLIC_SOROBAN_RPC_URL'),
  DEBUG_STORAGE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  ANALYZE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
})

export type Env = z.infer<typeof envSchema>

function readEnv(): Env {
  // Each variable must be referenced as a literal `process.env.NAME` so
  // Next.js inlines it into the client bundle; reading through an alias or
  // spreading process.env would yield undefined in the browser.
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    DEBUG_STORAGE: process.env.DEBUG_STORAGE,
    ANALYZE: process.env.ANALYZE,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment variables:\n${issues}\n\nFix them in .env.local (see .env.example).`,
    )
  }

  return result.data
}

export const env = readEnv()
