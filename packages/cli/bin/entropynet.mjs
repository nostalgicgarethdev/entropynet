#!/usr/bin/env node
// entropynet CLI: seal a static front-end so browsers refuse anything the team didn't sign.
//   npx entropynet seal ./dist [--uri https://your.site] [--beacon https://entropynet.space]
//   npx entropynet sign ./dist --key signer.json        (each signer runs this with their own key)
//   npx entropynet anchor ./dist --payer payer.json [--cluster devnet]
//   npx entropynet verify ./dist [--policy seal.policy.json]
import fs from 'node:fs';
import path from 'node:path';
import * as S from '../lib/seal.mjs';

const [cmd, dir = '.', ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const relFile = path.join(dir, S.RELEASE_PATH);
const read = () => JSON.parse(fs.readFileSync(relFile, 'utf8'));
const write = (r) => { fs.mkdirSync(path.dirname(relFile), { recursive: true }); fs.writeFileSync(relFile, JSON.stringify(r, null, 1)); };
const policy = () => JSON.parse(fs.readFileSync(opt('policy', 'seal.policy.json'), 'utf8'));

try {
  if (cmd === 'seal') {
    let prev = null; try { prev = read().id; } catch {}
    const r = await S.draft(dir, { beaconUrl: opt('beacon', 'https://entropynet.space'), prev, uri: opt('uri', '') });
    write(r);
    console.log(`sealed ${Object.keys(r.files).length} files\nrelease ${r.id}\nfiles   ${r.files_root}\nbeacon  round ${r.beacon.round}\nnext: each signer runs  npx entropynet sign ${dir} --key <their key>`);
  } else if (cmd === 'sign') {
    const r = S.sign(read(), opt('key')); write(r);
    console.log(`signed by ${r.signatures.at(-1).signer} (${r.signatures.length} signature${r.signatures.length > 1 ? 's' : ''})`);
  } else if (cmd === 'anchor') {
    const pol = policy(); const c = S.check(read(), pol);
    if (!c.ok) throw new Error('not ready to anchor: ' + c.reasons.join('; '));
    const r = await S.anchor(read(), opt('payer'), { cluster: opt('cluster', 'devnet') }); write(r);
    console.log(`anchored on ${r.anchor.cluster}: ${r.anchor.tx}`);
  } else if (cmd === 'verify') {
    const c = S.check(read(), policy(), dir);
    console.log(c.ok ? `OK  ${c.valid.length} valid signatures, every file matches` : 'FAIL\n  ' + c.reasons.join('\n  '));
    process.exit(c.ok ? 0 : 1);
  } else {
    console.log('usage: entropynet seal|sign|anchor|verify <dir> [options]'); process.exit(cmd ? 1 : 0);
  }
} catch (e) { console.error('error: ' + e.message); process.exit(1); }
