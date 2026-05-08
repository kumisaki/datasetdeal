# DatasetDeal

Web app for publishing dataset requirements, browsing posts, in-thread chat, and assignment handshakes.

## Prerequisites

**Node.js 20 or newer** (22 LTS recommended). Vite 6 and this toolchain do not run on Node 12/14/16. If `npm run dev` fails with `Unexpected reserved word` near `await`, your shell is still using an old Node—fix `PATH` or install Node 22 (see [`.nvmrc`](.nvmrc)).

## Quick start (no Firebase required)

By default the app runs **entirely in the browser** using **localStorage** (accounts, posts, chat, assignments). No `firebase login`, no Node version for the Firebase CLI, and no `.env` file is required.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register, create drafts, publish, open a second browser profile to test contributor flows. Data stays on that browser until you clear site data.

### Optional: real Firebase later

1. Set `VITE_USE_FIREBASE=true` in `.env.local` and fill `VITE_FIREBASE_*` from the Firebase console ([`.env.example`](.env.example)).
2. Set your project id in [`.firebaserc`](.firebaserc).
3. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes,storage` (needs a modern Node for the Firebase CLI only when you deploy).

### If `npm install` used to “hang”

Older setups pulled **firebase-tools** as a dev dependency (hundreds of transitive packages) and **Vite 8** could fail on **Node 20.18** (Rolldown native binding). This repo now uses **Vite 6** and runs emulators via `npm run emulators` (`npx firebase-tools@…`), so installs stay small.

## Docker (production build)

```bash
docker compose up --build
```

Open **http://localhost:3000** (see [`docker-compose.yml`](docker-compose.yml)). Pass Firebase build args via environment or a `.env` file read by Compose.

## Firebase emulators (optional)

```bash
npm run emulators
```

Uses `npx` to download the Firebase CLI only when you run this command. For a full stack in Docker, use profile `local` (installs JRE inside the container on first start, which can take a few minutes):

```bash
docker compose --profile local up --build
```
# datasetdeal
