import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TrustScoreModule } from "../trust-score/trust-score.module";
import { ListingsController } from "./listings.controller";
import { ListingExpiryCron } from "./listing-expiry.cron";
import { ListingsService } from "./listings.service";

@Module({
  imports: [AuthModule, TrustScoreModule, NotificationsModule],
  controllers: [ListingsController],
  providers: [ListingsService, ListingExpiryCron],
  exports: [ListingsService]
})
export class ListingsModule {}
