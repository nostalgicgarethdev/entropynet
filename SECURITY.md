# Security

Report vulnerabilities privately via GitHub security advisories on this repo, or DM [@entropynet_](https://x.com/entropynet_). Please don't open public issues for them.

## Key handling rules
- Seal signing keys (k-of-n) live only on signers' own machines or hardware. Never in hosting env vars, CI secrets, the repo or the build.
- `scripts/release.mjs` refuses to run when `VERCEL`, `CI` or `RAILWAY_ENVIRONMENT` is set.
- Only public keys (`seal.policy.json`) are deployed. Rotating a signer means a new policy, shipped in a release signed under the old policy.
- The beacon signing key and node master are server secrets. A host breach could forge beacon rounds; roll them if the host is compromised. It cannot forge a sealed release.
- The server never holds a wallet key and never signs a Solana transaction for users.

## Runtime
Functions run on Node 24.x. `GET /api/health` reports the exact version and whether it includes the Oct 21, 2026 Node.js security fixes (24.22.1+).
