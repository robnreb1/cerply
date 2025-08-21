// Pages Router style API route for Vercel compatibility testing
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Pages Router API route working',
      timestamp: new Date().toISOString(),
      build: 'pages-router-test-' + Date.now(),
      deployment: 'vercel-pages-router-' + Date.now(),
      forceRebuild: 'vercel-cache-bust-' + Math.random().toString(36).substring(7)
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
