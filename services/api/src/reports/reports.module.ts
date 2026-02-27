import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagModule } from "../feature-flags/feature-flag.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TrustScoreModule } from "../trust-score/trust-score.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule, TrustScoreModule, FeatureFlagModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
