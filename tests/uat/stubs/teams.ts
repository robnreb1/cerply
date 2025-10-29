/**
 * Microsoft Teams Stub Server for UAT
 * Captures Teams Bot Framework API calls and responds appropriately
 */

import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = 4002;

// Store captured activities for test verification
const activities: any[] = [];

app.use(bodyParser.json());

// Teams Bot Framework: Send activity
app.post('/v3/conversations/:conversationId/activities', (req, res) => {
  const activity = {
    timestamp: new Date().toISOString(),
    conversationId: req.params.conversationId,
    type: req.body.type,
    text: req.body.text,
    attachments: req.body.attachments,
  };
  
  activities.push(activity);
  
  console.log(`[Teams Stub] Received activity:`, {
    conversation: activity.conversationId,
    type: activity.type,
    text: activity.text?.substring(0, 50),
  });
  
  res.json({
    id: `activity-${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
});

// Teams Bot Framework: Reply to activity
app.post('/v3/conversations/:conversationId/activities/:activityId', (req, res) => {
  const reply = {
    timestamp: new Date().toISOString(),
    conversationId: req.params.conversationId,
    replyToId: req.params.activityId,
    type: req.body.type,
    text: req.body.text,
  };
  
  activities.push(reply);
  
  console.log(`[Teams Stub] Received reply:`, {
    replyTo: reply.replyToId,
    text: reply.text?.substring(0, 50),
  });
  
  res.json({
    id: `reply-${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
});

// Teams Webhook (for incoming webhooks)
app.post('/webhook/:webhookId', (req, res) => {
  const message = {
    timestamp: new Date().toISOString(),
    webhookId: req.params.webhookId,
    text: req.body.text,
    title: req.body.title,
  };
  
  activities.push(message);
  
  console.log(`[Teams Stub] Webhook message:`, {
    webhook: message.webhookId,
    title: message.title,
  });
  
  res.status(200).send('1');
});

// Test helper: Get captured activities
app.get('/test/activities', (req, res) => {
  res.json({ activities });
});

// Test helper: Clear activities
app.post('/test/clear', (req, res) => {
  activities.length = 0;
  res.json({ ok: true, cleared: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'teams-stub', port: PORT });
});

app.listen(PORT, () => {
  console.log(`✅ Teams stub server running on http://localhost:${PORT}`);
  console.log(`   POST /v3/conversations/:id/activities - Send activities`);
  console.log(`   GET  /test/activities - View captured activities`);
  console.log(`   POST /test/clear - Clear activity history`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Teams stub shutting down...');
  process.exit(0);
});

