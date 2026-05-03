# Mobile APK for self-testing (SFTP / physical phone)

Use this when you ask the assistant to **test the mobile app yourself** (or equivalent): you want a **debug APK** built on the dev machine, **saved to a fixed folder**, so you can **download it over SFTP** and install it on your phone from anywhere. The app must be able to reach the **real backend** configured in `vente-mobile` environments (currently Tailscale/LAN host in `environment*.ts`).

## Agent checklist (do these in order)

### 1) Confirm backend and database are up

The APK bundles only the frontend; API calls go to `environment.prod.ts` / `environment.ts` `apiUrl`. If Postgres or Nest is down, the app will fail at runtime.

**Preferred quick checks**

- **Postgres:** running and reachable with the credentials your `venteweb/.env` / `DATABASE_URL` expects.  
  - From repo root: `docker compose up -d postgres` (see root `docker-compose.yml`), **or** use your existing Postgres install.
- **Nest API:** listening on **0.0.0.0:3000** (already set in `venteweb/src/main.ts`) so it is reachable on the Tailscale/LAN IP the phone uses.
  - From `venteweb`: `npm run start:dev` (typical local dev), **or** bring up the full stack with root `docker compose up -d` if that is how you work.

**Smoke verification (adjust host if you test from another machine)**

- HTTP 200 from the API root (global prefix `api`):  
  `GET http://localhost:3000/api`  
  (Nest `AppController` returns the hello string.)
- If the phone uses Tailscale IP `100.103.144.82`, ensure that host can reach port **3000** on the machine running Nest (Tailscale up, firewall allows).

Do **not** ship the APK if these checks fail unless the user explicitly accepts testing against a different environment.

### 2) Confirm `apiUrl` matches where the phone will reach the API

- Files: `vente-mobile/src/environments/environment.ts` and `environment.prod.ts` (`apiUrl`, port **3000**, path **`/api`**).
- If the user changed Tailscale IP or port, update those files **before** building.

### 3) Build web assets and sync Capacitor

From `vente-mobile`:

```bash
npm run android:apk:prepare
```

(`ng build` uses **production** configuration by default → `environment.prod.ts` is bundled.)

**Windows shortcut (steps 3–5 in one shot):** after JDK 21 / `JAVA_HOME` is valid (or rely on auto-detect from `C:\Program Files\Eclipse Adoptium\jdk-21*`):

```bash
npm run android:apk:debug
```

This runs prepare, `gradlew.bat assembleDebug`, and leaves the APK at the Gradle output path below (the script prints the resolved full path).

### 4) Produce a debug APK with Gradle

Skip this if you used `npm run android:apk:debug`. Otherwise from `vente-mobile/android`:

- **Windows:** `gradlew.bat assembleDebug` (requires valid `JAVA_HOME`)
- **macOS / Linux:** `./gradlew assembleDebug`

Output (default):  
`vente-mobile/android/app/build/outputs/apk/debug/app-debug.apk`

**Windows `npm run android:apk:debug`:** the PowerShell script also copies the same file to a stable path for self-testing:  
`vente-mobile/outputs/debug/vente-mobile-debug.apk`

### 5) Pick up the APK for SFTP (or copy elsewhere)

**Default output (after step 3 or 4):**  
`vente-mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Use that path for SFTP or `adb install`. Each new `assembleDebug` overwrites `app-debug.apk`.

**Optional:** copy to a timestamped file if you want to keep multiple builds:

```powershell
$dest = "c:\dev\vente\vente-mobile\artifacts\apk"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
Copy-Item "c:\dev\vente\vente-mobile\android\app\build\outputs\apk\debug\app-debug.apk" `
  -Destination "$dest\vente-mobile-debug-$stamp.apk"
```

Report back to the user:

- Full path to the APK (Gradle output path unless you copied elsewhere).
- That **Postgres + Nest** were verified (or note any assumption).
- Reminder: phone must reach the **same** API host/port as in `apiUrl` (Tailscale connected, backend running).

## User checklist (manual)

- Install the APK (allow unknown sources if required).
- Connect the phone to the same **Tailscale** network (or network path) so `apiUrl` resolves.
- Optional: for **deep links** / app links, `app-links.const.ts` and `android/app/build.gradle` `appLinkHost` must match the host serving the web app if you test those flows.

## Release vs debug

- This procedure targets **`assembleDebug`** (no Play signing setup required).
- For **release** signed APK/AAB, use Android Studio or your signing config; that is out of scope here unless explicitly requested.

## Related docs

- `vente-mobile/README.md` — dev and live reload.
- `.codex-orchestration/project-context.md` — Run & Verify, mobile priority.
- Root `docker-compose.yml` — Postgres + optional full stack.
