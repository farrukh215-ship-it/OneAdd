import { Injectable, Logger } from '@nestjs/common';
import { MobileTelemetryDto } from './dto/mobile-telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  recordMobileEvent(payload: MobileTelemetryDto) {
    const event = {
      source: 'mobile',
      level: payload.level ?? 'info',
      type: payload.type ?? 'event',
      screen: payload.screen ?? null,
      message: payload.message ?? null,
      stack: payload.stack ?? null,
      appVersion: payload.appVersion ?? null,
      environment: payload.environment ?? null,
      device: payload.device ?? null,
      meta: payload.meta ?? {},
      receivedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(event);
    if (event.level === 'error') {
      this.logger.error(serialized);
    } else if (event.level === 'warn') {
      this.logger.warn(serialized);
    } else {
      this.logger.log(serialized);
    }

    return { ok: true };
  }
}
