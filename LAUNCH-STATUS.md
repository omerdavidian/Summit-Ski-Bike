# Launch status — November 7, 2026

The owner approved website/mail cutover, confirmed old mailbox messages are not needed, and approved replacing newsletter signup with archive contact information.

## Live setup

- https://summitskibike.com serves the Astro archive from Vercel Hobby.
- https://www.summitskibike.com permanently redirects to the apex (308), preserving the requested path.
- Neon Free is connected through Vercel for private inquiries and shared rate counters.
- Resend sends branded owner/client notifications from the verified `messages.summitskibike.com` subdomain using a sending-only domain-restricted key.
- Turnstile checks the real token, action, and allowed hostname before saving inquiries.
- Cloudflare forwards `info@summitskibike.com` to verified `summitskibike@gmail.com`. Root MX and SPF no longer depend on HostGator.
- Newsletter signup was replaced with an archive/contact message on all five original pages.
- AWS remains the registrar; Cloudflare remains the authoritative DNS provider.

## Observed launch checks

- Valid HTTPS on the main domain and www; Vercel reports both domains configured correctly.
- Home, touring, all three legal pages, search, email PNG logo, and form configuration return HTTP 200. An unknown page returns the custom 404.
- Main-domain test `SSB-614F3E55` passed real Turnstile and returned a success reference. Both branded messages were observed in the actual Gmail inbox. The client email includes the logo, original message, closure notice, and correct Gmail reply button.
- A separate authorized forwarding test sent to `info@summitskibike.com` arrived in the Gmail inbox.
- At 390px, the live page has `innerWidth = clientWidth = scrollWidth = 390`. Earlier checks covered the summer and legal pages too. Proof: local-only `private-backup/launch-mobile.jpg`.
- Production source commit `8a2e998` includes the archive footer. Build and asset audit pass; 205 asset references checked, none missing and none dependent on remote WordPress assets. Backend suite: 19 tests passing before launch.

## Local preservation and remaining scope

All files are under `C:\Coding\Summit Ski Bike`. Private backups are ignored by Git and Vercel: the full 409 MiB WordPress `.wpress` archive with SHA-256, 221 winter plus 6 summer inquiry CSV records, original media, and DNS snapshots before migration and cutover. The full WordPress archive has not been restore-tested.

HostGator cancellation is separate and has not been performed. The live website and `info@` receiving mail no longer depend on it. Legacy service DNS names such as ftp, ssh, and mail still reference the prior host and are not used by the replacement. Keep the private snapshots for rollback before removing any remaining legacy records.

Gmail rendering and receiving were checked. Other email clients, an outgoing human reply, and explicit live token replay rejection were not separately exercised. Provider-failure recovery, duplicate prevention, Reply-To headers, and CAPTCHA rejection are covered by backend tests.
