/**
 * Delivery Service
 * Epic 5: Slack Channel Integration
 * Channel-agnostic lesson delivery with quiet hours and preferences
 */

import { db } from '../db';
import { userChannels, channels, users, attempts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  sendSlackMessage,
  sendSlackFeedback,
  getSlackUserInfo,
} from '../adapters/slack';

export interface DeliveryResult {
  messageId: string;
  deliveredAt: Date;
  channel: string;
}

export interface UserChannel {
  type: string;
  channelId: string;
  preferences: {
    quietHours?: string; // "22:00-07:00"
    timezone?: string;
    paused?: boolean;
  };
  verified: boolean;
}

/**
 * Deliver a lesson to user via their preferred channel
 * @param userId - Cerply user ID
 * @param lessonId - Lesson ID
 * @param questionId - Optional question ID (if null, fetches next due)
 * @returns DeliveryResult
 */
export async function deliverLesson(
  userId: string,
  lessonId: string,
  questionId?: string
): Promise<DeliveryResult> {
  // Get user's preferred channel
  const userChannel = await getUserPreferredChannel(userId);

  if (!userChannel) {
    throw new Error('USER_CHANNEL_NOT_CONFIGURED');
  }

  // Check if paused
  if (userChannel.preferences.paused) {
    throw new Error('CHANNEL_PAUSED');
  }

  // Check quiet hours
  if (isWithinQuietHours(userChannel.preferences.quietHours, userChannel.preferences.timezone)) {
    throw new Error('WITHIN_QUIET_HOURS');
  }

  // Get organization channel config
  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.organizationId) {
    throw new Error('ORGANIZATION_NOT_CONFIGURED');
  }

  const [orgChannel] = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.organizationId, user.organizationId),
        eq(channels.type, userChannel.type)
      )
    )
    .limit(1);

  if (!orgChannel) {
    throw new Error('ORGANIZATION_CHANNEL_NOT_CONFIGURED');
  }

  // Fetch question (mock for now)
  const question = {
    text: 'What is the first step in a fire emergency?',
    options: ['A. Raise the alarm', 'B. Fight the fire', 'C. Collect belongings', 'D. Ignore it'],
    questionId: questionId || 'q-mock-123',
    explanation: 'Raising the alarm alerts others and ensures coordinated response.',
  };

  // Deliver via appropriate channel
  if (userChannel.type === 'slack') {
    const config = orgChannel.config as any;
    const result = await sendSlackMessage(
      userChannel.channelId,
      config.slack_bot_token,
      question
    );
    return { ...result, channel: 'slack' };
  }

  throw new Error('CHANNEL_NOT_SUPPORTED');
}

/**
 * Get user's preferred channel
 * @param userId - Cerply user ID
 * @returns UserChannel or null
 */
export async function getUserPreferredChannel(userId: string): Promise<UserChannel | null> {
  const [userChannel] = await db
    .select()
    .from(userChannels)
    .where(and(eq(userChannels.userId, userId), eq(userChannels.verified, true)))
    .orderBy(userChannels.createdAt) // First verified channel
    .limit(1);

  if (!userChannel) {
    return null;
  }

  return {
    type: userChannel.channelType,
    channelId: userChannel.channelId,
    preferences: (userChannel.preferences as any) || {},
    verified: userChannel.verified,
  };
}

/**
 * Check if current time is within quiet hours
 * @param quietHours - Format: "22:00-07:00"
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @returns true if within quiet hours
 */
export function isWithinQuietHours(
  quietHours?: string,
  timezone: string = 'UTC'
): boolean {
  if (!quietHours) return false;

  const [start, end] = quietHours.split('-');
  const now = new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  // Simple comparison (doesn't handle cross-midnight properly, TODO)
  return now >= start || now < end;
}

/**
 * Record attempt from Slack button click
 * @param userId - Cerply user ID
 * @param questionId - Question ID
 * @param answerValue - Answer value (e.g., "option_a")
 * @param correct - Whether answer was correct
 * @returns Attempt ID
 */
export async function recordSlackAttempt(
  userId: string,
  questionId: string,
  answerValue: string,
  correct: boolean
): Promise<string> {
  const [attempt] = await db
    .insert(attempts)
    .values({
      userId,
      itemId: questionId, // Simplified for MVP
      correct: correct ? 1 : 0,
      timeMs: 0, // Unknown for async Slack responses
      channel: 'slack',
      createdAt: new Date(),
    })
    .returning({ id: attempts.id });

  return attempt.id;
}

