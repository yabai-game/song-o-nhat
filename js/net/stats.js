// Play statistics through GoatCounter (owner request): no cookies, no personal data — only anonymous counts of
// page views and a few milestones (new game, job picked, first payday, seasons reached, load time).
// count.js loads async from index.html with no_onload; calls made before it arrives wait in a small queue.
// GoatCounter itself ignores localhost, so local testing never counts.
const queue = [];
let timer = 0;
function flush() {
  const gc = window.goatcounter;
  if (!gc || typeof gc.count !== 'function') return false;
  while (queue.length) { try { gc.count(queue.shift()); } catch { /* blocked or offline: drop it */ } }
  return true;
}
function send(v) {
  queue.push(v);
  if (flush() || timer) return;
  let tries = 0;
  timer = setInterval(() => { if (flush() || ++tries > 40) { clearInterval(timer); timer = 0; } }, 500);
}
/** one page view for this visit */
export function pageview() { send({ path: location.pathname.replace(/[^/]*$/, '') || '/', title: document.title }); }
/** an event, e.g. track('new-game-site', 'Bắt đầu mới · Xây dựng') */
export function track(name, title = name) { send({ path: name, title, event: true }); }
