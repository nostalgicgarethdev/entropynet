// Reports the Node runtime the functions are running on, so anyone can check it's a patched line.
export default function handler(req, res) {
  const [maj, min, pat] = process.versions.node.split('.').map(Number);
  const fixed = { 22: [23, 4], 24: [22, 1], 26: [12, 1] }[maj];   // nodejs.org oct 21 2026 security releases
  const patched = !!fixed && (min > fixed[0] || (min === fixed[0] && pat >= fixed[1]));
  res.setHeader('cache-control', 'no-store');
  res.json({ node: process.version, patched_oct_2026: patched, region: process.env.VERCEL_REGION || null });
}
