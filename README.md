# Summit Ski & Bike

**Live:** https://summitskibike.com. See [LAUNCH-STATUS.md](LAUNCH-STATUS.md) for verified launch results, backups, and remaining HostGator cancellation scope.

The completed [UI/UX and security audit](UI-SECURITY-AUDIT.md) records fixes, test evidence, and scope. Run `npm run audit:site` after building to verify page links, landmarks, and CSP hashes.

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
- `private-backup/`: local-only original HTML/media and unused migration files. Ignored by Git and Vercel. Includes a fresh 409 MiB WordPress .wpress backup with SHA-256 and both inquiry CSV exports (221 winter + 6 summer). The backup has not been restore-tested; mailbox preservation is still pending.

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

The full WordPress backup and both MetForm inquiry exports (221 winter + 6 summer) are saved privately. Before cancellation, preserve mailbox contents/aliases if any exist and restore-test the backup. Historical imports must never send notifications; the database includes `legacy_id` and `imported_at` for a controlled import if needed.

Move incoming `info@summitskibike.com` mail to Cloudflare Email Routing forwarding to the verified Gmail destination. Replace HostGator MX only after mail preservation. Resend sending authentication belongs on its own subdomain and does not replace the root receiving MX. Confirm forwarding and replies independently before removing HostGator.

Cloudflare currently hosts DNS; AWS holds registration. Preserve the full zone and origin/proxy settings. Update both apex and www, which currently has a separate broken QUIC.cloud target. Point only the website records to the exact targets returned by Vercel. Keep AWS registration. No production DNS or hosting cancellation has been performed by the local build.

## Deployment status (2026-11-07)

GitHub main is deployed at https://summit-ski-bike.vercel.app on the correct Vercel Hobby team. Neon Free `summit-archive` is connected through Vercel and both schema tables are initialized. The Resend sending subdomain is verified; a sending-only key restricted to that subdomain is stored in Vercel. Free Turnstile is configured for the apex, www, and stable Vercel address. Production settings exclude localhost. Historical inquiries remain in private local exports; no historical notifications have been sent. The owner approved website and mail cutover. Apex/www now point DNS-only to the exact Vercel target; Cloudflare Email Routing is enabled and ready. HostGator cancellation remains separate.

Controlled live test `SSB-22BBB2A0` passed: a real Turnstile check, one persisted inquiry, one owner delivery ID, and one client delivery ID. Resend reports both messages delivered to the approved Gmail address. Retrying the same saved inquiry after a provider rejection did not create another inquiry. Actual mailbox rendering/replies and explicit token replay rejection remain to be checked. `SITE_URL` is now set to the canonical apex.

Cloudflare forwarding destination `summitskibike@gmail.com` is verified. The exact-address rule for `info@summitskibike.com` is saved (rule `1a40349881d4481698c01941b9c9ead5`). Zone routing is enabled; public MX records now use Cloudflare. Root SPF authorizes Cloudflare routing. Independent forwarding delivery remains to be checked. No catch-all was created.

## Remaining release gates

- Review the preview and branded email designs.
- Inbound forwarding was verified in Gmail. The owner confirmed old HostGator mailbox messages are not needed.
- Restore-test the complete backup; reconcile private historical exports if importing.
- Verify email-client rendering/replies and CAPTCHA token replay rejection.
- Newsletter signup was replaced with an archive/contact message at the owner's request; no Mailchimp service is required.
- Custom-domain HTTPS and receiving-mail checks passed. HostGator cancellation remains separate.

Customer browser appearance has been checked locally. Actual Gmail/Outlook/Apple Mail rendering and delivery still require controlled email tests. Email logos use PNG for broad mail-client compatibility; website photography uses optimized WebP where it saves space.
