import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TrustScoreService } from "../trust-score/trust-score.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly trustScoreService: TrustScoreService) {}

  @Get(":id/trust-score")
  async getTrustScore(@Param("id") userId: string) {
    const trustScore = await this.trustScoreService.getTrustScore(userId);
    if (!trustScore) {
      throw new NotFoundException("Trust score not found for this user.");
    }
    return trustScore;
  }
}
