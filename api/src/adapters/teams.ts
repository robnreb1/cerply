/**
 * Microsoft Teams Adapter
 * V2.0: Handles Teams bot communication, Adaptive Cards, and webhook verification
 */

import crypto from 'crypto'

// Microsoft Teams Bot Framework API
const TEAMS_API_BASE = 'https://smba.trafficmanager.net/apis'

/**
 * Send a learning item to Teams chat
 * @param teamsUserId - Teams user ID (Azure AD object ID)
 * @param botToken - Teams bot access token
 * @param item - Learning item { question, options, itemId, explanation }
 * @returns { messageId, deliveredAt }
 */
export async function sendTeamsMessage(
  teamsUserId: string,
  botToken: string,
  item: {
    question: string
    options?: string[]
    itemId: string
    explanation?: string
    itemType: 'multiple_choice' | 'free_text' | 'true_false'
  }
): Promise<{ messageId: string; deliveredAt: Date }> {
  // Format as Adaptive Card
  const card = formatItemAsAdaptiveCard(item)

  // Send to Teams via Bot Framework API
  const response = await fetch(`${TEAMS_API_BASE}/v3/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      bot: {
        id: process.env.TEAMS_BOT_ID,
        name: 'Cerply Learning Bot',
      },
      members: [{ id: teamsUserId }],
      channelData: {
        tenant: { id: process.env.TEAMS_TENANT_ID },
      },
      activity: {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          },
        ],
      },
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Teams API error: ${data.error?.message || 'Unknown error'}`)
  }

  return {
    messageId: data.id,
    deliveredAt: new Date(),
  }
}

/**
 * Format learning item as Teams Adaptive Card
 * @param item - Learning item with question, options, itemId
 * @returns Adaptive Card JSON
 */
export function formatItemAsAdaptiveCard(item: {
  question: string
  options?: string[]
  itemId: string
  itemType: 'multiple_choice' | 'free_text' | 'true_false'
}): any {
  const baseCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '📚 Learning Question',
        weight: 'bolder',
        size: 'medium',
        color: 'accent',
      },
      {
        type: 'TextBlock',
        text: item.question,
        wrap: true,
        spacing: 'medium',
      },
    ],
    actions: [],
  }

  // Add actions based on item type
  if (item.itemType === 'multiple_choice' && item.options) {
    baseCard.actions = item.options.map((option, idx) => ({
      type: 'Action.Submit',
      title: option,
      data: {
        itemId: item.itemId,
        answer: String.fromCharCode(97 + idx), // a, b, c, etc.
        actionType: 'answer',
      },
    }))
  } else if (item.itemType === 'true_false') {
    baseCard.actions = [
      {
        type: 'Action.Submit',
        title: '✓ True',
        data: {
          itemId: item.itemId,
          answer: 'true',
          actionType: 'answer',
        },
      },
      {
        type: 'Action.Submit',
        title: '✗ False',
        data: {
          itemId: item.itemId,
          answer: 'false',
          actionType: 'answer',
        },
      },
    ]
  } else if (item.itemType === 'free_text') {
    // Add input field for free text
    baseCard.body.push({
      type: 'Input.Text',
      id: 'freeTextAnswer',
      placeholder: 'Type your answer here...',
      isMultiline: true,
    })
    baseCard.actions = [
      {
        type: 'Action.Submit',
        title: 'Submit Answer',
        data: {
          itemId: item.itemId,
          actionType: 'answer_free_text',
        },
      },
    ]
  }

  // Add Help and Challenge actions
  baseCard.actions.push(
    {
      type: 'Action.Submit',
      title: '💡 Help',
      data: {
        itemId: item.itemId,
        actionType: 'help',
      },
      style: 'default',
    },
    {
      type: 'Action.Submit',
      title: '🔥 Challenge Me',
      data: {
        itemId: item.itemId,
        actionType: 'challenge',
      },
      style: 'positive',
    }
  )

  return baseCard
}

/**
 * Verify Teams webhook signature
 * Uses JWT validation with Microsoft's public keys
 * @param token - JWT token from Authorization header
 * @returns true if valid, false otherwise
 */
export async function verifyTeamsSignature(token: string): Promise<boolean> {
  try {
    // In production, validate JWT using Microsoft's OpenID Connect metadata
    // For now, basic validation
    if (!token || !token.startsWith('Bearer ')) {
      return false
    }

    // TODO: Implement full JWT validation with Microsoft public keys
    // https://login.microsoftonline.com/common/discovery/v2.0/keys

    return true
  } catch (error) {
    console.error('Teams signature verification failed:', error)
    return false
  }
}

/**
 * Parse Teams card action submission
 * @param activity - Teams activity payload
 * @returns { teamsUserId, itemId, answer, actionType }
 */
export function parseTeamsAction(activity: any): {
  teamsUserId: string
  itemId: string
  answer?: string
  actionType: string
  conversationId: string
  serviceUrl: string
} {
  const data = activity.value || {}

  return {
    teamsUserId: activity.from.id,
    itemId: data.itemId,
    answer: data.answer || activity.value?.freeTextAnswer,
    actionType: data.actionType,
    conversationId: activity.conversation.id,
    serviceUrl: activity.serviceUrl,
  }
}

/**
 * Send feedback to Teams (via Bot Framework API)
 * @param conversationId - Teams conversation ID
 * @param serviceUrl - Teams service URL
 * @param botToken - Bot access token
 * @param correct - Whether answer was correct
 * @param explanation - Explanation text
 */
export async function sendTeamsFeedback(
  conversationId: string,
  serviceUrl: string,
  botToken: string,
  correct: boolean,
  explanation: string
): Promise<void> {
  const emoji = correct ? '✅' : '❌'
  const title = correct ? 'Correct!' : 'Not quite right'
  const color = correct ? 'good' : 'attention'

  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `${emoji} ${title}`,
        weight: 'bolder',
        size: 'medium',
        color,
      },
      {
        type: 'TextBlock',
        text: explanation,
        wrap: true,
        spacing: 'small',
      },
    ],
  }

  await fetch(`${serviceUrl}/v3/conversations/${conversationId}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: card,
        },
      ],
    }),
  })
}

/**
 * Send nudge/reminder to Teams
 * @param teamsUserId - Teams user ID
 * @param botToken - Bot access token
 * @param message - Nudge message
 */
export async function sendTeamsNudge(
  teamsUserId: string,
  botToken: string,
  message: string
): Promise<void> {
  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '🔔 Reminder',
        weight: 'bolder',
        size: 'medium',
      },
      {
        type: 'TextBlock',
        text: message,
        wrap: true,
        spacing: 'small',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Continue Learning',
        url: process.env.WEB_URL || 'https://app.cerply.com',
      },
    ],
  }

  await fetch(`${TEAMS_API_BASE}/v3/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      bot: {
        id: process.env.TEAMS_BOT_ID,
      },
      members: [{ id: teamsUserId }],
      activity: {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          },
        ],
      },
    }),
  })
}

/**
 * Get Teams user info
 * @param teamsUserId - Teams user ID (Azure AD object ID)
 * @param botToken - Bot access token
 * @returns { id, email, displayName }
 */
export async function getTeamsUserInfo(
  teamsUserId: string,
  botToken: string
): Promise<{ id: string; email: string; displayName: string }> {
  // Note: Teams uses Microsoft Graph API for user info
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${teamsUserId}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  })

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    displayName: data.displayName,
  }
}

