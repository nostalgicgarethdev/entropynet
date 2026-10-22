![entropynet](docs/social-preview.png)

```
--------------------------------------
☆ Sign Everything                    ☆
☆             Trust No Server        ☆
--------------------------------------
EST. OCT 21 2026 · sealed front-ends

visitor@entropynet.space:~ [sealed]
$ entropynet status
[*]    release     a website that stays safe even when its server is hacked
[OK]   threshold   2 of 3 team keys
[OK]   verifier    checking every page, script, style
[fire] /app.js     sha256 mismatch  ->  blocked, reported
```

Live: https://entropynet.space · X: [@entropynet_](https://x.com/entropynet_)

Your team signs every release. Every visitor's browser checks every page, script
and style against that signature and refuses anything else, before it runs.
A hacked server, host or CI can push files. It can't sign them.

## [*] why now · oct 21 2026

The same day, the web stack cracked open:

- **Hosts got popped.** Railway said an unauthorized third party may have accessed encrypted customer environment variables and decrypted some of them, told every user to roll their env vars, and paused deployments. ([Railway disclosure](https://blog.railway.com/p/security-disclosure-wednesday-october-21st))
- **Runtimes got patched.** Node.js released v22.23.4, v24.22.1 and v26.12.1, fixing among others CVE-2026-111497 (Brotli decoder out-of-bounds write, permits RCE), two TLS hostname bypasses (CVE-2026-105483, CVE-2026-106069) and CVE-2026-106074, where `randomUUID()`/`randomInt()` entropy caches got saved into startup snapshots and SEAs so every process repeated the same values. ([nodejs.org](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases))
- **PHP research flooded in.** CVE-2026-109618 / 109619 drew urgent patch advisories ([CISA](https://www.cisa.gov/news-events/alerts/2026/10/21/critical-vulnerabilities-php-require-immediate-patching)). Independent research (J4ck3LSyN, "PHP up 2026") pushes back on the early RCE claims and describes a medium-severity memory-safety bug in prefork SAPIs instead. entropynet makes no claim either way and patches nothing: patch PHP and Node.

Small teams get burned in the gap between leak and patch. In crypto that gap is
where drainers ship: Ledger Connect Kit (2023) and BadgerDAO (2021) were
front-end swaps, the contracts were fine. A sealed front end can't be silently
swapped during that gap. And the defence is free, not a subscription perk.

## [>] quickstart

```sh
npx entropynet seal ./dist --uri https://your.site/seal/release.json
npx entropynet sign ./dist --key ~/keys/alice.json      # on alice's own machine
npx entropynet sign ./dist --key ~/keys/bob.json        # on bob's own machine
npx entropynet anchor ./dist --payer devnet-payer.json  # solana devnet memo
npx entropynet verify ./dist
```

This writes `dist/seal/release.json`. Ship `packages/verifier` (built to `sw.js`
with your `seal.policy.json` pinned inside) with the site and register it.

## [*] how verification works

1. **Seal.** sha256 every file → manifest → `files_root`. Stamp with the latest beacon round. `id = sha256(spec, files_root, round, randomness, created, prev)`.
2. **Sign.** k-of-n ed25519 (Solana) keys sign `entropynet-seal/v1:<id>`. Policy here: 2 of 3.
3. **Anchor.** A Solana memo `entropynet-seal/v1 release=… files=… round=… uri=…` (devnet in v1; mainnet is a switch, off). `POST /api/seal` stores the release only if it meets the threshold, and the newest release id is chained into every following beacon round's signed message.
4. **Verify.** The service worker has the signer keys pinned. It accepts a release only with the threshold of valid signatures and only if it's newer than the one it has. Every page, script, style and worker is hashed on fetch; a mismatch or an unsigned script is blocked, the tab shows a block screen, and signed evidence goes to the public tamper feed (`/api/tamper`).

## [warn] threat model

| attacker has | result |
|---|---|
| your web server (PHP, Node, nginx…) | swapped files blocked in the browser |
| your host account or its env vars | can't sign: seal keys are never stored there |
| a stolen deploy / CI token | can deploy, can't sign → blocked |
| 1 of 3 signing keys | below threshold → blocked |
| an old release replayed | rollback refused, reported |
| DNS/server on a visitor's **first** visit | **not covered** (trust on first use) |
| 2 of 3 signing keys | **not covered** (that's the threshold) |
| a replaced `sw.js` | detected within a minute and reported, not prevented |

**Design rule: seal signing keys never live on the hosting platform.** Not in env
vars, not in CI secrets, not in the build. `scripts/release.mjs` refuses to run if
`VERCEL`, `CI` or `RAILWAY_ENVIRONMENT` is set. Only public keys are deployed.
(The beacon key does live in host env vars: a host breach could forge beacon
rounds, but not a release.)

## [warn] limits

- First visit is TOFU. The verifier pins itself after that.
- A service worker can't fully guard its own updates.
- Non-JS assets outside the manifest (images from other origins) aren't checked.

## [>] roadmap

- Browser extension with the signer keys shipped ahead of time (fixes TOFU).
- Hardware-attested signing (keys in secure elements).
- Mainnet anchoring; outside beacon node operators.

## [*] also in here

- **Beacon** — public randomness every 3 s: commit-reveal across 5 nodes + a finalized Solana block hash, hash-chained, ed25519-signed. Spec: [docs/SPEC.md](docs/SPEC.md).
- **Fair launches** — pump.fun launches timed by the beacon, signed and paid by the creator's own wallet. The server never signs or pays.

## [*] layout

```
packages/cli        npx entropynet seal | sign | anchor | verify
packages/verifier   service worker source + build (policy pinned)
packages/beacon     beacon rounds, storage
packages/launch     pump.fun tx building (unsigned), simulation, relay
api/                vercel functions: round, launch, seal, tamper, health
site/               the static site (sealed)
scripts/            release.mjs (seal the site), check.mjs, seal-test.mjs
```

## [*] api

| | |
|---|---|
| `GET /api/round/latest`, `/api/round/:n`, `/api/round/info` | beacon |
| `GET /api/seal/latest`, `POST /api/seal` | sealed releases |
| `GET /api/tamper`, `/api/tamper/:id`, `POST /api/tamper` | tamper feed |
| `GET /api/launch`, `/api/launch/:id` | launches |
| `GET /api/health` | Node runtime version, patched or not |

`npm test` runs the beacon check and the seal tests. CI example: `docs/ci.yml.example`.
See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md). License: MIT.
