# aikad-marketplace

`pnpm` monorepo with:

- `services/api` - NestJS backend
- `apps/web` - Next.js storefront
- `apps/admin` - Next.js admin panel
- `apps/mobile` - Expo React Native app
- `packages/shared` - shared types and Zod schemas

## Prerequisites

- Node.js 20+
- `pnpm`
- Docker Desktop

## Run locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the API environment template:

   ```bash
   Copy-Item services/api/.env.example services/api/.env
   ```

3. Copy the Web environment template (Firebase Phone Auth):

   ```bash
   Copy-Item apps/web/.env.example apps/web/.env.local
   ```

4. Start infrastructure:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

5. Start any workspace you need:

   ```bash
   pnpm dev:api
   pnpm dev:web
   pnpm dev:admin
   pnpm dev:mobile
   ```

6. Prepare API database schema and seed data:

   ```bash
   pnpm --filter @aikad/api db:migrate -- --name init
   pnpm --filter @aikad/api db:seed
   ```

## API defaults

- API base URL: `http://localhost:3001`
- Swagger docs: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

## Infra services

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

## Deploy (Docker + Nginx sample)

Use the deploy compose file to run API/Web/Admin behind Nginx:

```bash
docker compose -f infra/docker-compose.deploy.yml up -d --build
```

### VPS quick deploy (Hostinger)

On fresh Ubuntu VPS:

```bash
cd /tmp
curl -fsSL https://raw.githubusercontent.com/farrukh215-ship-it/OneAdd/master/scripts/vps-bootstrap.sh -o vps-bootstrap.sh
bash vps-bootstrap.sh
```

Then deploy app:

```bash
cd /tmp
curl -fsSL https://raw.githubusercontent.com/farrukh215-ship-it/OneAdd/master/scripts/vps-deploy.sh -o vps-deploy.sh
bash vps-deploy.sh
```

If `services/api/.env` is missing, deploy script will stop and ask you to create it first.

Nginx routes:

- `/` -> web (`3000`)
- `/admin` -> admin (`3002`)
- `/api` -> api (`3001`)

## Environment Matrix

| Variable | Local | Staging | Production |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | `postgresql://postgres:postgres@127.0.0.1:5433/aikad_marketplace?schema=public` | Managed Postgres URL | Managed Postgres URL |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Managed Redis URL | Managed Redis URL |
| `JWT_ACCESS_SECRET` | Local secret | Secret manager | Secret manager |
| `OTP_SECRET` | Local secret | Secret manager | Secret manager |
| `MEDIA_SIGNING_SECRET` | Local secret | Secret manager | Secret manager |
| `SMS_PROVIDER` | `noop` | `noop` or `sms4connect` | `sms4connect` |
| `SMS4CONNECT_API_KEY` | empty for noop | staging key | production key |
| `SMS4CONNECT_SENDER_ID` | empty for noop | staging sender | production sender |

## Pre-deploy Smoke Script

PowerShell smoke (infra + migrate + seed + API checks):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/predeploy-smoke.ps1
```

The smoke script verifies:

- `GET /health` returns 200
- `GET /docs` returns 200
- `POST /auth/signup` returns 201
- `GET /listings/feed` returns 200

## Real Integrations

### SMS4Connect

Set in `services/api/.env`:

```env
SMS_PROVIDER=sms4connect
SMS4CONNECT_BASE_URL=https://api.sms4connect.com
SMS4CONNECT_API_KEY=<your_api_key>
SMS4CONNECT_SENDER_ID=<your_sender_id>
```

### FCM Push

Set in `services/api/.env`:

```env
PUSH_PROVIDER=fcm
FCM_PROJECT_ID=<firebase_project_id>
FCM_CLIENT_EMAIL=<service_account_client_email>
FCM_PRIVATE_KEY=<service_account_private_key_with_escaped_newlines>
```

`FCM_PRIVATE_KEY` format example:

```env
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nABC...\n-----END PRIVATE KEY-----\n
```

## Expo Go Compatibility

This workspace currently uses Expo SDK from `expo@55.x`.  
If mobile scan fails with "Project is incompatible with this version of Expo Go":

1. Update Expo Go from Play Store/App Store.
2. Ensure phone and laptop are on same network.
3. Restart with:

```bash
pnpm dev:mobile:tunnel
```

For a stable team setup, pin Expo/React Native versions instead of `latest`.

If you use a physical device, set API URL to your laptop LAN IP before starting Expo:

```bash
set EXPO_PUBLIC_API_URL=http://<your-laptop-ip>:3001
pnpm dev:mobile:tunnel
```

## UAT

Detailed UAT sheet:

- `docs/UAT_CHECKLIST.md`

## Firebase Phone Auth Flow

- Mobile screen now requests Firebase phone OTP and verifies code.
- After Firebase sign-in, app sends `idToken` to:
  - `POST /auth/firebase/verify`
- Existing phone logs in directly (email + phone pair must match).
- New phone must submit profile fields once (name, fatherName, cnic, email, dob, gender).

### Web Firebase Setup (Real OTP)

1. Firebase Console -> Authentication -> Sign-in method -> Phone -> Enable.
2. Firebase Console -> Authentication -> Settings -> Authorized domains:
   - add `localhost`
3. `apps/web/.env.local` set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase Web app config>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
```

4. API `.env` must have Firebase admin key path:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=../../<your-service-account>.json
```

5. Restart both apps:

```bash
pnpm dev:api
pnpm dev:web
```
