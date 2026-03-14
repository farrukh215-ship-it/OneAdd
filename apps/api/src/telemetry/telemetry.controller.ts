import { Body, Controller, Post } from '@nestjs/common';
import { MobileTelemetryDto } from './dto/mobile-telemetry.dto';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('mobile')
  mobile(@Body() body: MobileTelemetryDto) {
    return this.telemetryService.recordMobileEvent(body);
  }
}
