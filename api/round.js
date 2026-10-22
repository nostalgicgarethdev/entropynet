import { latest, getRound, roundAt, PERIOD, GENESIS, NODES, publicKeyHex } from '../packages/beacon/beacon.js';
export default async function handler(req, res) {
  try {
    const q = req.query.n;
    if (q === 'info') {
      res.setHeader('cache-control', 's-maxage=60');
      return res.json({ name: 'EntropyNet beacon', version: 1, period_seconds: PERIOD, genesis: GENESIS, nodes: NODES, public_key: publicKeyHex(), signature: 'ed25519', current_round_by_clock: roundAt(),
        message_format: 'entropynet/v1|round|prev_round|prev_randomness|mix|slot|blockhash|time ; randomness=sha256(message) ; signature=ed25519(message+"|"+randomness) ; mix=sha256(concat(reveal bytes)) ; commit=sha256(reveal bytes)' });
    }
    if (!q || q === 'latest') {
      const r = await latest();
      res.setHeader('cache-control', 'no-store');
      return res.json(r);
    }
    const n = Number(q);
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'bad round' });
    const r = await getRound(n);
    if (!r) return res.status(404).json({ error: 'round not published (rounds are only published while the beacon is being read; gaps are recorded in `skipped`)' });
    res.setHeader('cache-control', 'public, s-maxage=31536000, immutable');
    return res.json(r);
  } catch (e) { return res.status(503).json({ error: 'beacon busy, retry', detail: String(e.message || e).slice(0, 120) }); }
}
