import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ChatModule } from "./chat/chat.module";
import { validateEnvironment } from "./config/env.validation";
import { FeatureFlagModule } from "./feature-flags/feature-flag.module";
import { HealthModule } from "./health/health.module";
import { ListingsModule } from "./listings/listings.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PricingModule } from "./pricing/pricing.module";
import { RedisModule } from "./redis/redis.module";
import { RateLimitGuard } from "./rate-limit/rate-limit.guard";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ReportsModule } from "./reports/reports.module";
import { SearchModule } from "./search/search.module";
import { TrustScoreModule } from "./trust-score/trust-score.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnvironment
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AiModule,
    HealthModule,
    AuthModule,
    AdminModule,
    AnalyticsModule,
    FeatureFlagModule,
    MediaModule,
    NotificationsModule,
    ChatModule,
    PricingModule,
    RecommendationsModule,
    TrustScoreModule,
    UsersModule,
    ReportsModule,
    ListingsModule,
    SearchModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ]
})
export class AppModule {}
