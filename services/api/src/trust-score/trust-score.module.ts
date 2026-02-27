import { Module } from "@nestjs/common";
import { TrustScoreCron } from "./trust-score.cron";
import { TrustScoreService } from "./trust-score.service";

@Module({
  providers: [TrustScoreService, TrustScoreCron],
  exports: [TrustScoreService]
})
export class TrustScoreModule {}
