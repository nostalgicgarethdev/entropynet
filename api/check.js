// Passive "is this site sealed?" check. GET only, same-site files, size + time limits, no probing of any kind.
// YES only when: manifest + threshold signatures, signatures verify against the site's published signer policy,
// the release is recorded on Solana with a matching release id, and sampled live files match the manifest.
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import fs from 'node:fs';
const PINNED = JSON.parse(fs.readFileSync(new URL('../seal.policy.json', import.meta.url), 'utf8'));
const SPEC = 'entropynet-seal/v1';
const MAX = 2 * 1024 * 1024, TIMEOUT = 6000, HOPS = 3;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = (s) => { let n = 0n; for (const c of s) { const i = A58.indexOf(c); if (i < 0) throw 0; n = n * 58n + BigInt(i); } return Buffer.from(n.toString(16).padStart(64, '0'), 'hex'); };
const verify = (pub, sig, msg) => { try { return crypto.verify(null, Buffer.from(msg), crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), b58(pub)]), format: 'der', type: 'spki' }), Buffer.from(sig, 'hex')); } catch { return false; } };

function privateIp(ip) {
  if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b < 128); }
  const l = ip.toLowerCase(); if (l.startsWith('::ffff:')) return privateIp(l.slice(7));
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}
async function safeUrl(u) {
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) throw new Error('only plain http(s) urls');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('only ports 80/443');
  const h = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(h) || /(^|\.)(localhost|local|internal)$/i.test(h) || !h.includes('.')) throw new Error('public hostnames only');
  const addrs = await dns.lookup(h, { all: true }).catch(() => { throw new Error('dns lookup failed'); });
  if (!addrs.length || addrs.some(a => privateIp(a.address))) throw new Error('host resolves to a private address');
}
async function get(url, origin) {
  let u = new URL(url);
  for (let i = 0; i <= HOPS; i++) {
    await safeUrl(u);
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
      const r = await fetch(u, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'entropynet-check/1 (+https://entropynet.space/#check; passive seal check)', accept: '*/*' } });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        const n = new URL(r.headers.get('location'), u);
        if (origin && n.origin !== origin) return { status: r.status, url: u.href, offsite: n.href };
        u = n; continue;
      }
      if (Number(r.headers.get('content-length') || 0) > MAX) throw new Error('too large');
      const chunks = []; let size = 0;
      for await (const c of r.body || []) { size += c.length; if (size > MAX) { ctl.abort(); throw new Error('too large'); } chunks.push(c); }
      return { status: r.status, url: u.href, body: Buffer.concat(chunks) };
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'timed out' : e.message); } finally { clearTimeout(t); }
  }
  throw new Error('too many redirects');
}
async function anchored(a, id) {
  if (!a || !a.tx || !/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(a.tx)) return { ok: false, why: 'no on-chain record in the release' };
  const rpc = a.cluster === 'devnet' ? (process.env.ENTROPYNET_DEVNET_RPC || 'https://api.devnet.solana.com') : a.cluster === 'mainnet' || a.cluster === 'mainnet-beta' ? (process.env.ENTROPYNET_MAINNET_RPC || 'https://api.mainnet-beta.solana.com') : null;
  if (!rpc) return { ok: false, why: 'unknown cluster' };
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
    const j = await (await fetch(rpc, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [a.tx, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }] }) })).json();
    clearTimeout(t);
    const ok = !!(j.result && !j.result.meta.err && JSON.stringify(j.result.transaction).includes(`release=${id}`));
    return { ok, why: ok ? `recorded on ${a.cluster}, memo release id matches` : j.result ? 'memo does not carry this release id' : 'transaction not found', cluster: a.cluster, tx: a.tx };
  } catch { return { ok: false, why: `could not reach ${a.cluster} rpc`, cluster: a.cluster, tx: a.tx }; }
}

