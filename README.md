# GameApk — Android runtime for the HTML Games Code builder

One full-screen WebView that runs a bundled HTML5 game offline (served from
`assets/web/` over `https://appassets.androidplatform.net`), with AdMob behind
`window.GameAdsBridge` — the bridge every game's `js/ads.js` already calls:

| JS (game) | Native |
|---|---|
| `GameAdsBridge.showInterstitial()` | AdMob interstitial → `window.onAdClosed()` |
| `GameAdsBridge.showRewarded()` | AdMob rewarded → `window.onRewardedResult(true/false)` |
| — | optional anchored adaptive banner under the game |

GDPR/UMP consent runs before any ad request (`AdsConsent.kt`).

## How a build works
1. The builder (htmlgamescode.com/builder) sends the project to **htmlgames-worker**.
2. The Worker commits `job/` (build.json, config.json, icon.png, files/**) to a new
   `build-<id>` branch of this repo.
3. `.github/workflows/build.yml` runs `scripts/prepare.js` (game → `assets/web`,
   reskinned `config.js`, `app_settings.json`, icon), builds the APK or AAB, signs it
   and publishes a release `build-<id>` with `game.apk|game.aab` + `source.zip`.
4. The Worker reports progress and streams the files to the user.

## Setup (once)
- Push this folder to a **private** GitHub repo (default name `htmlgames-builds`), branch `main`.
- Repo secrets (Settings → Secrets → Actions), values in `../GameApk-signing/`:
  `KEYSTORE_B64` (= keystore.b64), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
- After changing a game in `~/Desktop/web2app/games`: `sh scripts/sync-games.sh`, commit, push.

## Local test
```bash
mkdir -p job && cp <a build.json/config.json> job/ && node scripts/prepare.js
./gradlew :app:assembleRelease
```
Keep the keystore safe: Google Play needs the same key for every update of an app.
