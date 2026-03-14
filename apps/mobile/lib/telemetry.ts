import Constants from 'expo-constants';

const apiUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3001';
const environment =
  Constants.expoConfig?.extra?.environment ||
  process.env.EXPO_PUBLIC_ENV ||
  'development';
const appVersion = Constants.expoConfig?.version || '0.0.0';

type TelemetryPayload = {
  level?: 'info' | 'warn' | 'error';
  type: string;
  screen?: string;
  message?: string;
  stack?: string;
  device?: string;
  meta?: Record<string, unknown>;
};

export async function sendTelemetry(payload: TelemetryPayload) {
  try {
    await fetch(`${apiUrl}/telemetry/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        appVersion,
        environment,
      }),
    });
  } catch {
    // Intentionally swallow telemetry failures.
  }
}

export function captureStartupMetric(durationMs: number) {
  return sendTelemetry({
    level: 'info',
    type: 'startup',
    message: `App boot completed in ${durationMs}ms`,
    meta: { durationMs },
  });
}

export function captureRuntimeError(error: unknown, screen = 'unknown') {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  return sendTelemetry({
    level: 'error',
    type: 'runtime_error',
    screen,
    message,
    stack,
  });
}

export function captureApiFailure(details: {
  screen?: string;
  method?: string;
  url?: string;
  status?: number;
  message?: string;
}) {
  return sendTelemetry({
    level: details.status && details.status >= 500 ? 'error' : 'warn',
    type: 'api_failure',
    screen: details.screen,
    message: details.message || 'API request failed',
    meta: {
      method: details.method,
      url: details.url,
      status: details.status,
    },
  });
}
