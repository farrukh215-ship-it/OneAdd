# Production Observability

## What is wired
- Mobile app startup telemetry -> `POST /telemetry/mobile`
- Runtime error reporting -> `POST /telemetry/mobile`
- API failure reporting -> `POST /telemetry/mobile`
- Push delivery warnings/errors -> API logs

## What to monitor
- `docker compose logs -f api | grep TelemetryService`
- push notification failures from `PushNotificationsService`
- 5xx API errors after release

## Suggested external services
- Sentry for JS/native crashes
- Expo EAS Insights
- Uptime monitor for API health

## Minimum production checks
- `/health`
- `/categories/health`
- auth OTP flow
- listing create/open/contact flow
