const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'api', ts: new Date().toISOString() });
});

app.get('/prompts', (_req, res) => {
  res.json([
    { id: 'demo-1', title: 'Welcome to Cerply', category: 'demo' },
    { id: 'demo-2', title: 'Try a curated prompt', category: 'demo' },
  ]);
});

const port = 8080;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
