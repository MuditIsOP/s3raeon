

# S3RAEON – Daily reflection & journaling companion

[Live demo](https://s3raeon.vercel.app)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&labelColor=0F0F13)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&labelColor=0F0F13)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&labelColor=0F0F13)
![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=googlechrome&labelColor=0F0F13)

S3RAEON is a sleek, privacy-minded PWA for daily reflection and journaling. It combines guided morning/evening prompts, mood tracking, photos, audio notes, streaks with milestones, and visual stats. Entries and app config are stored in Storj’s S3-compatible storage, with optional Firebase Cloud Messaging for foreground notifications.

## What it does

- Morning/Evening guided journaling flows
- Mood tracking with color-coded cues
- Photo uploads with starring favorites
- Optional audio journaling (WebM)
- Streak tracking and milestone celebration UI
- Calendar, Gallery, and Stats pages
- PWA with Install and offline caching
- Simple local password lock with a recovery question (stored via Storj)

## Why it’s useful

- Designed for daily consistency (streaks, milestones, calendar)
- Rich media entries (photos/audio) to capture the day better
- Works well on mobile (PWA) and desktop
- Lightweight stack with simple deployment (Vite + React)
- Storage via Storj S3 gateway for portability and control

## Tech Stack

- React 18, React Router, Framer Motion
- Tailwind CSS
- Vite + vite-plugin-pwa
- AWS SDK v3 (S3-compatible with Storj)
- Firebase Messaging (optional)
- Luxon for date/time utilities

## Architecture overview

- UI: React components and pages under src/components and src/pages
- State: Centralized in src/App.jsx via DiaryContext
- Storage:
  - Entries JSON at data/entries.json
  - App config (password + recovery QA) at data/config.json
  - Photos under photos/{YYYY-MM-DD}/
  - Audio under audio/{YYYY-MM-DD}-morning.webm
- Networking: AWS SDK S3 client configured for Storj (src/storj.js)
- PWA: Manifest and Workbox caching via vite-plugin-pwa (vite.config.js)

Key files:
- src/App.jsx – App wiring, routes, onboarding (terms/guidelines), context (entries, streaks, saveEntry)
- src/storj.js – Uploads/reads to Storj, presigned URLs, entries/config persistence
- src/utils/timeUtils.js – Date handling (IST)
- src/utils/streakUtils.js – Streak and milestone logic
- src/components/AuthScreen.jsx – Simple lock screen with setup/recovery
- src/pages/* – Home, Gallery, Calendar, Stats, More, Profile
- public/firebase-messaging-sw.js – Service worker for messaging
- vite.config.js – PWA config, cache rules
- tailwind.config.js – Theme, colors, fonts

## Security note

- The current AuthScreen stores the password and recovery QA in plain JSON (data/config.json) in your Storj bucket. This is suitable for a personal project but not production. For stronger security:
  - Add server-side auth and encryption
  - Use proper secrets management
  - Avoid storing passwords unencrypted in object storage

## Getting Started

### Prerequisites

- Node.js >= 18
- npm (or pnpm/yarn)
- Storj S3 credentials and a bucket
- Firebase Web app credentials (optional; for messaging)

### Installation

```bash
git clone https://github.com/MuditIsOP/s3raeon.git
cd s3raeon
npm install
```

### Environment configuration

Copy the example and fill your values:

```bash
cp .env.example .env
```

Required (.env):
- VITE_STORJ_ACCESS_KEY
- VITE_STORJ_SECRET_KEY
- VITE_STORJ_BUCKET (defaults to arshita-diary if unset)
- VITE_STORJ_ENDPOINT (defaults to https://gateway.storjshare.io)
- VITE_STORJ_REGION (defaults to us-east-1)

Optional Firebase (for notifications):
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_VAPID_KEY

See .env.example for the full list: .env.example

### Run in development

```bash
npm run dev
```

- Opens at http://localhost:3000
- Auto-opens browser (vite.config.js)

### Build and preview

```bash
npm run build
npm run preview
```

## Usage examples

### Access and update entries

Entries are managed via DiaryContext in src/App.jsx.

```jsx
// src/components/ExampleUsage.jsx
import { useDiary } from '../App';
import { getTodayIST } from '../utils/timeUtils';

export default function ExampleUsage() {
  const { todayEntry, saveEntry, toggleDayStar } = useDiary();

  const completeToday = async () => {
    const today = getTodayIST(); // YYYY-MM-DD in IST
    await saveEntry(today, { completed: true, mood: 'good' });
  };

  const starToday = async () => {
    const today = getTodayIST();
    await toggleDayStar(today);
  };

  return (
    <div>
      <pre>{JSON.stringify(todayEntry, null, 2)}</pre>
      <button onClick={completeToday}>Mark Completed</button>
      <button onClick={starToday}>Toggle Star</button>
    </div>
  );
}
```

### Upload photo/audio (Storj)

```js
// src/storj.js
import { uploadPhoto, uploadAudio } from './storj';
import { getTodayIST } from './utils/timeUtils';

const today = getTodayIST();

// Upload a photo File (JPEG)
const url = await uploadPhoto(today, file); // returns presigned URL

// Upload a WebM audio Blob
const audioUrl = await uploadAudio(today, blob); // returns presigned URL
```

Presigned URLs are generated for 7 days. You can refresh via getPresignedUrl(key) if needed.

### PWA behavior

- Icons and manifest configured in vite.config.js
- Workbox caches Storj gateway responses:
  - urlPattern: https://gateway.storjshare.io/...
  - Strategy: CacheFirst with limits
- Assets cached: js, css, html, ico, png, svg, woff2

### Notifications (optional)

Foreground Firebase Messaging is set up in src/firebase.js and public/firebase-messaging-sw.js.

```js
import { requestForToken } from './firebase';

const token = await requestForToken();
console.log('FCM token:', token);
```

Use this token to send test pushes from your Firebase project.

## Project structure

- index.html
- src/
  - App.jsx
  - main.jsx
  - index.css
  - components/
    - AuthScreen.jsx
    - MorningSection.jsx
    - EveningSection.jsx
    - PhotoSection.jsx
    - MilestonePopup.jsx
    - GuidelinesModal.jsx
    - TermsModal.jsx
    - BottomNav.jsx
    - MoodPicker.jsx
  - pages/
    - Home.jsx
    - Gallery.jsx
    - Calendar.jsx
    - Stats.jsx
    - More.jsx
    - Profile.jsx
  - utils/
    - timeUtils.js
    - streakUtils.js
  - storj.js
  - firebase.js
- public/
  - s3raeon-icon.svg
  - apple-touch-icon.svg
  - pwa-192x192.svg
  - pwa-512x512.svg
  - firebase-messaging-sw.js
- vite.config.js
- tailwind.config.js
- postcss.config.js
- .env.example
- .gitignore
- package.json

## Where to get help

- Open an issue in this repository: https://github.com/MuditIsOP/s3raeon/issues

## Maintainers and contributions

- Maintainer: @MuditIsOP
- Contributions are welcome! Please:
  - Fork the repo
  - Create a feature branch
  - Commit with clear messages
  - Open a Pull Request describing your changes

If contribution guidelines are added later, they will be linked at docs/CONTRIBUTING.md.

## License

No license is currently specified. If you plan to open-source, add a LICENSE file at the repo root and update this section.