# Public website performance and reliability review

27 October 2026. Public pages only; no admin routes or customer submissions were exercised. Changes remain local.

## Live baseline

[PageSpeed report](https://pagespeed.web.dev/analysis/https-www-djimpex-in/429ggzcaxv?form_factor=mobile), captured at 15:42 IST before these changes. These are Lighthouse lab results. PageSpeed had no real-user field data for this site.

| Metric | Mobile: Moto G Power, slow 4G | Desktop |
| --- | --- | --- |
| Performance score | 91 | 98 |
| First Contentful Paint | 1.1 s | 0.3 s |
| Largest Contentful Paint | 3.3 s | 0.8 s |
| Total Blocking Time | 80 ms | 70 ms |
| Cumulative Layout Shift | 0 | 0.016 |
| Speed Index | 3.6 s | 1.5 s |
| Downloaded resources | 12,001 KiB | 12,011 KiB |

The desktop report text is saved alongside this file. The download audit lists the main video twice at about 4,384 KiB per entry, plus a 2,598 KiB intro video. The report alone does not establish the reason for duplicate requests. Both supplied MP4s already place metadata before media data. Source assets and video quality were preserved.

Two sequential HTTP samples per route, following redirects:

| Route | First byte 1 | First byte 2 | Complete HTML 1 | Complete HTML 2 |
| --- | --- | --- | --- | --- |
| `/` | 0.614 s | 0.466 s | 0.854 s | 0.882 s |
| `/about` | 0.401 s | 0.413 s | 0.417 s | 0.627 s |
| `/nabeen` | 0.405 s | 0.418 s | 0.607 s | 2.403 s |
| `/nabeen-x-ali-nuhu` | 0.457 s | 0.374 s | 0.655 s | 0.392 s |
| `/journal` | 0.495 s | 0.408 s | 0.717 s | 0.621 s |
| `/contact` | 0.486 s | 0.495 s | 0.887 s | 1.021 s |

All returned 200 after redirects. `/contact` redirects to the home contact section. These times cover HTML, not images, hydration, or button response. The slower second Nabeen result needs more samples to establish a cause.

The live homepage contains one hero slide. Its pause button successfully paused the video during the browser check. The earlier claim that advancing slides explained the pause issue was incorrect for the current homepage configuration.

## Local improvements

- Stream reviews and the rating behind Suspense boundaries so the main homepage does not await Google. Validate provider responses and share concurrent requests.
- Deduplicate slot and journal reads within each render using React cache. Load independent journal data together. No content is cached across requests.
- Add public navigation loading feedback and page/root crash recovery screens with retry/home actions, using the existing error-page colors and typography.
- Bound the intro animation duration instead of waiting for window load. Skip its video for reduced motion, Data Saver, and very slow connections.
- Preload the hero poster and pause playback offscreen or in a hidden document. Persist explicit play/pause choices across reloads and later visits in the same browser, restoring the choice before autoplay.
- Catch enquiry action transport failures and display recovery messages. Notify visitors when the WhatsApp modal's background save cannot be confirmed. No automatic submission retries were added.
- Add allowlisted diagnostic error codes without logging provider messages, credentials, paths, or customer details.
- Remove the original nine unused-code warnings, unused hooks, obsolete helpers, and misleading carousel commentary.
- Attach the header's hero observer after streamed content arrives, and refresh section references after navigation loading. This preserves its transparency and active contact-link behavior.

## Verification

- Public runtime and translation tests: 12 passed. Covers concurrent request sharing, malformed responses, provider failure, preference persistence, blocked storage, safe diagnostic logging, and existing language behavior.
- TypeScript passed. The production build also checks types.
- Production build passed with Webpack. Default Turbopack hit a local CSS-worker startup error; the initial sandboxed attempt could not fetch Google Fonts. No compiler configuration or dependency was changed.
- The previously failing isolated filesystem concurrency test passed outside the sandbox. The sandbox rejected both writes with EPERM during rename, so no application storage fix was needed.
- Full-project lint passed with no errors or warnings. Formatting passed for the new files and the specifically formatted source files. The final header change is also checked separately.
- Local production HTTP smoke checks: home, About, Nabeen, Wear2Care, journal, and the contact redirect returned 200; the missing-page check returned 404.
- Browser checks verified saved Pause/Play after reloads, pausing offscreen and resuming on return, About and Nabeen navigation, immediate navigation loading feedback, mobile menu links, enquiry-popup opening/dismissal, and no horizontal overflow at a 390-pixel viewport. No valid form submission was made.
- The final header correction passed its separate lint check and the final Webpack production build. The browser confirmed `data-solid=false` on the homepage after reload and after returning from About. The saved mobile screenshot predates that header correction. Browser access was disabled in Work settings before the final screenshot and viewport-reset attempt, so those last browser actions could not be completed. The local preview server was stopped.

## Limits

These scores describe the existing deployment. Post-change live scores need another run after deployment. Large video files remain a bandwidth cost; further compression needs a visual quality review. Translated pages retain full document navigation to avoid React conflicts with Google-mutated text. Dedicated error monitoring/alerts are not connected; application logs remain the diagnostic destination.

No live enquiry was submitted or external message sent. Browser-tool connection timeouts limited some live interaction checks; those are not evidence of a website defect. The direct mobile PageSpeed API hit a quota limit; the successful mobile measurements came from the PageSpeed browser report above. Local production storage reads used the existing default-content fallbacks because persistent storage was unavailable in the preview environment.
