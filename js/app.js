// ── Main app entry point ──

import { navigate } from './ui.js';

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Boot
navigate('home');
