import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ListingsService } from "./listings.service";

@Injectable()
export class ListingExpiryCron {
  private readonly logger = new Logger(ListingExpiryCron.name);

  constructor(private readonly listingsService: ListingsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyExpiry() {
    const result = await this.listingsService.expireListingsDaily();
    this.logger.log(`Expired listings: ${result.expiredCount}`);
  }
}
