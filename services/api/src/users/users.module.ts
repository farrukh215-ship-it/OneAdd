import { Module } from "@nestjs/common";
import { TrustScoreModule } from "../trust-score/trust-score.module";
import { UsersController } from "./users.controller";

@Module({
  imports: [TrustScoreModule],
  controllers: [UsersController]
})
export class UsersModule {}
