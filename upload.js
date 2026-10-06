import { client, check, date, message } from './shared.js';
import { BUCKET } from './config.js';
const form = document.querySelector('#upload-form');
const input = document.querySelector('#photos');
const drop = document.querySelector('#drop-zone');
const previews = document.querySelector('#previews');
const button = document.querySelector('#submit');
const status = document.querySelector('#status');
const receipts = document.querySelector('#receipts');
let db, files = [], urls = [], busy = false;
try { db = client(); } catch (err) { message(status, err.message, true); }
function select(incoming) {
  if (busy) return;
  urls.forEach(URL.revokeObjectURL); urls = []; files = []; previews.replaceChildren();
  const errors = [];
  for (const file of incoming) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { errors.push(`${file.name}: use JPG, PNG or WEBP.`); continue; }
    if (!file.size || file.size > 10 * 1024 * 1024) { errors.push(`${file.name}: maximum 10 MB.`); continue; }
    if (files.length >= 10) { errors.push('Upload up to 10 photos at a time.'); break; }
    files.push(file);
    const url = URL.createObjectURL(file); urls.push(url);
    const figure = document.createElement('figure');
    const image = document.createElement('img'); image.src = url; image.alt = 'Selected photo';
    const caption = document.createElement('figcaption'); caption.textContent = file.name;
    figure.append(image, caption); previews.append(figure);
  }
  button.disabled = !files.length || !db;
  message(status, errors.join(' '), !!errors.length);
}
input.addEventListener('change', () => select(input.files));
for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, e => { e.preventDefault(); if (!busy) drop.classList.add('dragging'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragging'); select(e.dataTransfer.files); });
form.addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !files.length || !db) return;
  busy = true; button.disabled = true; input.disabled = true; receipts.replaceChildren();
  const failed = [];
  try {
    const session = check(await db.auth.getSession()).session;
    if (!session) check(await db.auth.signInAnonymously());
    const user = check(await db.auth.getUser()).user;
    for (const [index, file] of files.entries()) {
      message(status, `Uploading ${index + 1} of ${files.length}…`);
      const id = crypto.randomUUID(), path = `${id}/photo`;
      let created = false;
      try {
        check(await db.from('pub_submissions').insert({ id, user_id: user.id, original_name: file.name })); created = true;
        check(await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '0' }));
        const receipt = check(await db.rpc('finish_pub_submission', { submission_id: id }));
        const li = document.createElement('li'); li.textContent = `${file.name} — received ${date(receipt)}`; receipts.append(li);
      } catch (err) {
        // The finalization response may have been lost after the server committed.
        // Confirm before retrying, so a successful submission is not duplicated.
        let observed = null;
        try { observed = check(await db.from('pub_submissions').select('status,submitted_at').eq('id', id).maybeSingle()); } catch {}
        if (observed && observed.status !== 'uploading') {
          const li = document.createElement('li'); li.textContent = `${file.name} — received ${date(observed.submitted_at)}`; receipts.append(li);
        } else {
          failed.push(file);
          const li = document.createElement('li'); li.className = 'error'; li.textContent = `${file.name}: ${err.message}`; receipts.append(li);
          if (created && observed?.status === 'uploading') {
            // Even a failed upload response may follow a successful server write.
            const cleanup = await db.storage.from(BUCKET).remove([path]);
            const removed = !cleanup.error;
            if (removed) await db.from('pub_submissions').delete().eq('id', id);
          }
        }
      }
    }
    const total = files.length, successful = total - failed.length;
    busy = false; select(failed); input.value = '';
    message(status, failed.length ? `${successful} received; ${failed.length} failed. Retry the remaining photos below.` : `${successful} photo${successful === 1 ? '' : 's'} received. You’re all set!`, !!failed.length);
  } catch (err) {
    message(status, `Upload could not start: ${err.message}`, true);
  } finally {
    busy = false; input.disabled = false; button.disabled = !files.length;
  }
});
