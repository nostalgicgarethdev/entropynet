// CI smoke test: modules load, and a produced round signs and verifies.
import crypto from 'node:crypto';
const { privateKey } = crypto.generateKeyPairSync('ed25519');
process.env.ENTROPY_BEACON_KEY = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
process.env.ENTROPY_NODE_MASTER = crypto.randomBytes(32).toString('hex');
const b = await import('../api/_lib/beacon.js');
await import('../api/round.js'); await import('../api/launch.js');
const r = await b.produce(null, { slot: 1, blockhash: '11111111111111111111111111111111' });
const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(r.public_key, 'hex')]), format: 'der', type: 'spki' });
const ok = crypto.verify(null, Buffer.from(b.message(r) + '|' + r.randomness), pub, Buffer.from(r.signature, 'hex'))
  && r.nodes.every(n => crypto.createHash('sha256').update(Buffer.from(n.reveal, 'hex')).digest('hex') === n.commit)
  && crypto.createHash('sha256').update(b.message(r)).digest('hex') === r.randomness;
if (!ok) { console.error('verification failed'); process.exit(1); }
console.log('ok round', r.round);
