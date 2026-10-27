# DJ Impex frontend QA report

Date: 26 October 2026
Environment: local Next.js development preview (3001), then optimized production build (3002), Chrome on Windows.
Scope: public pages, client routing, visible controls, input validation, keyboard access, mobile layout, media, and frontend build checks. No API/database/mail/authentication integration tests were included in the frontend verdict. No enquiries or messages were submitted. No application fixes or deployments were made.

## Result

Public routing is healthy. All eight public content pages return 200, three legacy URLs redirect correctly, and unknown pages/articles return 404. The production build and final TypeScript check pass. ESLint has zero errors and 10 unused-code warnings. The site needs the issues below addressed before a clean frontend sign-off.

## Findings

### F01 — High: locally curated testimonials are presented as Google reviews
- Homepage: the carousel displays Google Reviews branding for entries supplied from the local curated list, without a Google attribution/source link. The rating banner falls back to 4.9 even when no live rating is available.
- Evidence: the rendered homepage showed curated entries such as Rajesh Parekh and Chukwudi Eze under Google Reviews, plus a 4.9 Google rating. This is a presentation/content-provenance issue; the reviews provider itself was not tested.
- Locations: src/app/(site)/page.tsx:92, src/app/(site)/page.tsx:133, src/lib/google-reviews.ts:88, src/lib/google-reviews.ts:143, src/lib/google-reviews.ts:175.
- Expected: distinguish trade-partner testimonials from sourced Google reviews; omit or clearly label unavailable/unverified rating data.

### F02 — Medium: hero enquiry modal accepts invalid phone/name values
- Steps: Home → Enquire Now → enter name A and phone abc.
- Actual: both fields report native validity true; the modal handler only checks for non-empty trimmed strings. The homepage form separately requires a two-character name and numeric phone input of at least five characters.
- No valid-form submission was performed because it opens WhatsApp and invokes a server action.
- Locations: src/components/contact/WhatsAppModal.tsx:74, src/components/contact/WhatsAppModal.tsx:79; comparison src/components/contact/EnquiryForm.tsx:116.
- Expected: share the same validation rules and accessible inline error behavior across both enquiry entry points.

### F03 — Medium: swatch lightbox leaves keyboard focus behind the modal
- Steps: Nabeen → open Fantasy or Marconi swatch → press Tab.
- Actual: opening the lightbox leaves focus on the launching swatch. Tab moves to another background swatch. Confirmed again on the production build, including mobile layout.
- Escape and the close button dismiss the lightbox, but focus is not initially placed inside it and is not contained there.
- Location: src/components/ui/SignatureLines.tsx:103 and the lightbox at approximately line 313.
- Expected: move focus into the lightbox, contain Tab/Shift+Tab, restore the opener, and register it with the shared overlay manager.

### F04 — Medium: looping hero videos have no pause control
- Home hero has playing permanently true and no user-facing video play/pause button. The About banner autoplays a looping video with no pause control; it also does not check reduced-motion preferences.
- The separate Nabeen brand-film component does have a play/pause control.
- Locations: src/components/home/HeroCarousel.tsx:53; src/components/vision/VisionBanner.tsx:26 and :47.
- Expected: provide an accessible pause/play control for continuing motion; honor reduced motion for the About banner.

### F05 — Medium: Forgot password opens a change-password form
- Steps: /admin/login → Forgot password?.
- Actual: Reset Administrator Password dialog requires Current (Old) Password. A person who forgot the password cannot use this flow.
- Passwords were not entered or changed. Only opening and cancelling the dialog was tested.
- Locations: src/components/admin/AdminLoginForm.tsx:206; src/components/admin/ChangePasswordModal.tsx:111.
- Expected: provide an actual recovery path or label this action Change password and explain the recovery route.

### F06 — Low: enquiry selection chips do not expose selected state
- Steps: Home → Enquire Now → select Wool or a usage option.
- Actual: the button changes appearance, but has no aria-pressed, checked state, or equivalent accessible selection state.
- Location: src/components/contact/WhatsAppModal.tsx:222 and subsequent usage buttons.
- Expected: use aria-pressed for toggle buttons or native labelled checkboxes.

