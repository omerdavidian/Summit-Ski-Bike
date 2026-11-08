# Summit Ski & Bike

Static recreation of the former Summit rental website, with a working contact backend and branded owner/customer email templates. The original design is retained; the archive notice reflects that rentals have ended.

## Local development

Working folder: `C:\Coding\Summit Ski Bike`.

```powershell
npm install
npm run build
npm run preview
```

Open http://127.0.0.1:4321/. The included project-local Node runtime meets Astro's current minimum without changing the machine's Node installation. `npm run dev` runs Astro's frontend development server; `npm run preview` also serves the Vercel-compatible API handlers and local-only email previews.

Email previews (fictional sample details, no messages sent):

- http://127.0.0.1:4321/__preview/email/owner
- http://127.0.0.1:4321/__preview/email/client
- Add `?season=summer` for the green touring variant.

## Source layout

- `src/content/`: captured page content, metadata, and layout markup. Edit these versioned files for normal content changes.
- `src/pages/`: Astro page generation and 404.
- `src/scripts/site.js`: menu, slideshows, masonry gallery, dialogs, FAQs, and form submission.
- `public/`: self-hosted optimized images, fonts, layout CSS, sitemap, and robots.
- `api/`: Vercel Node function entrypoints.
- `lib/`: inquiry validation, durable storage, email templates, and provider calls.
- `db/schema.sql`: Neon inquiry history and free-tier rate counters.
- `private-backup/`: local-only original HTML/media and unused migration files. Ignored by Git and Vercel. This is **not** yet a full WordPress/database/mail backup.

The migration utilities under `scripts/` capture and prepare the original site. They are not part of a normal build and should not be rerun over edited content. `migration-report.json` records image dimensions and byte savings. Originals are retained privately. Useful original image paths redirect to their optimized WebP equivalents.

## Free deployment configuration

Use the Vercel `summit-ski-bike` Hobby team associated with `summitskibike@gmail.com`. Keep this archive noncommercial, with the closure notice visible. The local Vercel CLI currently belongs to a **different** account/team and must not be used to deploy this project unless it is switched to the intended account.

1. Import `omerdavidian/Summit-Ski-Bike` into the intended Vercel team.
2. Through Vercel Storage/Marketplace, connect **Neon Free** to this project. No separate Neon plugin is needed. Use the injected `DATABASE_URL`.
3. Run `db/schema.sql` in the connected database's SQL editor. Keep the database private; no browser database credentials.
4. Add the nonpublic settings documented in `.env.example` through Vercel environment settings. Use a verified sending subdomain in Resend Free, such as `messages.summitskibike.com`.
5. Create a Turnstile widget for the exact deployed hostnames and set its public key, secret, and server hostname allowlist. Production must exclude localhost. The backend checks success, action, and hostname and fails closed.
6. Configure the existing Mailchimp audience only if the account remains on a free plan. Otherwise leave signup explicitly unavailable pending an approved replacement. Do not silently subscribe existing unsubscribed contacts.
7. Deploy a preview and test delivery to the owner and a controlled visitor address before changing the live domain.

No paid plans, trial upgrades, or metered overages are authorized. The contact service caps new inquiries at 40/day and 5 per client per hour; this reserves headroom below Resend Free's 100 emails/day and 3,000/month. Other use of the same Resend account also consumes quota. When free capacity or a provider is unavailable, the form reports failure and offers the Gmail address.

New inquiries persist before email is attempted. Owner/client delivery IDs and a short delivery lock permit retries without resending completed notifications. Resend idempotency keys cover uncertain requests within its 24-hour window; older uncertain deliveries require owner review. A failed email is not described as delivered. Data access and CSV export are available through the owner's Neon console; no public inquiry endpoint exists.

## Checks

```powershell
npm test
npm run build
npm run audit:assets
npm audit
```

Backend tests cover input rejection, HTML escaping, CAPTCHA verification, origin checks, save-before-send, Reply-To routing, duplicates, and recovery after a partial provider failure. These are mocked provider tests, not proof of actual email delivery. Asset checks verify that pages, CSS, fonts, images, and slides have local files and no remote WordPress asset dependencies.

## HostGator removal

Before cancellation, obtain a fresh complete WordPress/database backup, export both MetForm inquiry sets (currently 221 winter + 6 summer at audit), and preserve mailbox contents/aliases if any exist. Historical imports must never send notifications; the database includes `legacy_id` and `imported_at` for a controlled import after inspecting the actual export structure.

Move incoming `info@summitskibike.com` mail to Cloudflare Email Routing forwarding to the verified Gmail destination. Replace HostGator MX only after mail preservation. Resend sending authentication belongs on its own subdomain and does not replace the root receiving MX. Confirm forwarding and replies independently before removing HostGator.

Cloudflare currently hosts DNS; AWS holds registration. Preserve the full zone and origin/proxy settings. Update both apex and www, which currently has a separate broken QUIC.cloud target. Point only the website records to the exact targets returned by Vercel. Keep AWS registration. No production DNS or hosting cancellation has been performed by the local build.

## Remaining release gates

- Review the preview and branded email designs.
- Confirm the Vercel Hobby project and Neon Free integration.
- Configure and test Resend, Turnstile, database schema, and inbound forwarding.
- Export/reconcile historical inquiries and a complete restorable backup.
- Verify real message delivery and CAPTCHA token replay rejection.
- Approve the production domain switch, then retire HostGator after independent site/mail checks.

Customer browser appearance has been checked locally. Actual Gmail/Outlook/Apple Mail rendering and delivery still require controlled email tests. Email logos use PNG for broad mail-client compatibility; website photography uses optimized WebP where it saves space.
