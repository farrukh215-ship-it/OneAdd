import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TrustScoreService } from "./trust-score.service";

@Injectable()
export class TrustScoreCron {
  private readonly logger = new Logger(TrustScoreCron.name);

  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleNightlyRecalculation() {
    const result = await this.trustScoreService.recalculateAllUsers();
    this.logger.log(`Trust scores recalculated: ${result.recalculated}`);
  }
}
