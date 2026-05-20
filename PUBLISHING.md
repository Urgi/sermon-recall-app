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

1. Open [App Store Connect](https://appstoreconnect.apple.com/) → **Sermon Recall** (bundle `com.urgimeaso.sermon-recall`).
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

## Site (admin portal)

Push `main` on `sermon-recall-site`; Vercel deploys automatically. Ensure **Framework Preset = Next.js** in Vercel project settings.