export async function runCheck(input) {
  const steps = []; const step = (ok, k, msg) => steps.push({ ok, k, msg });
  let u; try { u = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input); u.hash = ''; } catch { return { sealed: false, verdict: 'NOT SEALED', reason: 'not a valid url', steps }; }
  const out = (sealed, reason, extra = {}) => ({ sealed, verdict: sealed ? 'SEALED' : 'NOT SEALED', reason, input: u.href, checked_at: new Date().toISOString(), steps, ...extra });
  let home;
  try { home = await get(u.origin + (u.pathname || '/')); } catch (e) { step(false, 'reach', `unreachable: ${e.message}`); return out(false, 'unreachable'); }
  const origin = new URL(home.url).origin;
  step(home.status < 400, 'reach', `GET ${home.url} → ${home.status}`);
  if (home.status >= 400 || !home.body) return out(false, 'unreachable', { origin });
  let rel, pol;
  try { const r = await get(origin + '/seal/release.json', origin); if (r.status !== 200) throw 0; rel = JSON.parse(r.body.toString('utf8')); } catch { step(false, 'manifest', 'no seal manifest at /seal/release.json'); return out(false, 'missing seal', { origin }); }
  if (!rel || rel.spec !== SPEC || typeof rel.files !== 'object' || !rel.beacon) { step(false, 'manifest', 'manifest is not entropynet-seal/v1'); return out(false, 'missing seal', { origin }); }
  const nf = Object.keys(rel.files).length;
  const root = sha(Object.entries(rel.files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join(''));
  const id = sha([SPEC, rel.files_root, rel.beacon.round, rel.beacon.randomness, rel.created, rel.prev || ''].join('\n'));
  if (root !== rel.files_root || id !== rel.id) { step(false, 'manifest', root !== rel.files_root ? 'files_root does not match the file list' : 'release id does not match its contents'); return out(false, 'bad manifest', { origin }); }
  step(true, 'manifest', `${nf} files · release ${id.slice(0, 16)}… · files_root ${root.slice(0, 16)}…`);
  const isUs = origin === 'https://entropynet.space';
  try { const r = await get(origin + '/seal/policy.json', origin); if (r.status !== 200) throw 0; pol = JSON.parse(r.body.toString('utf8')); } catch {}
  if (isUs) { if (!pol || JSON.stringify(pol.signers) !== JSON.stringify(PINNED.signers) || pol.threshold !== PINNED.threshold) { step(false, 'policy', 'published policy differs from the pinned entropynet policy'); return out(false, 'bad signatures', { origin }); } }
  if (!pol || !Array.isArray(pol.signers) || !Number.isInteger(pol.threshold) || pol.threshold < 1 || pol.threshold > pol.signers.length) { step(false, 'policy', 'no signer policy at /seal/policy.json'); return out(false, 'missing seal', { origin }); }
  step(true, 'policy', `${pol.threshold}-of-${pol.signers.length} signers · ${isUs ? 'pinned by entropynet' : 'published by the site'}`);
  const good = new Set((rel.signatures || []).filter(s => pol.signers.includes(s.signer) && verify(s.signer, s.sig, `${SPEC}:${id}`)).map(s => s.signer));
  if (good.size < pol.threshold) { step(false, 'signatures', `only ${good.size} of ${pol.threshold} valid signatures`); return out(false, 'bad signatures', { origin }); }
  step(true, 'signatures', `${good.size} of ${pol.threshold} valid ed25519 signatures`);
  const a = await anchored(rel.anchor, id);
  step(a.ok, 'record', a.why);
  if (!a.ok) return out(false, 'release not recorded', { origin, release: id });
  const samples = new Set(['/index.html']);
  const html = home.body.toString('utf8');
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) { try { const s = new URL(m[1], home.url); if (s.origin === origin) samples.add(s.pathname); } catch {} }
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)) { try { const s = new URL(m[1] || m[2], home.url); if (s.origin === origin) samples.add(s.pathname); } catch {} }
  const list = [...samples].slice(0, 8); let bad = 0;
  for (const p of list) {
    const want = rel.files[p];
    if (!want) { bad++; step(false, 'file', `${p} is served but not in the manifest`); continue; }
    let got; try { got = p === '/index.html' && /\/(index\.html)?$/.test(new URL(home.url).pathname) ? home : await get(origin + p, origin); } catch (e) { bad++; step(false, 'file', `${p} unreachable: ${e.message}`); continue; }
    const h = got.body ? sha(got.body) : '';
    if (h === want) step(true, 'file', `${p} sha256 ${h.slice(0, 12)}… matches`); else { bad++; step(false, 'file', `${p} sha256 ${h.slice(0, 12) || '—'}… ≠ sealed ${want.slice(0, 12)}…`); }
  }
  if (bad) return out(false, 'hash mismatch', { origin, release: id });
  return out(true, 'sealed release, recorded on-chain, live files match', { origin, release: id, anchor: { cluster: a.cluster, tx: a.tx }, signers: [...good], threshold: pol.threshold, files: nf, sampled: list.length });
}

const cache = new Map(), hits = new Map();
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  if (h.length > 10) { res.setHeader('retry-after', '60'); return res.status(429).json({ error: 'slow down: 10 checks a minute' }); }
  const raw = String(req.query.url || req.query.domain || '').trim().slice(0, 300);
  if (!raw) return res.status(400).json({ error: 'pass ?url=' });
  const key = raw.toLowerCase().replace(/\/+$/, '');
  const c = cache.get(key);
  if (c && now - c.t < 60000) { res.setHeader('cache-control', 'public, s-maxage=60'); return res.json({ ...c.r, cached: true }); }
  const r = await runCheck(raw).catch(() => ({ sealed: false, verdict: 'NOT SEALED', reason: 'check failed', steps: [] }));
  if (cache.size > 500) cache.clear(); cache.set(key, { t: now, r });
  res.setHeader('cache-control', 'public, s-maxage=60');
  return res.json(r);
}
