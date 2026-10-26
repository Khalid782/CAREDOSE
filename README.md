# CareDose

> A project for an internal hackathon at SOET.

A mobile-first app that helps an elderly person take the right medicine at the
right time. Built as a Next.js App Router site so it can later be wrapped as an
Android app with Capacitor.

This is the **frontend only**. It runs entirely on the device with sample data;
the Supabase backend is not called yet.

## Screens

| Screen       | Route        | What it does                                                                  |
| ------------ | ------------ | ----------------------------------------------------------------------------- |
| Today        | `/`          | Doses grouped Morning / Afternoon / Evening / Night, a big **I TOOK IT** button per dose, a next-dose countdown and a progress ring. |
| Scan         | `/scan`      | Camera/upload, on-device OCR with photo preprocessing, then an editable Review that saves only after confirmation. |
| Medicines    | `/medicines` | List of medicines with add, edit and delete, and a manual Add Medicine form.   |
| History      | `/history`   | Weekly adherence: bar chart, percentage and missed doses per medicine.         |
| Settings     | `/settings`  | Meal times, text size, language, dark mode, caregiver name and phone.          |

The bottom navigation has exactly four tabs — Today, Scan, Medicines, Settings —
and no nested menus. History is reached from the Today screen.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm start        # serve the production build
npm run lint     # eslint
npm test         # parser + schedule unit tests
npx tsc --noEmit # type check
```

## Data layer

Everything a screen needs comes from `/lib/data`, never from a network call:

```
lib/data/
  types.ts              Medicine, ScheduleItem, DoseLog, Caregiver, Settings, MedicineDraft
  repositories.ts       one repository interface per entity + the DataLayer contract
  index.ts              the switch that picks an adapter
  time.ts               local date/time helpers shared by data and screens
  mock/
    storage.ts          localStorage with an in-memory fallback
    seed.ts             the sample data (6 medicines, a week of history)
    mockDataLayer.ts    the working adapter
  supabase/
    supabaseDataLayer.ts  a typed stub — fill this in to go live
lib/supabase/client.ts  a Supabase browser client built from the two public env
                        variables; intentionally not used yet
```

Switching data source is one environment variable:

```bash
NEXT_PUBLIC_DATA_SOURCE=mock      # default: everything stays on the device
NEXT_PUBLIC_DATA_SOURCE=supabase  # needs the adapter below and the two Supabase vars
```

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Live mode only needs the bodies in `lib/data/supabase/supabaseDataLayer.ts`
filled in with Supabase queries. The types in `lib/data/types.ts`, the repository
interfaces and every screen stay unchanged — that is the point of the split. A
service-role key must never be used: everything here ships inside the phone app.

## Design system

Elder-first rules, all defined in `app/globals.css`:

- Base font `20px`; the Text size setting scales it to `22px` or `26px`.
- Headings are `28px` and up, page titles `32px`.
- Buttons are at least `64px` tall (small ones `48px`); no touch target is under
  `48px`.
- Dark mode is a class on `<html>`, so the in-app toggle is independent of the
  phone setting. A tiny inline script applies the saved theme before first paint.
- Every icon is paired with a written label.
- `prefers-reduced-motion` turns off all transitions and animations.
- Colours: deep teal `#0B3C49`, teal `#1A8E8E`, coral `#E5533D`, green `#2E9E6A`,
  background `#F2F8F8`. All 26 text/graphic colour pairs are checked against
  WCAG AA in both themes.

Reusable components live in `/components`: `Button`, `Card`, `BigTimeBadge`,
`MedicineCard`, `WarningBanner`, `BottomNav`, `PageHeader`, `EmptyState`, plus
`ProgressRing`, `SegmentedControl`, `Toggle`, `Field`, `DoseCard`,
`MedicineForm` and `AppShell`.

## Languages

`lib/i18n/dictionary.ts` holds the English and Hindi copy. Adding a key means
adding it to both objects — the `Record<TranslationKey, string>` type makes a
missing translation a build error. `useTranslator()` gives a screen `t()`,
`at()`, `longDate()`, `countdown()` and friends already bound to the current
language.

## Notes for the Android (Capacitor) build

- Only relative paths are used for navigation and assets; there are no absolute
  URLs and no server-only features (no route handlers, server actions, cookies or
  `next/headers`). Every screen is a client component.
- Layouts are built for a 360px-wide phone and work up from there.
- The bottom navigation respects `env(safe-area-inset-bottom)`, so it clears
  Android and iOS gesture bars.
- `npm run build` prerenders all seven routes as static content, so the output
  can be dropped into a Capacitor `webDir`.
- Keep `NEXT_PUBLIC_DATA_SOURCE=mock` until the Supabase adapter and real
  authentication are in place.

## Prescription scanning

1. `/lib/ocr/preprocess.ts` resizes the photo to a 2400px long edge,
   grayscales it and boosts contrast. Testing showed Tesseract needs large text.
2. `/lib/ocr/recognize.ts` runs Tesseract.js inside its Web Worker and reports
   progress. The first scan downloads the English model; the browser caches it.
3. `/lib/parser.ts` reads name, strength, form, dose, frequency (OD/BD/TDS/QID,
   “twice a day”, “1-0-1”), food/meal timing and duration from each line.
4. The Review screen shows the original OCR line beside editable fields. OCR
   output is never saved automatically; `saveMedicines()` runs only after the
   patient presses Save.
5. `/lib/schedule.ts` turns the saved medicines plus Settings meal times into
   dated doses and plain sentences for the Today screen.

`npm test` covers both the parser (including noisy OCR samples) and the
schedule engine.

## What comes next

1. The Supabase adapter, with row-level security and per-patient scoping.
2. Reminders and dose notifications through Capacitor.
3. Bundle Tesseract's engine and English data for a fully offline first scan.
