import { Module } from "@nestjs/common";
import { FeatureFlagModule } from "../feature-flags/feature-flag.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [FeatureFlagModule],
  controllers: [PricingController],
  providers: [PricingService]
})
export class PricingModule {}
