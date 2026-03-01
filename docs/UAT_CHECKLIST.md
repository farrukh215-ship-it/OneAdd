# UAT Checklist

## Preconditions

- Docker Desktop is running.
- API `.env` is filled and valid.
- Postgres/Redis are up (`infra/docker-compose.yml`).
- API is reachable on `http://localhost:3001`.
- Web is reachable on `http://localhost:3000`.
- Admin is reachable on `http://localhost:3002`.

## 1. Signup and OTP

1. Call `POST /auth/signup` with a fresh `cnic`, `phone`, `email`.
Expected:
- `201` with `accessToken` and `user`.

2. Reuse same `cnic` with different phone/email.
Expected:
- `400` `CNIC already registered.`

3. Reuse same `phone` with different cnic/email.
Expected:
- `400` `Phone already registered.`

4. Call `POST /auth/otp/request` for registered phone.
Expected:
- `201` with `requestId`, `expiresAt` (+ `devOtp` when `SMS_PROVIDER=noop`).

5. Verify OTP with wrong code repeatedly beyond limit.
Expected:
- invalid attempts return `401`, then `403` on max attempts.

6. Verify OTP with correct code and login via `otpVerificationToken`.
Expected:
- `POST /auth/login` returns `200` with `accessToken`.

## 2. Listing Lifecycle

1. Create listing (`POST /listings`) with:
- max 6 images and max 1 video <= 30s.
Expected:
- valid payload returns `201`.

2. Try payload with 7 images or video > 30s.
Expected:
- `422` validation/business rule error.

3. Activate listing (`POST /listings/:id/activate`).
Expected:
- `200`, status becomes `ACTIVE`.

4. Try activating another listing in same category for same user.
Expected:
- `409` lock conflict.

## 3. Chat

1. Buyer creates thread on active listing (`POST /chat/threads`).
Expected:
- thread created once per buyer-listing pair.

2. Send messages (`POST /chat/threads/:id/messages`).
Expected:
- `200`, messages persist, receiver notification entry created.

3. Mark listing sold (`POST /listings/:id/mark-sold`) or expire via cron.
Expected:
- thread status closes automatically.

## 4. Reports and Admin

1. Submit report (`POST /reports`) against listing.
Expected:
- `201`.

2. If reports cross threshold and `AUTO_HIDE_REPORTS` enabled:
Expected:
- listing deactivated/paused, ranking score `0`.

3. Admin actions:
- `PATCH /reports/:id/action`
- `PATCH /reports/users/:id/suspend`
- `PATCH /reports/users/:id/shadow-ban`
- `PATCH /reports/listings/:id/deactivate`
Expected:
- actions apply successfully.
- `AuditLog` entries created for each admin action.

## 5. Feature Flags and Cache

1. Toggle flags through `PATCH /admin/feature-flags/:key`.
Expected:
- DB updates and Redis cache refresh.

2. Read flags through `GET /admin/feature-flags`.
Expected:
- updated values visible immediately.

## 6. Deploy Smoke

1. Build/start deploy stack:
```powershell
docker compose -f infra/docker-compose.deploy.yml up -d --build
```
Expected:
- `api`, `web`, `admin`, `nginx`, `postgres`, `redis` containers healthy.

2. Through Nginx:
- `GET http://localhost/api/health` -> `200`
- `GET http://localhost/` -> web loads
- `GET http://localhost/admin` -> admin loads

3. Run smoke script:
```powershell
pnpm smoke:predeploy
```
Expected:
- script exits success.
