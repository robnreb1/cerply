# Slack Integration Troubleshooting

**Epic 5: Slack Channel Integration**  
**Last Updated:** 2025-10-10

---

## Common Issues

### "CHANNEL_NOT_CONFIGURED" error
- **Cause:** User hasn't configured Slack channel
- **Fix:** User must call `POST /api/delivery/channels` to set up
- **Steps:**
  1. Verify user has Slack user ID
  2. Call API to configure:
     ```bash
     curl -X POST http://localhost:8080/api/delivery/channels \
       -H "x-admin-token: dev-admin-token-12345" \
       -H "content-type: application/json" \
       -d '{"channelType":"slack","channelId":"U123456"}'
     ```

### "INVALID_SIGNATURE" error
- **Cause:** Slack signing secret mismatch or expired request
- **Fix:** Verify `SLACK_SIGNING_SECRET` matches Slack app config
- **Debug:**
  1. Go to https://api.slack.com/apps → Your App → Basic Information
  2. Copy **Signing Secret**
  3. Update database:
     ```sql
     UPDATE channels 
     SET config = jsonb_set(config, '{slack_signing_secret}', '"YOUR_SECRET"')
     WHERE type = 'slack';
     ```
  4. Check timestamp in webhook request (must be < 5 minutes old)

### "DELIVERY_FAILED" error
- **Cause:** Slack bot token expired or user blocked bot
- **Fix:** Reinstall Slack app to workspace, ask user to unblock bot
- **Steps:**
  1. Go to https://api.slack.com/apps → Your App → OAuth & Permissions
  2. Click **Reinstall App**
  3. Copy new **Bot User OAuth Token**
  4. Update database:
     ```sql
     UPDATE channels 
     SET config = jsonb_set(config, '{slack_bot_token}', '"xoxb-NEW-TOKEN"')
     WHERE type = 'slack';
     ```

### "WITHIN_QUIET_HOURS" error
- **Cause:** User has quiet hours set (e.g., 22:00-07:00)
- **Fix:** Wait until outside quiet hours or user updates preferences
- **Override (Admin only):**
  ```bash
  curl -X POST http://localhost:8080/api/delivery/channels \
    -H "x-admin-token: dev-admin-token-12345" \
    -H "content-type: application/json" \
    -d '{"channelType":"slack","preferences":{"quietHours":"","paused":false}}'
  ```

### "USER_NOT_FOUND" in webhook
- **Cause:** Slack user ID not linked to Cerply account
- **Fix:** User must configure channel first
- **Steps:**
  1. Get Slack user ID from webhook payload
  2. Find Cerply user email
  3. Link accounts:
     ```sql
     INSERT INTO user_channels (user_id, channel_type, channel_id, verified)
     VALUES ('cerply-user-id', 'slack', 'U123456', true);
     ```

---

## Debugging

### Check Slack API Logs
1. Go to https://api.slack.com/apps → Your App → Event Subscriptions
2. View Request Logs for webhook delivery failures
3. Check status codes:
   - `200` - Success
   - `401` - Invalid signature
   - `404` - Channel not configured
   - `503` - Delivery failed

### Verify Signature Locally
```bash
# Generate expected signature
echo -n "v0:1234567890:{\"type\":\"url_verification\"}" | \
  openssl dgst -sha256 -hmac "your-signing-secret"

# Compare with x-slack-signature header
```

### Test Slack API Manually
```bash
# Test bot token
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-your-bot-token"

# Send test message
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer xoxb-your-bot-token" \
  -H "content-type: application/json" \
  -d '{"channel":"U123456","text":"Test message"}'
```

### Check Database Configuration
```sql
-- View organization Slack config
SELECT 
  o.name as org_name,
  c.type,
  c.config->>'slack_team_id' as team_id,
  c.enabled,
  c.created_at
FROM channels c
JOIN organizations o ON c.organization_id = o.id
WHERE c.type = 'slack';

-- View user channel preferences
SELECT 
  u.email,
  uc.channel_type,
  uc.channel_id,
  uc.preferences,
  uc.verified
FROM user_channels uc
JOIN users u ON uc.user_id = u.id
WHERE uc.channel_type = 'slack';

-- View recent Slack attempts
SELECT 
  u.email,
  a.item_id,
  a.correct,
  a.channel,
  a.created_at
FROM attempts a
JOIN users u ON a.user_id = u.id
WHERE a.channel = 'slack'
ORDER BY a.created_at DESC
LIMIT 10;
```

---

## Performance Issues

### Slow message delivery
- **Cause:** Slack API rate limits (1 msg/sec/user)
- **Fix:** Implement queue with rate limiting
- **Workaround:** Batch messages or stagger delivery

### Webhook timeouts
- **Cause:** Slack expects response within 3 seconds
- **Fix:** Process webhook async, respond immediately with 200
- **Current:** We respond synchronously (OK for MVP)

---

## Security Checks

### Verify webhook signature
```typescript
// From api/src/adapters/slack.ts
import { verifySlackSignature } from '../adapters/slack';

const isValid = verifySlackSignature(
  rawBody,
  req.headers['x-slack-request-timestamp'],
  req.headers['x-slack-signature'],
  signingSecret
);

if (!isValid) {
  return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE' } });
}
```

### Check bot permissions
Required bot scopes:
- `chat:write` - Send messages
- `users:read` - Get user info
- `im:write` - Open DMs
- `im:history` - Read DM history

### Audit user access
```sql
-- Check who has Slack access
SELECT 
  o.name as org_name,
  COUNT(DISTINCT uc.user_id) as users_with_slack
FROM user_channels uc
JOIN users u ON uc.user_id = u.id
JOIN organizations o ON u.organization_id = o.id
WHERE uc.channel_type = 'slack' AND uc.verified = true
GROUP BY o.name;
```

---

## Monitoring

### Key Metrics
- **Delivery success rate:** `(successful_sends / total_sends) * 100`
- **Response rate:** `(responses / messages_sent) * 100`
- **Avg response time:** `AVG(latency_ms) FROM attempts WHERE channel='slack'`
- **Error rate:** Count of 4xx/5xx errors from Slack API

### Alerts
Set up alerts for:
- Delivery failure rate > 5%
- Response time > 10 seconds
- Signature verification failures > 10/hour
- Bot token expiration (30 days notice)

---

## FAQ

**Q: Can users receive messages in multiple channels?**  
A: Not yet. Epic 5 MVP supports one verified channel per user. Phase 2 will add multi-channel support.

**Q: What happens if Slack is down?**  
A: Delivery fails with `DELIVERY_FAILED` error. Future: Implement fallback to email.

**Q: Can managers send to multiple learners at once?**  
A: Not yet. Current API requires one `POST /api/delivery/send` per user. Phase 3 will add batch delivery.

**Q: How do I test Slack integration locally?**  
A: Use ngrok to expose localhost:8080, configure Slack webhook URL to ngrok URL.

**Q: Can I customize the message format?**  
A: Yes, edit `formatQuestionAsBlockKit()` in `api/src/adapters/slack.ts`. See [Block Kit Builder](https://app.slack.com/block-kit-builder).

---

## Support

**Escalation Path:**
1. Check logs: `grep "slack" api/events.ndjson`
2. Run smoke tests: `bash api/scripts/smoke-delivery.sh`
3. Check Slack API status: https://status.slack.com
4. Contact Slack support: https://api.slack.com/support

**Internal Contact:**
- Epic Owner: [Your Name]
- On-call: [Team rotation]
- Slack Channel: #cerply-eng-support

