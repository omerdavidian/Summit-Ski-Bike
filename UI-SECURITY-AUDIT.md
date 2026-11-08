# UI/UX and security audit — November 7, 2026

Scope: the public Summit archive, all five original pages, search/404, client interactions, Vercel API code, inquiry storage/delivery logic, dependencies, and migration-related DNS. Findings below were fixed; this report does not certify all third-party accounts or the retired WordPress installation.

## UI and accessibility fixes

- Touring navigation is white at rest and green on hover or keyboard focus, matching the ski page's seasonal behavior. Mobile menus use dark text on their light background.
- Legal-page header links now lead to the ski landing page's real sections. The empty Ski Safety Act link now leads to the Colorado legislature's statute index. External-window links have explicit `noopener noreferrer`.
- Skip navigation focuses a real main landmark. Legacy unused WordPress drawers were removed. Mobile controls have descriptive names, `aria-controls`/expanded state, hidden-menu inertness, Escape dismissal, and a keyboard focus trap. Resizing to desktop releases the drawer scroll lock.
- Visible focus outlines, accessible social/video labels, semantic FAQ buttons, tap-to-call links, and a no-JavaScript email fallback were added.
- Media dialogs lock background scrolling and return focus to their opener after closing. Gallery keyboard dismissal was exercised in the browser.
- Automatically changing hero photos now have a pause/resume control and retain reduced-motion support. The first photo is in the built HTML so it can load before JavaScript.
- Primary buttons and form links use darker shades for readable contrast. White CTA text improved from 2.65:1 (blue) / 3.88:1 (green) to 5.76:1 / 5.69:1 against the new button backgrounds.
- Narrow contact cards use Turnstile's compact widget, including when resized. At 320px the card has 240px of content width, so the previous 300px widget would not fit.
- Form requests have a timeout and clearer connection/spam-check messages. Search has better spacing, focus indicators, and an empty-query prompt. The local preview now accepts API URLs with trailing slashes.
- Privacy text now describes the actual archive/contact services instead of reservations, payment collection, and newsletter marketing. This is a factual implementation update, not a legal compliance certification.

## Security fixes

- Preparsed JSON strings and objects both enforce the 16KB limit. Arrays, invalid content types, invalid UUIDs, control characters in email addresses, and unsupported topic values are rejected before database/email access.
- Per-client throttling runs before the shared daily allowance, preventing an already-blocked client from draining the daily quota. Counters saturate instead of increasing without bound.
- The retired newsletter API returns 410 and cannot reach Mailchimp, even if old provider environment settings remain.
- Built HTML contains an enforced CSP with hashes for exact inline scripts; arbitrary inline JavaScript and eval are not allowed. Resources are limited to the site's files, Turnstile, and the privacy-enhanced YouTube frame. Inline CSS remains allowed to preserve the existing design.
- Vercel headers additionally forbid embedding, plugin objects, cross-origin base URLs, and off-site form destinations. Existing nosniff, referrer, permissions, HTTPS, and no-store API protections remain.
- Removed 11 obsolete HostGator records: wildcard/service aliases, old apex NS records, and the old DKIM selector. A complete pre-cleanup DNS snapshot is privately saved at `private-backup/dns-before-security-cleanup.json`. AWS registration and Cloudflare authoritative nameservers are unchanged.
- After confirming Gmail's delivered test was mailed by `rsend.messages.summitskibike.com` and signed by `messages.summitskibike.com`, DMARC was changed from monitoring to reject unauthenticated domain/subdomain mail, retaining relaxed alignment for the verified sender. New unrelated senders must be authenticated before being used.

## Verification evidence

- 24 backend/security tests pass, including malformed bodies/UUIDs, exhausted-client quota protection, CAPTCHA action/hostname checks, escaping, reply routing, duplicate prevention, and partial-delivery recovery.
- Production build passes. All seven built HTML pages pass CSP/hash, internal-link, anchor, unique-ID, safe-link, and main-landmark checks. 205 local asset references pass; no missing or remote WordPress assets. `npm audit` reports zero known dependency vulnerabilities.
- Browser checks at 320, 390, and 768px covered home, touring, all legal pages, and search: no horizontal overflow or clipped form fields. Desktop hover settled to `rgb(81,144,66)` on the bike page.
- Local browser checks confirmed slideshow pause, gallery modal open/Escape/focus return, menu open/Escape/focus return, search results under CSP, skip-link focus, loaded images, and no application CSP/console errors.
- Live controlled mobile inquiry `SSB-B8474EA6` passed a real compact Turnstile check under CSP. The form returned success and both owner/client messages were observed in the actual Gmail inbox. The owner authorized these two test messages.
- Safe public negative checks returned 403 for an untrusted Origin, 400 for an empty allowed-origin submission, and 404 for `.env`, a private inquiry CSV path, and the schema source path. These requests did not create inquiries or send emails.

## Remaining operational scope

HostGator's subscription and retired installation have not been canceled/deleted; cancellation remains a separate owner decision. Local full WordPress and inquiry backups are preserved but the `.wpress` restore has not been exercised. Account MFA, provider infrastructure, all possible mail clients, and a full external penetration test were outside this application audit. There is no claim that automated checks establish complete WCAG or legal compliance.

## Primary references

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [OWASP: Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Cloudflare: Turnstile sizes and configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Cloudflare: Email security records](https://developers.cloudflare.com/dmarc-management/security-records/)
