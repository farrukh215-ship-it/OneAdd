import { Module } from "@nestjs/common";
import { FeatureFlagModule } from "../feature-flags/feature-flag.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [FeatureFlagModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
