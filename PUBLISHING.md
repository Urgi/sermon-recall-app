# Publishing the mobile app

**“Publish”** for this project means:

1. **Push** `main` on `sermon-recall-app` (GitHub).
2. **EAS production iOS build** with **auto-submit** to App Store Connect / TestFlight:

```bash
cd mobile
npm run eas:publish:ios
```

That runs:

```bash
eas build --platform ios --profile production --auto-submit --non-interactive
```

## One-time setup: `ascAppId` (required for auto-submit)

Non-interactive `--auto-submit` needs your App Store Connect **Apple ID** (numeric app id) in `eas.json`:

1. Open [App Store Connect](https://appstoreconnect.apple.com/) → **Sermon Recall** (bundle `com.faithbasedretention.sermonrecall`).
2. **App Information** → copy **Apple ID** (e.g. `1234567890`).
3. Add to `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleTeamId": "2ZHV96SMYB",
      "ascAppId": "YOUR_APPLE_ID_HERE"
    }
  }
}
```

4. Commit `eas.json`, then run `npm run eas:publish:ios` again.

Without `ascAppId`, the **build still completes** but submit fails. Submit manually:

```bash
npm run eas:submit:ios
# or: eas submit --platform ios --latest
```

(interactive — signs in with Apple if needed)

## App Store / Play review sign-in

Members sign in with email OTP. Reviewers get a fixed code (no inbox) via env vars baked into production builds:

| Env (EAS production + `mobile/.env`) | Value |
|----------------------------------------|--------|
| `EXPO_PUBLIC_APP_REVIEW_EMAIL` | `apple-review@sermonrecall.com` |
| `EXPO_PUBLIC_APP_REVIEW_CODE` | `482719` |

**App Review Information (Apple):**

- User name: `apple-review@sermonrecall.com`
- Password: `482719`
- Notes: Sign in → enter email → **Email me a code** → enter `482719`. Account is on demo church Grace Community with sermon content.

Refresh the Supabase user (password + church join):

```bash
node mobile/scripts/provision-app-review-account.mjs
```

(Set `eas secret` / EAS env for the two `EXPO_PUBLIC_*` vars before the next production iOS/Android build.)

## One-time setup: Android Play auto-submit (service account)

EAS reads `mobile/secrets/play-service-account.json` (gitignored) and submits to the **internal** track (`eas.json` → `submit.production.android`).

Use a **Sermon Recall–owned** Google Cloud service account (do not reuse Dubbadhu’s `eas-play-submit@dubbadhuu…`).

### A. Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project (e.g. `sermon-recall`).
2. **APIs & Services → Library** → enable **Google Play Android Developer API**.
3. **IAM & Admin → Service Accounts → Create service account**
   - Name: `eas-play-submit`
   - ID will look like `eas-play-submit@YOUR_PROJECT.iam.gserviceaccount.com`
4. Open the service account → **Keys → Add key → Create new key → JSON** → download.
5. Save the file as:

```text
mobile/secrets/play-service-account.json
```

(Replace the old Dubbadhu key if present. Never commit this file.)

### B. Play Console (invite the bot)

1. [Play Console](https://play.google.com/console/) → **Users and permissions → Invite new users**.
2. Email: the `client_email` from the JSON (e.g. `eas-play-submit@sermon-recall.iam.gserviceaccount.com`).
3. Role: **Release manager** (or Admin).
4. App access: **Sermon Recall only**.
5. Save / send invite (service accounts accept automatically).

### C. Link Play to the GCP project (first time only)

In Play Console → **Setup → API access** (or **Users and permissions → API access**): link the same Google Cloud project, then grant the service account access if the UI asks.

### D. Submit

```bash
cd mobile
npx eas-cli submit --platform android --latest --profile production
```

Or build + submit together once credentials are on the machine / EAS:

```bash
npx eas-cli build --platform android --profile production --auto-submit
```

## Site (admin portal)

Push `main` on `sermon-recall-site`; Vercel deploys automatically. Ensure **Framework Preset = Next.js** in Vercel project settings.
