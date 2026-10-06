# FUSAB PUB point photos

A photo-only submission form for GitHub Pages and Squarespace, with a separate admin review page. Your Supabase project URL and public browser key are already configured. No names, email fields or activity fields appear on the member form.

## 1. Set up Supabase

1. Open your project at https://supabase.com/dashboard/project/kfkzgamzxlcwyyuhgxnb.
2. Open **SQL Editor**, create a new query, paste all of `setup.sql`, and run it. This creates the private photo bucket, submission records and permissions.
3. In **Authentication**, find the setting for **Anonymous Sign-Ins** and enable it. Members will not see a login screen. Supabase creates an anonymous session behind the scenes. Leave email/password sign-in enabled for your admin login. Anonymous users cannot promote themselves to reviewers.
4. Open **Authentication → Users → Add user → Create new user**. Enter your own email and a strong password. Enable **Auto Confirm User** if offered. Do not send your password to anyone or put it in GitHub.
5. Copy that new user's UUID. Run this second query in SQL Editor, replacing the placeholder:

```sql
insert into public.pub_admins(user_id)
values ('YOUR-ADMIN-USER-UUID')
on conflict do nothing;
```

The UUID is the user's ID from Authentication, not the project ID. Use the same query for an additional reviewer if needed.

## 2. Publish on GitHub Pages

1. Create a repository called **pub-points**. A public repository supports GitHub Pages on GitHub Free. These files contain only a publishable browser key; row and storage policies protect the photos. Never add a Supabase secret/service-role key.
2. Upload the **contents of this folder**, so `index.html` sits at the repository root. Do not upload the ZIP itself. Include `admin.html`, the JavaScript files, CSS and `.nojekyll`. The SQL and README can also remain in the repository.
3. Open **Settings → Pages**. Select **Deploy from a branch**, branch **main**, folder **/(root)**, then Save.
4. Wait for GitHub Pages to publish. Your form URL will be `https://YOUR-USERNAME.github.io/pub-points/`.
5. Your private review dashboard is `https://YOUR-USERNAME.github.io/pub-points/admin.html`. Bookmark this and open it in a normal browser tab. You must sign in with the admin account you created above. Refreshing signs you out; admin credentials and sessions are not stored in localStorage.

If you use a different repository name, change the URL in the embed accordingly. Relative asset paths support GitHub project pages.

## 3. Embed in Squarespace

Edit `squarespace-embed.html`: replace YOUR-USERNAME with your GitHub username. Paste the iframe into a **Code block** in HTML mode on the desired Squarespace page. Your Squarespace plan must support iframe/custom JavaScript code. Check the published page; embedded scripts may not run normally in editor preview.

The iframe has a fixed 850px height with internal scrolling when needed. Adjust the height if your page needs a different size.

## 4. Review and delete

1. Open `admin.html` and sign in.
2. In **Needs review**, click a photo to see it full size. Its automatically recorded timestamp is shown in Eastern time.
3. Add the points manually in Pointagram. This application does not connect to or change Pointagram.
4. Click **Mark recorded in Pointagram** and confirm.
5. Change the filter to **Recorded in Pointagram**.
6. Click **Delete photo** and confirm. This removes the photo from Supabase Storage. The submission timestamp, original filename and review/deletion timestamps remain as a small processing record.

Each photo is its own submission. Up to 10 photos can be sent together; success receipts identify which arrived. Failed photos remain selected for retry. A database timestamp is recorded when each uploaded photo is finalized, not from the member's computer clock.

No member identity is collected, so you identify whose points to award from the photo itself. Deleted photos cannot be recovered through this app. Private preview links expire after 10 minutes; refresh the queue to renew them. A previously downloaded or cached photo cannot be recalled by deletion.

## 5. Check before sharing

- Upload a JPG, PNG or WEBP photo on the published form. HEIC is not supported; export it as JPG first. File limit: 10 MB each.
- Verify the timestamp and full photo in your admin dashboard.
- Verify a browser signed out of the dashboard cannot read submissions or open private photos directly.
- Mark the test submission recorded, delete it, and verify it moves to **Photos deleted** and is absent from **Storage → pub-photos**.
- Test the form on your published Squarespace page, including a phone.

## Notes for operation

Members do not authenticate with a Furman identity: anyone who has the form link can submit. Anonymous sign-in has Supabase's default rate limits. For a publicly promoted form, consider enabling Supabase CAPTCHA and adding the matching invisible/challenge widget before launch; this version does not send a CAPTCHA token and cannot submit if CAPTCHA is required. Account-based university access would require a different flow.

An interrupted browser upload can leave an `uploading` record and possibly a photo outside the review queue. Occasionally inspect old rows with `status = 'uploading'` in the Table Editor. Remove any matching `<submission UUID>/photo` file through the Supabase Storage dashboard first, then remove the stale database row. Never delete rows directly from `storage.objects` using SQL; use the Storage dashboard/API to remove actual bytes.

Anonymous Auth user records remain after photo deletion. Do not bulk-delete Auth users referenced by submissions; the foreign key preserves the audit trail. Backups, logs or copies outside this app follow their own retention settings.

Only the supplied project URL and publishable key are available here. SQL installation, admin creation, live backend verification and GitHub deployment still require your dashboard access. Local checks validate syntax and simulated upload/review behavior, not a live deployment.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `upload.js` | Member upload form |
| `admin.html`, `admin.js` | Private review dashboard |
| `shared.js`, `config.js`, `styles.css` | Shared code, project settings, styling |
| `setup.sql` | Database and private storage access rules |
| `squarespace-embed.html` | Iframe snippet |
| `.nojekyll` | GitHub Pages static-file handling |

The browser client uses the pinned Supabase JavaScript SDK 2.95.3 from jsDelivr. Photos are never committed to GitHub. Storage is private; the published admin HTML is protected by Supabase authentication and server-enforced reviewer permissions.
