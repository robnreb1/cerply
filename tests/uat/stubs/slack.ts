/**
 * Slack Stub Server for UAT
 * Captures Slack API calls and responds appropriately
 */

import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = 4001;

// Store captured messages for test verification
const messages: any[] = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Slack Web API: chat.postMessage
app.post('/api/chat.postMessage', (req, res) => {
  const message = {
    timestamp: new Date().toISOString(),
    channel: req.body.channel,
    text: req.body.text,
    blocks: req.body.blocks,
    thread_ts: req.body.thread_ts,
  };
  
  messages.push(message);
  
  console.log(`[Slack Stub] Received message:`, {
    channel: message.channel,
    text: message.text?.substring(0, 50),
  });
  
  res.json({
    ok: true,
    ts: `${Date.now()}.000000`,
    channel: req.body.channel,
    message: {
      text: req.body.text,
      ts: `${Date.now()}.000000`,
    },
  });
});

// Slack Events API (for interactive messages)
app.post('/slack/events', (req, res) => {
  const event = req.body;
  
  // Handle URL verification challenge
  if (event.type === 'url_verification') {
    return res.json({ challenge: event.challenge });
  }
  
  console.log(`[Slack Stub] Received event:`, event.type);
  res.json({ ok: true });
});

// Slack Interactive Components (button clicks, etc.)
app.post('/slack/interactive', (req, res) => {
  const payload = JSON.parse(req.body.payload || '{}');
  
  console.log(`[Slack Stub] Interactive action:`, {
    type: payload.type,
    action: payload.actions?.[0]?.action_id,
  });
  
  res.json({ ok: true });
});

// Test helper: Get captured messages
app.get('/test/messages', (req, res) => {
  res.json({ messages });
});

// Test helper: Clear messages
app.post('/test/clear', (req, res) => {
  messages.length = 0;
  res.json({ ok: true, cleared: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'slack-stub', port: PORT });
});

app.listen(PORT, () => {
  console.log(`✅ Slack stub server running on http://localhost:${PORT}`);
  console.log(`   POST /api/chat.postMessage - Send messages`);
  console.log(`   GET  /test/messages - View captured messages`);
  console.log(`   POST /test/clear - Clear message history`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Slack stub shutting down...');
  process.exit(0);
});

