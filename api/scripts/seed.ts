import { db } from '../src/db';
import { users, sessions } from '../src/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const uid = 'dev-user';
  const email = 'dev@local';
  const token = 'dev-session-token';

  const exists = await db.select().from(users).where(eq(users.id, uid));
  if (exists.length === 0) {
    await db.insert(users).values({ id: uid, email }).execute();
  }
  const s = await db.select().from(sessions).where(eq(sessions.id, token));
  if (s.length === 0) {
    await db.insert(sessions).values({ id: token, userId: uid, token }).execute();
  }
  console.log('seeded');
}

main().catch((e) => {
  console.error('seed failed', e);
  process.exit(1);
});
