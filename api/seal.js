// Sealed releases. POST a release; it is stored only if it meets the signer policy's threshold.
// The newest one is chained into every following beacon round (round.seal, inside the signed message).
import crypto from 'node:crypto';
import fs from 'node:fs';
import { getJSON, putJSON } from '../packages/beacon/beacon.js';
const POLICY = JSON.parse(fs.readFileSync(new URL('../seal.policy.json', import.meta.url), 'utf8'));
const SPEC = 'entropynet-seal/v1';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = (s) => { let n = 0n; for (const c of s) n = n * 58n + BigInt(A58.indexOf(c)); return Buffer.from(n.toString(16).padStart(64, '0'), 'hex'); };
const verify = (pub, sig, msg) => { try { return crypto.verify(null, Buffer.from(msg), crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), b58(pub)]), format: 'der', type: 'spki' }), Buffer.from(sig, 'hex')); } catch { return false; } };
export function check(r) {
  if (!r || r.spec !== SPEC || !r.files) return 'not a release';
  const root = sha(Object.entries(r.files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join(''));
  if (root !== r.files_root) return 'files_root mismatch';
  if (sha([SPEC, r.files_root, r.beacon.round, r.beacon.randomness, r.created, r.prev || ''].join('\n')) !== r.id) return 'id mismatch';
  const ok = new Set((r.signatures || []).filter(s => POLICY.signers.includes(s.signer) && verify(s.signer, s.sig, `${SPEC}:${r.id}`)).map(s => s.signer));
  return ok.size >= POLICY.threshold ? null : `only ${ok.size} of ${POLICY.threshold} signatures`;
}
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method === 'GET') { const id = String(req.query.id || 'latest').replace(/[^a-f0-9]/g, '') || 'latest'; const r = await getJSON(id === 'latest' ? 'seals/latest.json' : `seals/${id}.json`); return r ? res.json(r) : res.status(404).json({ error: 'no sealed release yet' }); }
    if (req.method !== 'POST') return res.status(405).end();
    const r = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const why = check(r); if (why) return res.status(400).json({ error: why });
    const cur = await getJSON('seals/latest.json');
    if (cur && cur.id !== r.id && !(r.created > cur.created)) return res.status(400).json({ error: 'older than the current release' });
    await putJSON(`seals/${r.id}.json`, r, true);
    await putJSON('seals/latest.json', { id: r.id, created: r.created, files_root: r.files_root, beacon: r.beacon, anchor: r.anchor, signers: r.signatures.map(s => s.signer), policy: POLICY }, true);
    return res.json({ ok: true, id: r.id });
  } catch (e) { return res.status(400).json({ error: 'bad release' }); }
}
