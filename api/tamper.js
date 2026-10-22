// Public tamper feed. Browsers running the entropynet verifier post signed evidence when a file
// doesn't match the sealed release. The signature proves the report wasn't altered in transit;
// it does not prove who sent it, so reports are shown as claims, with test reports labelled.
import crypto from 'node:crypto';
import { getJSON, putJSON } from '../packages/beacon/beacon.js';
const hits = new Map();
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method === 'GET') {
      if (req.query.id) { const r = await getJSON(`tamper/${clean(req.query.id, 40).replace(/[^a-z0-9-]/g, '')}.json`); return r ? res.json(r) : res.status(404).json({ error: 'not found' }); }
      const idx = (await getJSON('tamper/index.json')) || [];
      return res.json({ items: idx.slice(0, 50) });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
    const n = (hits.get(ip) || 0) + 1; hits.set(ip, n); if (n > 30) return res.status(429).json({ error: 'slow down' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const evidence = clean(b.evidence, 4000), sig = clean(b.sig, 200), pub = clean(b.pub, 200);
    if (!/^[0-9a-f]{128}$/.test(sig) || !/^04[0-9a-f]{128}$/.test(pub)) return res.status(400).json({ error: 'bad signature format' });
    const raw = Buffer.from(pub, 'hex');
    const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33).toString('base64url') }, format: 'jwk' });
    if (!crypto.verify('sha256', Buffer.from(evidence), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'hex'))) return res.status(400).json({ error: 'signature does not verify' });
    const e = JSON.parse(evidence);
    const id = new Date().toISOString().replace(/[:.]/g, '-').toLowerCase() + '-' + crypto.randomBytes(3).toString('hex');
    const rec = { id, received: Math.floor(Date.now() / 1000), kind: clean(e.kind, 30), path: clean(e.path, 200), expected: clean(e.expected, 80), got: clean(e.got, 80), release: clean(e.release, 80), origin: clean(e.origin, 100), test: !!e.test || String(e.path || '').startsWith('/tamper-test/'), excerpt: clean(e.excerpt, 300), reporter_key: pub.slice(0, 20) + '…', evidence, sig, pub };
    await putJSON(`tamper/${id}.json`, rec, false);
    const idx = (await getJSON('tamper/index.json')) || [];
    const { evidence: _e, sig: _s, pub: _p, excerpt: _x, ...summary } = rec;
    idx.unshift(summary); await putJSON('tamper/index.json', idx.slice(0, 200), true);
    return res.json({ ok: true, id });
  } catch (e) { return res.status(400).json({ error: 'bad report' }); }
}
