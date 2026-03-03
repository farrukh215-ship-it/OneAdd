# TGMG Production Rollout (www.teragharmeraghar.com)

## 1. Hostinger DNS

Add these records:

- `A` record: `@` -> `YOUR_VPS_IP`
- `A` record: `www` -> `YOUR_VPS_IP`

Verify:

```bash
dig +short teragharmeraghar.com
dig +short www.teragharmeraghar.com
```

## 2. Firebase and Google Cloud (real OTP)

In Firebase Console:

1. Authentication -> Sign-in method -> Phone -> Enabled
2. Authentication -> Settings -> Authorized domains:
   - `localhost`
   - `teragharmeraghar.com`
   - `www.teragharmeraghar.com`

In Google Cloud Console:

1. Billing account must be active for project
2. APIs enabled:
   - Identity Toolkit API
   - Firebase Authentication API
3. Web API key HTTP referrers:
   - `https://teragharmeraghar.com/*`
   - `https://www.teragharmeraghar.com/*`

## 3. VPS bootstrap (first time only)

```bash
cd /tmp
curl -fsSL https://raw.githubusercontent.com/farrukh215-ship-it/OneAdd/master/scripts/vps-bootstrap.sh -o vps-bootstrap.sh
bash vps-bootstrap.sh
```

## 4. App env files

Inside repo on VPS:

```bash
cd /opt/teragharmeraghar
cp services/api/.env.production.example services/api/.env
cp infra/.env.production.example infra/.env.production
```

Then edit:

- `services/api/.env`
  - `JWT_ACCESS_SECRET`
  - `OTP_SECRET`
  - `MEDIA_SIGNING_SECRET`
  - `FCM_CLIENT_EMAIL`
  - `FCM_PRIVATE_KEY`
- `infra/.env.production`
  - `NEXT_PUBLIC_FIREBASE_*` values if changed in Firebase project

## 5. Deploy containers

```bash
cd /opt/teragharmeraghar
ENV_FILE=infra/.env.production bash scripts/vps-deploy.sh
```

## 6. SSL certificate

```bash
cd /opt/teragharmeraghar
EMAIL=you@example.com bash scripts/vps-enable-ssl.sh
```

## 7. Validate all endpoints

```bash
curl -I https://www.teragharmeraghar.com
curl -I https://www.teragharmeraghar.com/api/health
curl -I https://www.teragharmeraghar.com/admin/
```

## 8. OTP validation flow

1. Open `https://www.teragharmeraghar.com/account`
2. Enter email + phone
3. Request OTP
4. In browser network tab confirm request goes to:
   - `https://identitytoolkit.googleapis.com/.../sendVerificationCode`
5. Verify OTP
6. Confirm backend login call succeeds:
   - `POST /api/auth/firebase/verify`

If OTP fails with `400`:

- Re-check authorized domains
- Re-check billing and APIs
- Re-check API key referrer restrictions
- Rebuild web after Firebase env changes:
  - `docker compose --env-file infra/.env.production -f infra/docker-compose.deploy.yml up -d --build web nginx`
