import crypto from 'node:crypto';
import { latest, getRound, getJSON, putJSON, roundAt } from '../packages/beacon/beacon.js';
import * as P from '../packages/launch/pump.js';

const LIVE = process.env.ENTROPY_LAUNCHES_LIVE === 'true';
const SIGN_WINDOW = 120;         // seconds the creator has to land the create after the beacon fires
const clean = (s, n) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, n);
const httpUrl = (v) => { const s = clean(v, 200); if (!s) return ''; try { const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); return u.protocol === 'https:' ? u.toString() : ''; } catch { return ''; } };
const now = () => Math.floor(Date.now() / 1000);
const h = (...p) => crypto.createHash('sha256').update(p.join('|')).digest('hex');
const save = (L) => putJSON(`launches/${L.id}.json`, L, true);
const pub = (L) => { const { meta_uri, ...rest } = L; return { ...rest, metadata_uri: meta_uri || null }; };

// ---------- paper launches (legacy, ENTROPY_LAUNCHES_LIVE=false) ----------
async function resolvePaper(L) {
  const t = now(); let changed = false;
  if (!L.timing && t >= L.window_start) {
    const r = (await getRound(L.decision_round_target)) || (await latest());
    if (r.round >= L.decision_round_target) {
      const off = Number(BigInt('0x' + h(r.randomness, 'launch', L.id).slice(0)) % BigInt(L.window_seconds));
      L.timing = { round: r.round, randomness: r.randomness, signature: r.signature, offset_seconds: off, launch_at: L.window_start + off, formula: 'offset = sha256(randomness + "|launch|" + id) mod window_seconds' };
      L.raffle_round_target = roundAt(L.timing.launch_at); L.status = 'timed'; changed = true;
    }
  }
  if (L.timing && L.status === 'timed' && t >= L.timing.launch_at) {
    const r = (await getRound(L.raffle_round_target)) || (await latest());
    if (r.round >= L.raffle_round_target) {
      if (L.raffle && L.signups.length) { const idx = Number(BigInt('0x' + h(r.randomness, 'raffle', L.id)) % BigInt(L.signups.length)); L.raffle_result = { round: r.round, randomness: r.randomness, signature: r.signature, index: idx, winner: L.signups[idx], entrants: L.signups.length, formula: 'index = sha256(randomness + "|raffle|" + id) mod entrants (signup order)' }; }
      L.status = 'launched-paper'; L.note = 'Paper launch: nothing was sent on-chain.'; changed = true;
    }
  }
  if (changed) await save(L);
  return L;
}

