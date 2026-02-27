import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagController } from "./feature-flag.controller";
import { FeatureFlagService } from "./feature-flag.service";

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService]
})
export class FeatureFlagModule {}
