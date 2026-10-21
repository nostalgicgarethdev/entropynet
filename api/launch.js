import crypto from 'node:crypto';
import { latest, getRound, getJSON, putJSON, roundAt, timeOf } from './_lib/beacon.js';
const LIVE = process.env.ENTROPY_LAUNCHES_LIVE === 'true';
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const isWallet = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const now = () => Math.floor(Date.now() / 1000);

async function resolve(L) {
  const t = now();
  let changed = false;
  if (!L.timing && t >= L.window_start) {
    const r = (await getRound(L.decision_round_target)) || (await latest());
    if (r.round >= L.decision_round_target) {
      const span = BigInt(L.window_seconds);
      const off = Number(BigInt('0x' + crypto.createHash('sha256').update(r.randomness + '|launch|' + L.id).digest('hex')) % span);
      L.timing = { round: r.round, randomness: r.randomness, signature: r.signature, offset_seconds: off, launch_at: L.window_start + off,
        formula: 'offset = sha256(randomness + "|launch|" + id) mod window_seconds' };
      L.raffle_round_target = roundAt(L.timing.launch_at);
      L.status = 'timed'; changed = true;
    }
  }
  if (L.timing && L.status === 'timed' && t >= L.timing.launch_at) {
    const r = (await getRound(L.raffle_round_target)) || (await latest());
    if (r.round >= L.raffle_round_target) {
      if (L.raffle && L.signups.length) {
        const idx = Number(BigInt('0x' + crypto.createHash('sha256').update(r.randomness + '|raffle|' + L.id).digest('hex')) % BigInt(L.signups.length));
        L.raffle_result = { round: r.round, randomness: r.randomness, signature: r.signature, index: idx, winner: L.signups[idx], entrants: L.signups.length,
          formula: 'index = sha256(randomness + "|raffle|" + id) mod entrants (signup order)' };
      }
      L.status = LIVE ? 'launching' : 'launched-paper';
      L.note = LIVE ? 'live mode' : 'Paper mode: ENTROPY_LAUNCHES_LIVE=false, so nothing was sent on-chain. In live mode the creator signs the pump.fun create at this moment.';
      changed = true;
    }
  }
  if (changed) await putJSON(`launches/${L.id}.json`, L, true);
  return L;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const id = req.query.id;
    if (req.method === 'GET' && id) {
      const L = await getJSON(`launches/${clean(id, 16)}.json`); if (!L) return res.status(404).json({ error: 'not found' });
      return res.json(await resolve(L));
    }
    if (req.method === 'GET') {
      const idx = (await getJSON('launches/index.json')) || [];
      const items = (await Promise.all(idx.slice(0, 24).map(i => getJSON(`launches/${i}.json`)))).filter(Boolean);
      return res.json({ live: LIVE, items: await Promise.all(items.map(resolve)) });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (b.action === 'signup') {
      const L = await getJSON(`launches/${clean(b.id, 16)}.json`); if (!L) return res.status(404).json({ error: 'not found' });
      if (now() >= L.window_start) return res.status(400).json({ error: 'signups closed when the window opened' });
      if (!L.raffle) return res.status(400).json({ error: 'this launch has no raffle' });
      if (!isWallet(b.wallet)) return res.status(400).json({ error: 'enter a Solana wallet address' });
      if (L.signups.includes(b.wallet)) return res.json(L);
      if (L.signups.length >= 500) return res.status(400).json({ error: 'raffle full' });
      L.signups.push(b.wallet); await putJSON(`launches/${L.id}.json`, L, true); return res.json(L);
    }
    const name = clean(b.name, 32), ticker = clean(b.ticker, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const startIn = Math.min(Math.max(Number(b.start_in_minutes) || 5, 1), 1440), win = Math.min(Math.max(Number(b.window_minutes) || 10, 1), 240);
    if (!name || ticker.length < 2) return res.status(400).json({ error: 'name and a 2-10 character ticker are required' });
    if (b.creator && !isWallet(b.creator)) return res.status(400).json({ error: 'creator must be a Solana address' });
    const nid = crypto.randomBytes(5).toString('hex');
    const ws = now() + startIn * 60;
    const L = { id: nid, name, ticker, description: clean(b.description, 200), creator: b.creator || null, created: now(), window_start: ws, window_seconds: win * 60,
      decision_round_target: roundAt(ws) + 1, raffle: !!b.raffle, signups: [], status: 'scheduled', live: LIVE };
    await putJSON(`launches/${nid}.json`, L, false);
    const idx = (await getJSON('launches/index.json')) || []; idx.unshift(nid); await putJSON('launches/index.json', idx.slice(0, 200), true);
    return res.json(L);
  } catch (e) { return res.status(500).json({ error: 'server error', detail: String(e.message || e).slice(0, 120) }); }
}
