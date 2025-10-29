/**
 * Slack Adapter
 * Epic 5: Slack Channel Integration
 * Handles OAuth, Block Kit formatting, signature verification, and Slack Web API calls
 */

import crypto from 'crypto';

// Slack Web API base URL
const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Send a learning item to Slack DM (V2.0)
 * @param slackUserId - Slack user ID (e.g., "U123456")
 * @param botToken - Slack bot token (from channels.config)
 * @param item - Learning item { question, options, itemId, itemType, explanation }
 * @returns { messageId, deliveredAt }
 */
export async function sendSlackMessage(
  slackUserId: string,
  botToken: string,
  item: {
    question: string
    options?: string[]
    itemId: string
    itemType: 'multiple_choice' | 'free_text' | 'true_false'
    explanation?: string
  }
): Promise<{ messageId: string; deliveredAt: Date }> {
  // Format item as Block Kit
  const blocks = formatItemAsBlockKit(item)

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
      text: item.question, // Fallback for notifications
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
 * Format learning item as Slack Block Kit JSON (V2.0)
 * @param item - Learning item with question, options, itemId, itemType
 * @returns Block Kit JSON array
 */
export function formatItemAsBlockKit(item: {
  question: string
  options?: string[]
  itemId: string
  itemType: 'multiple_choice' | 'free_text' | 'true_false'
}): any[] {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📚 Learning Question',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: item.question,
      },
    },
  ]

  // Add answer buttons based on item type
  const answerElements: any[] = []

  if (item.itemType === 'multiple_choice' && item.options) {
    answerElements.push(
      ...item.options.map((option, idx) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: option.substring(0, 75), // Slack limit: 75 chars
        },
        action_id: `answer_${idx}`,
        value: `${item.itemId}:${String.fromCharCode(97 + idx)}`, // itemId:a, itemId:b, etc.
        style: 'primary',
      }))
    )
  } else if (item.itemType === 'true_false') {
    answerElements.push(
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '✓ True',
        },
        action_id: 'answer_true',
        value: `${item.itemId}:true`,
        style: 'primary',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '✗ False',
        },
        action_id: 'answer_false',
        value: `${item.itemId}:false`,
        style: 'danger',
      }
    )
  } else if (item.itemType === 'free_text') {
    // For free text, add input block
    blocks.push({
      type: 'input',
      block_id: `input_${item.itemId}`,
      element: {
        type: 'plain_text_input',
        action_id: 'free_text_answer',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Type your answer here...',
        },
      },
      label: {
        type: 'plain_text',
        text: 'Your Answer',
      },
    })
    answerElements.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Submit Answer',
      },
      action_id: 'submit_free_text',
      value: item.itemId,
      style: 'primary',
    })
  }

  // Add answer buttons block
  if (answerElements.length > 0) {
    blocks.push({
      type: 'actions',
      block_id: `answers_${item.itemId}`,
      elements: answerElements,
    })
  }

  // Add Help and Challenge buttons
  blocks.push({
    type: 'actions',
    block_id: `actions_${item.itemId}`,
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '💡 Help',
          emoji: true,
        },
        action_id: 'help',
        value: item.itemId,
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '🔥 Challenge Me',
          emoji: true,
        },
        action_id: 'challenge',
        value: item.itemId,
      },
    ],
  })

  return blocks
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
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${emoji} ${prefix}*\n${explanation}`,
          },
        },
      ],
      replace_original: false, // Don't replace question, append feedback
    }),
  });
}

/**
 * Send nudge/reminder to Slack
 * @param slackUserId - Slack user ID
 * @param botToken - Slack bot token
 * @param message - Nudge message
 */
export async function sendSlackNudge(
  slackUserId: string,
  botToken: string,
  message: string
): Promise<void> {
  await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: slackUserId,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 Reminder',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Continue Learning',
              },
              url: process.env.WEB_URL || 'https://app.cerply.com',
              action_id: 'continue_learning',
            },
          ],
        },
      ],
      text: message, // Fallback
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