// ---------- live launches ----------
// The window is a range of beacon rounds [first, last]. Each round in it "fires" with probability 1/M,
// M = half the rounds in the window: fires = sha256(randomness|fire|id) mod M == 0. The first published
// round that fires decides the launch. If none fires, the first published round at or after `last` does.
// Nobody (creator included) can know the moment before that round exists.
async function resolveLive(L) {
  const t = now(); let changed = false;
  if (L.status === 'scheduled' && t >= L.window_start) { L.status = 'armed'; changed = true; }
  if (L.status === 'armed') {
    const head = await latest();
    let n = L.scan_next, checks = 0;
    while (n <= head.round && checks < 80) {
      const r = n === head.round ? head : await getRound(n); checks++;
      if (r) {
        const fires = BigInt('0x' + h(r.randomness, 'fire', L.id)) % BigInt(L.fire_modulus) === 0n || r.round >= L.last_round;
        if (fires) {
          L.fire = { round: r.round, time: r.time, randomness: r.randomness, signature: r.signature, by_deadline: r.round >= L.last_round && BigInt('0x' + h(r.randomness, 'fire', L.id)) % BigInt(L.fire_modulus) !== 0n,
            rule: `first published round in #${L.first_round}..#${L.last_round} with sha256(randomness + "|fire|" + id) mod ${L.fire_modulus} == 0, else the first round at or after #${L.last_round}` };
          L.sign_deadline = r.time + SIGN_WINDOW; L.status = 'fired';
          if (L.raffle && L.signups.length) { const idx = Number(BigInt('0x' + h(r.randomness, 'raffle', L.id)) % BigInt(L.signups.length)); L.raffle_result = { round: r.round, randomness: r.randomness, index: idx, winner: L.signups[idx], entrants: L.signups.length, formula: 'index = sha256(randomness + "|raffle|" + id) mod entrants (signup order)' }; }
          break;
        }
      }
      n++;
    }
    if (L.fire) changed = true;
    else if (n !== L.scan_next) { L.scan_next = n; changed = true; }
  }
  if (L.status === 'fired' && L.sig) {
    try { const v = await P.verifyCreate(L.sig, L.mint, L.creator);
      if (v.ok) { L.status = 'live'; L.onchain = { sig: L.sig, mint: L.mint, slot: v.slot, block_time: v.blockTime, seconds_after_fire: v.blockTime - L.fire.time, pump: `https://pump.fun/coin/${L.mint}` }; changed = true; }
      else if (!v.pending) { L.sig = null; L.last_error = v.error; changed = true; }
    } catch {}
  }
  if (L.status === 'fired' && !L.sig && t > L.sign_deadline + 30) { L.status = 'missed'; L.note = 'The creator did not land the create within 2 minutes of the beacon firing. Anything launched later is not stamped by entropynet.'; changed = true; }
  if (changed) await save(L);
  return L;
}
const resolve = (L) => (L.live ? resolveLive(L) : resolvePaper(L));

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const id = req.query.id;
    if (req.method === 'GET' && id) {
      const L = await getJSON(`launches/${clean(id, 16)}.json`); if (!L) return res.status(404).json({ error: 'not found' });
      return res.json(pub(await resolve(L)));
    }
    if (req.method === 'GET') {
      const idx = (await getJSON('launches/index.json')) || [];
      let items = (await Promise.all(idx.slice(0, 40).map(i => getJSON(`launches/${i}.json`)))).filter(Boolean);
      if (LIVE) items = items.filter(L => L.live === true);   // paper launches stay stored but are hidden from the live board
      return res.json({ live: LIVE, items: (await Promise.all(items.slice(0, 24).map(resolve))).map(pub) });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const load = async () => { const L = await getJSON(`launches/${clean(b.id, 16)}.json`); if (!L) throw Object.assign(new Error('not found'), { code: 404 }); return L; };

    if (b.action === 'signup') {
      const L = await load();
      if (now() >= L.window_start) return res.status(400).json({ error: 'Signups closed when the window opened.' });
      if (!L.raffle) return res.status(400).json({ error: 'This launch has no raffle.' });
      if (!(await P.isPubkey(b.wallet))) return res.status(400).json({ error: 'Enter a Solana wallet address.' });
      if (!L.signups.includes(b.wallet)) { if (L.signups.length >= 500) return res.status(400).json({ error: 'Raffle full.' }); L.signups.push(b.wallet); await save(L); }
      return res.json(pub(L));
    }

    // Live: unsigned create tx for the creator's wallet, only after the beacon fires.
    if (b.action === 'build') {
      if (!LIVE) return res.status(400).json({ error: 'Live launches are off.' });
      const L = await resolveLive(await load());
      if (b.creator !== L.creator) return res.status(403).json({ error: 'Only the creator wallet can launch this coin.' });
      if (L.status !== 'fired') return res.status(400).json({ error: L.status === 'armed' || L.status === 'scheduled' ? 'The beacon has not fired yet.' : 'This launch is ' + L.status + '.' });
      if (now() > L.sign_deadline) return res.status(400).json({ error: 'The 2-minute signing window has passed.' });
      if (L.sig) return res.status(400).json({ error: 'A create is already in flight.' });
      if (!(await P.isPubkey(b.mint))) return res.status(400).json({ error: 'Bad mint address.' });
      const { tx } = await P.buildCreate({ creator: L.creator, mint: b.mint, name: L.name, symbol: L.ticker, uri: L.meta_uri, devBuySol: L.dev_buy_sol });
      const sim = await P.simulate(tx);
      if (sim.err) return res.status(400).json({ error: /insufficient|0x1\b|lamports/i.test(JSON.stringify(sim)) ? 'Your wallet needs more SOL for this launch.' : 'The create transaction failed simulation. Nothing was sent.', logs: sim.logs });
      L.mint = b.mint; await save(L);
      return res.json({ tx: P.b64(tx), units: sim.units });
    }
    // Live: relay a create the creator already signed in their wallet.
    if (b.action === 'send') {
      if (!LIVE) return res.status(400).json({ error: 'Live launches are off.' });
      const L = await load();
      if (L.status !== 'fired' || now() > L.sign_deadline + 15) return res.status(400).json({ error: 'This launch is not waiting for a create.' });
      if (!L.mint) return res.status(400).json({ error: 'Build the create first.' });
      const sig = await P.relay(clean(b.tx, 4000), L.creator, L.mint);
      L.sig = sig; await save(L);
      return res.json({ sig });
    }
    // Live: the raffle winner's own buy (unsigned; the winner signs and pays).
    if (b.action === 'winner-buy') {
      if (!LIVE) return res.status(400).json({ error: 'Live launches are off.' });
      const L = await load();
      if (L.status !== 'live') return res.status(400).json({ error: 'The coin is not live yet.' });
      if (!L.raffle_result || b.wallet !== L.raffle_result.winner) return res.status(403).json({ error: 'Only the raffle winner can use this button.' });
      const sol = Math.min(Math.max(Number(b.sol) || 0, 0.001), 5);
      const { tx } = await P.buildBuy({ user: b.wallet, mint: L.mint, sol });
      const sim = await P.simulate(tx);
      if (sim.err) return res.status(400).json({ error: 'The buy failed simulation. Nothing was sent.', logs: sim.logs });
      return res.json({ tx: P.b64(tx) });
    }
    if (b.action === 'winner-send') {
      const L = await load();
      if (!L.raffle_result) return res.status(400).json({ error: 'No winner.' });
      if (L.status !== 'live') return res.status(400).json({ error: 'The coin is not live yet.' });
      return res.json({ sig: await P.relay(clean(b.tx, 4000), L.raffle_result.winner, L.mint) });
    }

    // ---- schedule ----
    const name = clean(b.name, 32), ticker = clean(b.ticker, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const startIn = Math.min(Math.max(Number(b.start_in_minutes) || 5, 1), 1440), win = Math.min(Math.max(Number(b.window_minutes) || 10, 1), 240);
    if (!name || ticker.length < 2) return res.status(400).json({ error: 'Name and a 2-10 character ticker are required.' });
    const nid = crypto.randomBytes(5).toString('hex');
    const ws = now() + startIn * 60;
    const base = { id: nid, name, ticker, description: clean(b.description, 280), created: now(), window_start: ws, window_seconds: win * 60, raffle: !!b.raffle, signups: [], live: LIVE };
    let L;
    if (LIVE) {
      if (!(await P.isPubkey(b.creator))) return res.status(400).json({ error: 'Connect your wallet first. It becomes the creator and pays for the launch.' });
      const dev = Math.min(Math.max(Number(b.dev_buy_sol) || 0, 0), 5);
      const meta_uri = await P.uploadMetadata({ name, symbol: ticker, description: base.description, imageDataUrl: b.image, twitter: httpUrl(b.twitter), website: httpUrl(b.website) });
      const first = roundAt(ws) + 1, last = roundAt(ws + win * 60);
      L = { ...base, creator: b.creator, dev_buy_sol: dev, meta_uri, first_round: first, last_round: last, scan_next: first, fire_modulus: Math.max(1, Math.floor((last - first + 1) / 2)), status: 'scheduled' };
    } else {
      L = { ...base, creator: (await P.isPubkey(b.creator)) ? b.creator : null, decision_round_target: roundAt(ws) + 1, status: 'scheduled' };
    }
    await putJSON(`launches/${nid}.json`, L, false);
    const idx = (await getJSON('launches/index.json')) || []; idx.unshift(nid); await putJSON('launches/index.json', idx.slice(0, 200), true);
    return res.json(pub(L));
  } catch (e) { return res.status(e.code === 404 ? 404 : 500).json({ error: e.code === 404 ? 'not found' : (e.message || 'server error').slice(0, 160) }); }
}
