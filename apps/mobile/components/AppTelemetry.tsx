import Constants from 'expo-constants';
import { useEffect } from 'react';
import { captureRuntimeError, captureStartupMetric } from '../lib/telemetry';

export function AppTelemetry() {
  useEffect(() => {
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    void captureStartupMetric(Math.round(startedAt));

    const previousHandler =
      typeof ErrorUtils !== 'undefined' && ErrorUtils.getGlobalHandler
        ? ErrorUtils.getGlobalHandler()
        : null;

    if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        void captureRuntimeError(error, isFatal ? 'fatal' : 'non_fatal');
        previousHandler?.(error, isFatal);
      });
    }

    return () => {
      if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler && previousHandler) {
        ErrorUtils.setGlobalHandler(previousHandler);
      }
    };
  }, []);

  useEffect(() => {
    void captureStartupMetric(
      Math.round((globalThis.performance?.now?.() ?? Date.now()) - (Constants.expoConfig ? 0 : 0)),
    );
  }, []);

  return null;
}
