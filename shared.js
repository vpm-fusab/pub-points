import { PROJECT_URL, PUBLISHABLE_KEY } from './config.js';
export function client() {
  if (!window.supabase) throw new Error('The connection library did not load. Refresh and try again.');
  // No localStorage dependency: works inside an iframe and signs admins out on refresh.
  return window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const request = new Request(input, init);
      // Publishable keys belong in apikey, never in the user-JWT header.
      if (request.headers.get('Authorization') === `Bearer ${PUBLISHABLE_KEY}`) {
        request.headers.delete('Authorization');
      }
      return fetch(request);
    } }
  });
}
export function check(result) { if (result.error) throw result.error; return result.data; }
export function date(value) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York',
    dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' ET';
}
export function message(node, text, error = false) {
  node.textContent = text;
  node.classList.toggle('error', error);
}
