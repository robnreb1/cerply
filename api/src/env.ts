import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  OPENAI_API_KEY: z.string().optional(),
  // LLM planner routing and toggles (optional; defaults in code)
  LLM_PLANNER: z.string().optional(),
  LLM_PREVIEW: z.string().optional(),
  LLM_PLANNER_PROVIDER: z.string().optional(),
  LLM_PLANNER_MODEL: z.string().optional(),
  LLM_PLANNER_FALLBACK_MODEL: z.string().optional(),
  CHAT_MODEL: z.string().optional(),
  CHAT_FALLBACK_MODEL: z.string().optional(),
  ITEMS_MODEL: z.string().optional(),
  ITEMS_MODEL_FALLBACK: z.string().optional(),
  ITEMS_MODEL_FALLBACK_2: z.string().optional(),
  // Accept postgres:// (and postgresql://) as well as http(s) if ever used
  DATABASE_URL: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        /^(postgres(ql)?:\/\/)/i.test(v) ||
        /^https?:\/\//i.test(v),
      {
        message: 'Invalid url',
      }
    ),
  ALLOW_DEV_ADMIN: z.enum(['true','false']).optional(),
  RATE_LIMIT_ENABLED: z.enum(['true','false']).optional(),
  CORS_ORIGINS: z.string().optional(),
  // Admin Certified Preview (EPIC #54)
  ADMIN_PREVIEW: z.enum(['true','false']).optional(),
  ADMIN_TOKEN: z.string().optional(),
  ADMIN_MAX_REQUEST_BYTES: z.string().optional(),
  ADMIN_RATE_LIMIT: z.string().optional(),
  // Admin Certified Store (EPIC #55)
  ADMIN_STORE: z.enum(['ndjson','sqlite']).optional().default('ndjson'),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(env: NodeJS.ProcessEnv, opts?: { allowThrowInTest?: boolean }): Env {
  const res = EnvSchema.safeParse(env);
  if (!res.success) {
    const msg = res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    if (env.NODE_ENV === 'test' && opts?.allowThrowInTest !== false) {
      throw new Error(`ENV_INVALID: ${msg}`);
    }
    // Fail fast in non-test
    // eslint-disable-next-line no-console
    console.error('ENV_INVALID', msg);
    process.exit(1);
  }
  return res.data;
}


