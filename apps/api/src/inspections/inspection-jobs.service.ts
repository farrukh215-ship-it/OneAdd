import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InspectionsService } from './inspections.service';

@Injectable()
export class InspectionJobsService {
  private readonly logger = new Logger(InspectionJobsService.name);

  constructor(private readonly inspectionsService: InspectionsService) {}

  // Daily at 03:10 Asia/Karachi
  @Cron('10 3 * * *', { timeZone: 'Asia/Karachi' })
  async expireStaleInspectionRequests() {
    try {
      const result = await this.inspectionsService.expireStaleRequests();
      if (result.expired > 0) {
        this.logger.log(`Expired stale inspection requests: ${result.expired}`);
      } else {
        this.logger.debug('No stale inspection requests found to expire.');
      }
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to expire stale inspection requests', stack);
    }
  }
}
