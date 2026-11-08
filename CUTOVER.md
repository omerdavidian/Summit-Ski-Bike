# Prepared cutover

Prepared November 7, 2026. Await final owner approval before website or receiving-mail DNS changes.

## Verified replacement

- Vercel Hobby project: `summit-ski-bike/summit-ski-bike`.
- Live preview: https://summit-ski-bike.vercel.app.
- Commit `af88c9a` deployed successfully.
- Neon Free connected through Vercel; inquiry and rate-limit tables initialized.
- Controlled inquiry `SSB-22BBB2A0`: exactly one database row and both delivery IDs. Resend reports both test messages delivered to the approved Gmail address.
- Both landing pages and all legal pages have no horizontal overflow after loading at 390px.
- Resend sending subdomain is verified and uses a domain-restricted sending key.
- Gmail destination is verified; Cloudflare rule `1a40349881d4481698c01941b9c9ead5` matches only `info@summitskibike.com` and forwards to `summitskibike@gmail.com`. Zone mail routing remains disabled.

## Website DNS targets

Both owned domains are assigned to the Vercel project. Vercel supplied these exact targets on its domain configuration screen:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | @ | b114d7ffe3db9e09.vercel-dns-017.com | Off |
| CNAME | www | b114d7ffe3db9e09.vercel-dns-017.com | Off |

Cloudflare supports apex CNAME flattening. Re-check Vercel's requirements immediately before applying; do not guess an IP. Preserve AWS registration and Cloudflare nameservers. Existing wildcard/mail/other service records need individual review before removing HostGator.

## Receiving mail

Preserve needed HostGator mailbox history before changing MX. The full WordPress backup does not include mailbox messages. Retrieve the current required Email Routing records from Cloudflare immediately before enabling routing. Resolve the existing HostGator MX and SPF conflicts deliberately; avoid publishing multiple root SPF records. Preserve the separate Resend subdomain authentication.

## After approval

1. Save a fresh private DNS snapshot (the original is already in `private-backup/dns-before-migration.json`).
2. Apply only the approved apex/www records, DNS-only. Confirm Vercel verification and valid HTTPS.
3. Move incoming mail only when mailbox preservation is settled. Confirm forwarding from an independent sender and a reply from Gmail.
4. Set Vercel `SITE_URL=https://summitskibike.com` and redeploy. Re-test the real contact flow and email logo URL on the custom domain.
5. Confirm old URLs, redirects, legal pages, search, galleries, navigation, and both seasonal forms.
6. Resolve newsletter preference; it is currently unavailable rather than silently accepting signups.
7. Retire HostGator only after independent site/mail checks and the owner's cancellation decision.

## Rollback

Use the private DNS snapshot to restore the prior apex, www, MX, and SPF records and their proxy settings. Keep the WordPress origin and hosting intact during verification. The original www target was broken at audit, so rollback to it restores the prior state rather than fixing it. Keep the complete `.wpress` backup, SHA-256, 227 private inquiry exports, and original media outside Git. The full backup has not been restore-tested yet.