### F07 — Low: requested image qualities are not configured
- Next.js logs warnings for quality 90 on page imagery and 95 on the swatch lightbox, while next.config.ts permits only 75 and 88.
- Images rendered during checks; this is a quality/configuration defect, not a confirmed broken-image defect.
- Locations: src/components/ui/SignatureLines.tsx:368; src/app/(site)/about/page.tsx:63; src/components/nabeen/NabeenIntro.tsx:58; src/components/nabeen/AliNuhuGivesBack.tsx:37; src/components/journal/JournalArticleAnimated.tsx:76; src/app/(site)/journal/page.tsx:83.
- Expected: use an allowed quality or deliberately configure the requested values.

## Coverage and evidence

| Area | Checks | Result |
|---|---|---|
| Home | Render, 8 collection tabs, 5 testimonial selectors, enquiry modal open/close/Escape, required-field validation, contact section, shared links | Functional, with findings above |
| About | Render, hero, content, collection CTA target, mobile fit | Functional; video finding |
| Nabeen | All 4 desktop collection tabs, mobile collection buttons, swatch lightbox behavior, media control presence | Functional; focus and image-quality findings |
| Wear2Care | Render, enquiry/collection link targets, images, mobile fit | Pass |
| Journal index | All 3 article cards and targets, mobile fit | Pass |
| Three article pages | Page body/headings, related-article navigation, story/contact links, mobile fit | Pass |
| Contact anchor | Cross-page article link to /#contact; target scroll position verified | Pass |
| Legacy routes | /contact → /#contact (307), /vision → /about (307), /ecommerce/auth → / (308) | Pass |
| Error routes | Unknown page, unknown journal slug, /_todo disabled | Correct 404 |
| 404 controls | Home button clicked; Browse Fabrics target checked | Pass |
| Mobile menu | Open, focus entry, scroll lock, route selection, automatic close | Pass |
| Language selector | Open, search, empty result, Escape, French translation, return to English | Pass for sampled language cycle |
| External contacts | Telephone, Gmail compose, Maps, social and WhatsApp URL targets inspected | Targets valid in markup; delivery/calling/provider behavior not exercised |
| Admin login | Render, mobile fit, show/hide password, remember checkbox, empty-submit native validation, recovery dialog open/cancel | Functional with recovery finding |
| Assets | 40 unique image/video/poster URLs from rendered public HTML checked against production preview | All returned 200 |
| Build | npm run build | Pass, including build TypeScript stage |
| TypeScript | npm run typecheck after Next generated types settled | Pass |
| ESLint | npm run lint | 0 errors, 10 warnings |

Responsive DOM checks used the browser's actual CSS widths: desktop approximately 1517 px, mobile approximately 433 px, tablet approximately 853 px. The browser zoom causes these to differ from requested viewport dimensions. All eight content pages were checked at mobile width; homepage also checked at tablet width. No document-level horizontal overflow was found. This does not certify every internal scroll container or every device/browser.

## Limits and observations

- Protected admin management pages were inventoried in source but not signed into or exercised. Their authenticated controls remain unverified. Backend work was excluded as requested.
- Collection tabs and repeated swatch controls were exercised, with representative lightbox outcomes verified; automation interruptions mean this is not a verified individual pass for every one of the 26 swatches. The shared lightbox focus defect applies across collections.
- Valid enquiry submissions, persistence, email delivery, real phone calls, WhatsApp message sending, uploads, deletes, account changes, and external-service login were not performed.
- French was tested end-to-end; all 53 translation languages were not individually tested.
- Physical touch gestures, Safari/Firefox, real-device testing, screen-reader testing, slow-network/offline states, and a full performance/contrast audit remain unverified.
- Initial typecheck overlapped development type generation and reported missing generated files. The later typecheck and production build passed.
- A development-preview header contrast anomaly was not reproduced in the production build and is not counted as a site defect.
- A development hydration warning referenced browser-injected fdprocessedid attributes; no application hydration defect is asserted from that warning.
- Build emitted content-store fallback notices. Their backend causes were not investigated.

Raw route results: qa-results/routes.json. Asset results: qa-results/assets.json. Reusable read-only HTTP checks: tools/qa-routes.cjs and tools/qa-assets.cjs.
