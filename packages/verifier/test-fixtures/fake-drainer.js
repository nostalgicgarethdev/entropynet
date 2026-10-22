/*  FAKE "DRAINER" FOR THE ENTROPYNET TAMPER TEST.
    This file is harmless. It contains no wallet code and does nothing.
    The server swaps it in for /tamper-test/wallet-widget.js after the release was sealed,
    to show that the browser refuses a file the team never signed.            */
console.warn('[entropynet] fake drainer ran. If you can read this, the seal did not block it.');
window.__entropynetWidget = 'FAKE DRAINER (harmless) ran';
