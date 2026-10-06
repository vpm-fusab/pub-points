import { client, check, date, message } from './shared.js';
import { BUCKET } from './config.js';
const login = document.querySelector('#login'), dashboard = document.querySelector('#dashboard');
const queue = document.querySelector('#queue'), filter = document.querySelector('#filter');
const status = document.querySelector('#status'), more = document.querySelector('#more');
let db, offset = 0, loading = false;
try { db = client(); } catch (err) { message(status, err.message, true); }
login.addEventListener('submit', async e => {
  e.preventDefault(); if (!db) return;
  const button = login.querySelector('button'); button.disabled = true;
  try {
    check(await db.auth.signInWithPassword({ email: document.querySelector('#email').value.trim(), password: document.querySelector('#password').value }));
    if (!check(await db.rpc('is_pub_admin'))) { await db.auth.signOut(); throw new Error('This account has not been added as a PUB reviewer.'); }
    document.querySelector('#password').value = '';
    login.hidden = true; dashboard.hidden = false; await load(true);
  } catch (err) { message(status, err.message, true); }
  finally { button.disabled = false; }
});
document.querySelector('#logout').addEventListener('click', async () => {
  try { check(await db.auth.signOut()); dashboard.hidden = true; login.hidden = false; queue.replaceChildren(); message(status, 'Signed out.'); }
  catch (err) { message(status, err.message, true); }
});
document.querySelector('#refresh').addEventListener('click', () => load(true));
filter.addEventListener('change', () => load(true)); more.addEventListener('click', () => load(false));
function p(text, className = '') { const node = document.createElement('p'); node.textContent = text; node.className = className; return node; }
function action(label, task) {
  const button = document.createElement('button'); button.textContent = label;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await task(); } catch (err) { message(status, err.message, true); }
    finally { button.disabled = false; }
  }); return button;
}
async function card(row) {
  const article = document.createElement('article'); article.className = 'submission';
  article.append(p(date(row.submitted_at), 'eyebrow'), p(row.original_name, 'filename'), p(`Submission ${row.id.slice(0, 8)}`, 'small'));
  if (row.status !== 'deleted') {
    try {
      const data = check(await db.storage.from(BUCKET).createSignedUrl(`${row.id}/photo`, 600));
      const link = document.createElement('a'); link.href = data.signedUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'Open full photo in new tab');
      const image = document.createElement('img'); image.src = data.signedUrl; image.alt = 'PUB proof'; image.loading = 'lazy';
      image.addEventListener('error', () => { image.alt = 'Photo could not load. Refresh to retry.'; });
      link.append(image); article.append(link);
    } catch (err) { article.append(p(`Preview unavailable: ${err.message}`, 'error')); }
    article.append(p('Click the photo to open full size. Links expire after 10 minutes; refresh to renew.', 'small'));
    const actions = document.createElement('div'); actions.className = 'actions';
    if (row.status === 'submitted') actions.append(action('Mark recorded in Pointagram', async () => {
      if (!confirm('Have you added these points to Pointagram?')) return;
      check(await db.rpc('record_pub_submission', { submission_id: row.id })); await load(true);
      message(status, 'Marked recorded in Pointagram.');
    }));
    if (row.status === 'recorded') {
      article.append(p(`Recorded ${date(row.recorded_at)}`, 'small'));
      const del = action('Delete photo', async () => {
        if (!confirm('Permanently delete this photo? The submission timestamp and review record will remain.')) return;
        // Remove bytes using the Storage API, then finalize the database record.
        // Retrying is safe if the first deletion succeeded but its response was lost.
        check(await db.storage.from(BUCKET).remove([`${row.id}/photo`]));
        check(await db.rpc('finish_pub_deletion', { submission_id: row.id }));
        await load(true); message(status, 'Photo deleted.');
      }); del.className = 'danger'; actions.append(del);
    }
    article.append(actions);
  } else article.append(p(`Photo deleted ${date(row.deleted_at)}`, 'small'));
  return article;
}
async function load(reset) {
  if (loading) return; loading = true;
  const refresh = document.querySelector('#refresh'); refresh.disabled = true; filter.disabled = true; more.disabled = true;
  try {
    message(status, 'Loading submissions…');
    const start = reset ? 0 : offset;
    const result = await db.from('pub_submissions').select('*', { count: 'exact' }).eq('status', filter.value)
      .order('submitted_at', { ascending: true }).order('id', { ascending: true }).range(start, start + 23);
    const rows = check(result);
    const cards = await Promise.all(rows.map(card));
    if (reset) queue.replaceChildren(); queue.append(...cards); offset = start + rows.length;
    more.hidden = offset >= result.count;
    document.querySelector('#count').textContent = `${result.count} submission${result.count === 1 ? '' : 's'}`;
    message(status, result.count ? '' : 'Nothing here yet.');
  } catch (err) { message(status, err.message, true); }
  finally { loading = false; refresh.disabled = false; filter.disabled = false; more.disabled = false; }
}
