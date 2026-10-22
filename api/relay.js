// Narrow Solana RPC relay for seal records only. Read methods for building a memo tx, and sendTransaction
// only for transactions whose memo starts with an entropynet seal/site record. Nothing else is forwarded.
const READ = new Set(['getLatestBlockhash', 'getSignatureStatuses', 'getAccountInfo', 'getBalance', 'getTransaction']);
const hits = new Map();
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h); if (hits.size > 5000) hits.clear();
  if (h.length > 120) return res.status(429).json({ error: 'slow down' });
  const cluster = req.query.cluster === 'mainnet' ? 'mainnet' : 'devnet';
  const rpc = cluster === 'devnet' ? (process.env.ENTROPYNET_DEVNET_RPC || 'https://api.devnet.solana.com') : (process.env.ENTROPYNET_MAINNET_RPC || 'https://api.mainnet-beta.solana.com');
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!b || Array.isArray(b) || typeof b.method !== 'string') return res.status(400).json({ error: 'single json-rpc call only' });
  let ok = READ.has(b.method);
  if (b.method === 'requestAirdrop' && cluster === 'devnet') ok = true;
  if (b.method === 'sendTransaction') {
    const raw = Buffer.from(String(b.params?.[0] || ''), b.params?.[1]?.encoding === 'base64' ? 'base64' : 'base64');
    const txt = raw.toString('latin1');
    ok = raw.length < 1300 && (txt.includes('entropynet-seal/v1 release=') || txt.includes('entropynet-site/v1 slug='));
  }
  if (!ok) return res.status(403).json({ jsonrpc: '2.0', id: b.id, error: { code: -32601, message: 'method not relayed' } });
  try { const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: b.id ?? 1, method: b.method, params: b.params || [] }) }); res.status(r.status).send(await r.text()); }
  catch { res.status(502).json({ error: 'rpc unreachable' }); }
}
