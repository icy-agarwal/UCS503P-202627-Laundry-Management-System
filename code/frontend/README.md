# Hostel Laundry — frontend (student, staff and admin)

One Expo (React Native + TypeScript + Expo Router) codebase. It runs as a **website** (deployable today) and as a
**phone app** (Expo Go / APK). The role you sign in with decides which part you see:

| Role | Routes | Based on |
|---|---|---|
| Student | `/student/*` — home, submit, history, pickup QR, profile, complaints, notifications | `Hostel_Laundry_Student_App_v2` |
| Staff | `/staff/*` — home, queues, verify, tag, scan, complaints, search | `Hostel_Laundry_Staff_App` |
| Admin | `/admin/*` — dashboard, batches, complaints, students, staff, hostels & semesters, categories, audit, reports | `admin-app-single` |

## Three modes
* **Supabase mode** (when `EXPO_PUBLIC_SUPABASE_URL` is set, as in the included `.env`): real email OTP login (staff by mobile number) and your real
  database through Supabase functions, for students, staff and admin. Start with `supabase/SETUP.md`.
* **Demo mode** (default, when `EXPO_PUBLIC_API_URL` is empty): everything runs in memory, OTP is `123456`.
  Sign in as `24coe123@thapar.edu` (student), `ramesh.kumar@thapar.edu` (staff) or `anjali.sharma@thapar.edu` (admin).
  The three roles share one in-memory database, so you can submit as a student, then log in as staff and verify it.
  Data resets on reload. This is what you show in a viva when the backend is not running.
* **Real mode**: set `EXPO_PUBLIC_API_URL=https://your-backend`. Every screen then talks to your Express API
  (see `docs/API_CONTRACT.md`). Nothing else changes, because screens only call `src/api` (`mock.ts` and `http.ts`
  implement the same interface).

## Run it
```bash
npm install
npm run web          # browser
npx expo start       # scan the QR with Expo Go on a phone
npm run typecheck
```

## Put it into your repo
Your report has `code/frontend/src/{app,components,constants,hooks}`. Copy this project's `src/`, `assets/`, `app.json`,
`vercel.json` and `netlify.toml` over it, then run `npx expo install expo-router react-native-safe-area-context
react-native-screens expo-linking expo-constants expo-status-bar expo-font expo-camera react-native-svg
@react-native-async-storage/async-storage react-native-web react-dom @expo/metro-runtime` and
`npm i react-native-qrcode-svg @expo-google-fonts/manrope`. `expo install` picks versions matching your SDK.
(This project was built and tested on Expo SDK 54.) Delete the old placeholder screens in `src/app` that clash with these.

## Deploy
**Website (free)** — Vercel or Netlify, project root = this folder, config files are included:
1. Push to GitHub, import the repo on Vercel (or Netlify). Build = `npx expo export --platform web`, output = `dist`.
2. Add the environment variable `EXPO_PUBLIC_API_URL` (leave it out to publish the demo version).
3. Redeploy whenever the variable changes: Expo bakes it in at build time.

**Backend** — host the Express server on Render/Railway (free tier is fine) and, in `server.js`, allow the website's
origin: `app.use(cors({ origin: ['https://your-site.vercel.app'] }))`. The backend must be HTTPS, otherwise browsers
block calls from an HTTPS site.

**Android APK** — `npm i -g eas-cli && eas build -p android --profile preview` (needs a free Expo account).

## Things to check against your backend
* `POST /auth/verify-otp` is assumed to return `{session:{access_token}}` or `{access_token}` (what Supabase returns).
  If yours differs, change the one line in `src/api/http.ts`. The OTP is sent as both `otp` and `token`.
* `GET /me` must exist so the app knows the user's role (role lives in your users table, not in the frontend).
* Rules the UI shows but the **server must enforce**: counter hours and laundry days, role scoping, the state machine,
  and atomic single-use pickup tokens (see the contract).
* The QR holds `hlp:<random token>` only; no student data is in the code.
* Staff camera scanning needs HTTPS on the web and camera permission; the 6-digit backup code always works.

## Known limits (honest list)
Help & Support is a placeholder like in your design. Reports are computed in the browser from the batch list, which is
fine for hundreds of batches; move to an aggregate endpoint if it grows. Notifications are in-app only (as in your MVP plan).
