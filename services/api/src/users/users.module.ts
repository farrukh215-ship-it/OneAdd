import { Module } from "@nestjs/common";
import { TrustScoreModule } from "../trust-score/trust-score.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TrustScoreModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
