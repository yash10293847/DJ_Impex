# DJ Impex — Nabeen

Website for Nabeen luxury men's fabrics by D J Impex & Co., built with Next.js, React, TypeScript, and Tailwind CSS.

## Local development

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure the services you need. Keep credentials in `.env.local` or your hosting provider's environment settings.

```sh
npm run dev
```

Open [localhost:3001](http://localhost:3001).

## Checks and production build

```sh
npm run lint
npm run typecheck
npm run build
npm run start
```

The production server also uses port 3001.

## Google reviews

Configure `GOOGLE_MAPS_API_KEY` and `GOOGLE_PLACE_ID` to fetch reviews for the business. The homepage shuffles written Google reviews rated four or five stars. Backup testimonials appear only when the review provider fails; they do not carry Google branding.

## Contact

Yash — [admin@djimpex.in](mailto:admin@djimpex.in)
