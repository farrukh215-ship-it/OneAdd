# Next 5 Steps - Website and APK

## Website - Next 5

1. Stabilize runtime + assets
- Deploy latest known commit with commit gate:
  - `EXPECTED_COMMIT=<sha> bash ./ops/vps-deploy.sh`
- Verify CSS/static assets:
  - `HOST_HEADER=teragharmeraghar.com bash ./ops/vps-healthcheck.sh`

2. Production sanity checks
- Check:
  - `/` returns `200/301`
  - `/_next/static` accessible
  - `/api/health` returns `200`
- Use:
  - `bash ./ops/vps-healthcheck.sh`

3. Data quality guardrails
- Keep invalid/no-image public listings cleaned:
  - `make cleanup-invalid-listings`
- Schedule daily cron from `ops/README.md`.

4. Observability hardening
- Docker log rotation already enabled in `docker-compose.yml`.
- Keep `restart: unless-stopped` + healthchecks active.
- Monitor `docker compose ps` and tail logs after each deploy.

5. Release discipline
- Always deploy from a specific commit hash.
- Standard sequence:
  1. `git pull`
  2. `docker compose build --no-cache api web admin`
  3. `docker compose up -d ...`
  4. `bash ./ops/vps-healthcheck.sh`

## APK - Next 5

1. Environment lock
- `apps/mobile/eas.json` now pins:
  - `EXPO_PUBLIC_ENV`
  - `EXPO_PUBLIC_API_URL=https://teragharmeraghar.com/api`
- Build with EAS profiles only (`development/preview/production`).

2. Auth reliability
- Validate matrix:
  - Signup OTP
  - Sign-in existing account
  - Forgot password OTP
- Mobile login errors now show API-provided message.

3. Post listing reliability
- Upload path uses R2 presign and now has retry/backoff on failed PUT uploads.
- Validate on both Wi-Fi and mobile data.

4. Data parity checks
- Test IDs:
  - Website post title: `SYNC-WEB-<date>`
  - APK post title: `SYNC-APK-<date>`
- Validate in:
  - home feed
  - browse
  - search

5. Release QA gate
- Before release:
  - Launch/crash-free
  - Login/OTP
  - Post ad with image upload
  - Listing open/detail
  - Profile login/logout

