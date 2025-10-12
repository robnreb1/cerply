/**
 * Slack Adapter
 * Epic 5: Slack Channel Integration
 * Handles OAuth, Block Kit formatting, signature verification, and Slack Web API calls
 */

import crypto from 'crypto';

// Slack Web API base URL
const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Send a lesson question to Slack DM
 * @param slackUserId - Slack user ID (e.g., "U123456")
 * @param botToken - Slack bot token (from channels.config)
 * @param question - Question object { text, options, questionId }
 * @returns { messageId, deliveredAt }
 */
export async function sendSlackMessage(
  slackUserId: string,
  botToken: string,
  question: { text: string; options: string[]; questionId: string; explanation?: string }
): Promise<{ messageId: string; deliveredAt: Date }> {
  // Format question as Block Kit
  const blocks = formatQuestionAsBlockKit(question.text, question.options, question.questionId);

  // Send to Slack
  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: slackUserId, // DM to user
      blocks,
      text: question.text, // Fallback for notifications
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    messageId: data.ts, // Slack message timestamp
    deliveredAt: new Date(),
  };
}

/**
 * Format question as Slack Block Kit JSON
 * @param question - Question text
 * @param options - Array of answer options (e.g., ["A. Raise alarm", "B. Ignore"])
 * @param questionId - Question ID for tracking
 * @returns Block Kit JSON array
 */
export function formatQuestionAsBlockKit(
  question: string,
  options: string[],
  questionId: string
): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Question:*\n${question}`,
      },
    },
    {
      type: 'actions',
      block_id: questionId,
      elements: options.map((option, idx) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: option.substring(0, 75), // Slack limit: 75 chars
        },
        action_id: `answer_${idx}`, // Unique action ID per button
        value: `option_${String.fromCharCode(97 + idx)}`, // option_a, option_b, etc.
      })),
    },
  ];
}

/**
 * Verify Slack webhook signature
 * Prevents replay attacks and unauthorized requests
 * @param body - Raw request body (string)
 * @param timestamp - x-slack-request-timestamp header
 * @param signature - x-slack-signature header
 * @param signingSecret - Slack signing secret from channels.config
 * @returns true if valid, false otherwise
 */
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  // Reject old requests (> 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 60 * 5) {
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  // Check length before constant-time comparison (prevents crash)
  if (expectedSignature.length !== signature.length) {
    return false;
  }

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

/**
 * Parse Slack button click payload
 * @param payload - Slack interactivity payload
 * @returns { slackUserId, questionId, answerValue, responseUrl }
 */
export function parseSlackButtonClick(payload: any): {
  slackUserId: string;
  questionId: string;
  answerValue: string;
  responseUrl: string;
} {
  return {
    slackUserId: payload.user.id,
    questionId: payload.actions[0].block_id,
    answerValue: payload.actions[0].value, // e.g., "option_a"
    responseUrl: payload.response_url,
  };
}

/**
 * Send feedback to Slack (via response_url)
 * @param responseUrl - Slack response_url from button click
 * @param correct - Whether answer was correct
 * @param explanation - Explanation text
 */
export async function sendSlackFeedback(
  responseUrl: string,
  correct: boolean,
  explanation: string
): Promise<void> {
  const emoji = correct ? '✅' : '❌';
  const prefix = correct ? 'Correct!' : 'Incorrect.';

  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji} ${prefix} ${explanation}`,
      replace_original: false, // Don't replace question, append feedback
    }),
  });
}

/**
 * Get Slack user info
 * @param slackUserId - Slack user ID
 * @param botToken - Slack bot token
 * @returns { id, email, real_name }
 */
export async function getSlackUserInfo(
  slackUserId: string,
  botToken: string
): Promise<{ id: string; email: string; realName: string }> {
  const response = await fetch(`${SLACK_API_BASE}/users.info?user=${slackUserId}`, {
    headers: { 'Authorization': `Bearer ${botToken}` },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    id: data.user.id,
    email: data.user.profile.email,
    realName: data.user.real_name,
  };
}

