// Sealed mini-sites at /s/<slug>. The page code is part of EntropyNet's own 2-of-3 sealed release;
// the per-coin content is signed by the creator's wallet (ed25519) and checked in every visitor's browser.
// Optional: the creator records it on Solana with a memo they sign and pay for.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { getJSON, putJSON } from '../packages/beacon/beacon.js';
const POLICY = JSON.parse(fs.readFileSync(new URL('../seal.policy.json', import.meta.url), 'utf8'));
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = (s) => { let n = 0n; for (const c of s) { const i = A58.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); } const h = n.toString(16).padStart(64, '0'); if (h.length !== 64) throw new Error('bad key'); return Buffer.from(h, 'hex'); };
const verify = (pub, sigHex, msg) => { try { return crypto.verify(null, Buffer.from(msg), crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), b58(pub)]), format: 'der', type: 'spki' }), Buffer.from(sigHex, 'hex')); } catch { return false; } };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const FIELDS = ['slug', 'mint', 'name', 'ticker', 'about', 'x', 'telegram', 'website', 'creator', 'created'];
export const siteMessage = (d) => 'entropynet-site/v1\n' + FIELDS.map(k => `${k}=${d[k] ?? ''}`).join('\n');
const isB58 = (s, lo = 32, hi = 44) => typeof s === 'string' && s.length >= lo && s.length <= hi && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
const url = (s) => !s || (/^https:\/\/[^\s"'<>]{3,200}$/.test(s));
const hits = new Map();
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method === 'GET') {
      const slug = String(req.query.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 44);
      if (!slug) return res.status(400).json({ error: 'slug?' });
      const d = await getJSON(`sites/${slug}.json`); return d ? res.json(d) : res.status(404).json({ error: 'no sealed page here' });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 3600e3); if (h.length >= 5) return res.status(429).json({ error: '5 pages an hour per ip' }); h.push(now); hits.set(ip, h);
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (b.op === 'record') return record(b, res);
    const d = {}; for (const k of FIELDS) d[k] = typeof b[k] === 'string' ? b[k].trim() : b[k];
    d.slug = String(d.slug || '').toLowerCase();
    if (!/^[a-z0-9-]{3,44}$/.test(d.slug)) return res.status(400).json({ error: 'slug: 3-44 chars a-z 0-9 -' });
    if (!isB58(d.mint)) return res.status(400).json({ error: 'mint: paste the coin CA' });
    if (!isB58(d.creator)) return res.status(400).json({ error: 'connect a wallet' });
    if (!d.name || d.name.length > 32 || (d.ticker || '').length > 10 || (d.about || '').length > 280) return res.status(400).json({ error: 'name ≤32, ticker ≤10, about ≤280' });
    if (![d.x, d.telegram, d.website].every(url)) return res.status(400).json({ error: 'links must be https://' });
    if (!Number.isInteger(d.created) || Math.abs(d.created - now / 1000) > 600) return res.status(400).json({ error: 'stale signature, sign again' });
    if (!isB58(b.signature, 80, 90) && !/^[0-9a-f]{128}$/.test(b.signature || '')) return res.status(400).json({ error: 'missing wallet signature' });
    const sigHex = /^[0-9a-f]{128}$/.test(b.signature) ? b.signature : Buffer.from(b58sig(b.signature)).toString('hex');
    const msg = siteMessage(d);
    if (!verify(d.creator, sigHex, msg)) return res.status(400).json({ error: 'wallet signature does not match' });
    const cur = await getJSON(`sites/${d.slug}.json`);
    if (cur && cur.creator !== d.creator) return res.status(409).json({ error: 'that slug belongs to another wallet' });
    const page = { spec: 'entropynet-site/v1', ...d, message_sha256: sha(msg), signature: sigHex, template_release: (await getJSON('seals/latest.json'))?.id || null, record: cur && cur.message_sha256 === sha(msg) ? cur.record : null, cluster: POLICY.anchor_cluster || 'devnet' };
    await putJSON(`sites/${d.slug}.json`, page, true);
    return res.json({ ok: true, url: `https://entropynet.space/s/${d.slug}`, page });
  } catch (e) { return res.status(400).json({ error: 'bad request' }); }
}
function b58sig(s) { let n = 0n; for (const c of s) { const i = A58.indexOf(c); if (i < 0) throw new Error(); n = n * 58n + BigInt(i); } return Buffer.from(n.toString(16).padStart(128, '0'), 'hex'); }

async function record(b, res) {
  const slug = String(b.slug || '').toLowerCase(); const cur = /^[a-z0-9-]{3,44}$/.test(slug) && await getJSON(`sites/${slug}.json`);
  if (!cur) return res.status(404).json({ error: 'no page' });
  if (!isB58(b.tx, 60, 100)) return res.status(400).json({ error: 'tx?' });
  const cluster = cur.cluster === 'devnet' ? 'devnet' : 'mainnet';
  const rpc = cluster === 'devnet' ? (process.env.ENTROPYNET_DEVNET_RPC || 'https://api.devnet.solana.com') : (process.env.ENTROPYNET_MAINNET_RPC || 'https://api.mainnet-beta.solana.com');
  let j; for (let i = 0; i < 8; i++) { j = await (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [b.tx, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }] }) })).json(); if (j.result) break; await new Promise(r => setTimeout(r, 2000)); }
  const t = j && j.result; const memo = `entropynet-site/v1 slug=${slug} sha=${cur.message_sha256}`;
  const signer = t && t.transaction.message.accountKeys.find(k => k.signer)?.pubkey;
  if (!t || t.meta.err || !JSON.stringify(t.transaction).includes(memo) || signer !== cur.creator) return res.status(400).json({ error: 'record not found, or not signed by the creator' });
  cur.record = { cluster, tx: b.tx, memo }; await putJSON(`sites/${slug}.json`, cur, true);
  return res.json({ ok: true, record: cur.record });
}
