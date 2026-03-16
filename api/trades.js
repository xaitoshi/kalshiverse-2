const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_FILE = 'trades.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!GIST_ID || !GIST_TOKEN) {
    return res.status(500).json({ error: 'GIST_ID or GIST_TOKEN not configured' });
  }

  const gistUrl = `https://api.github.com/gists/${GIST_ID}`;
  const headers = {
    Authorization: `token ${GIST_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'kalshiverse',
  };

  if (req.method === 'GET') {
    const r = await fetch(gistUrl, { headers });
    if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch gist' });
    const gist = await r.json();
    const content = gist.files?.[GIST_FILE]?.content ?? '[]';
    return res.status(200).json(JSON.parse(content));
  }

  if (req.method === 'POST') {
    const trades = req.body;
    const r = await fetch(gistUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(trades, null, 2) } } }),
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Failed to save gist' });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
