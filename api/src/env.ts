import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  OPENAI_API_KEY: z.string().optional(),
  ALLOW_DEV_ADMIN: z.enum(['true','false']).optional(),
  RATE_LIMIT_ENABLED: z.enum(['true','false']).optional(),
  CORS_ORIGINS: z.string().optional(),
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


