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

3. Start infrastructure:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

4. Start any workspace you need:

   ```bash
   pnpm dev:api
   pnpm dev:web
   pnpm dev:admin
   pnpm dev:mobile
   ```

5. Prepare API database schema and seed data:

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
