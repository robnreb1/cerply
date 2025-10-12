/**
 * Setup Slack Channel
 * Inserts or updates Slack channel configuration in the database
 */

import { db } from '../src/db';
import { channels } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function setupSlackChannel() {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const orgId = process.env.ORG_ID || 'org_default';

  if (!signingSecret || !botToken) {
    console.error('❌ Missing required environment variables:');
    console.error('   SLACK_SIGNING_SECRET');
    console.error('   SLACK_BOT_TOKEN');
    process.exit(1);
  }

  try {
    // Check if Slack channel already exists
    const [existing] = await db
      .select()
      .from(channels)
      .where(eq(channels.type, 'slack'))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(channels)
        .set({
          config: {
            slack_signing_secret: signingSecret,
            slack_bot_token: botToken,
          },
        })
        .where(eq(channels.id, existing.id));

      console.log('✅ Updated existing Slack channel configuration');
      console.log(`   Channel ID: ${existing.id}`);
    } else {
      // Insert new
      const [newChannel] = await db
        .insert(channels)
        .values({
          id: `channel_slack_${Date.now()}`,
          orgId,
          type: 'slack',
          name: 'Slack (Default)',
          config: {
            slack_signing_secret: signingSecret,
            slack_bot_token: botToken,
          },
          createdAt: new Date(),
        })
        .returning();

      console.log('✅ Created new Slack channel configuration');
      console.log(`   Channel ID: ${newChannel.id}`);
    }

    console.log('\n📝 Next steps:');
    console.log('   1. Restart your API with FF_CHANNEL_SLACK=true');
    console.log('   2. Configure your ngrok URL in Slack Event Subscriptions');
    console.log('   3. Test the integration');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Slack channel:', error);
    process.exit(1);
  }
}

setupSlackChannel();

