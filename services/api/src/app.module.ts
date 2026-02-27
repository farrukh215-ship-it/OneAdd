import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { ChatModule } from "./chat/chat.module";
import { validateEnvironment } from "./config/env.validation";
import { FeatureFlagModule } from "./feature-flags/feature-flag.module";
import { HealthModule } from "./health/health.module";
import { ListingsModule } from "./listings/listings.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RateLimitGuard } from "./rate-limit/rate-limit.guard";
import { ReportsModule } from "./reports/reports.module";
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
    HealthModule,
    AuthModule,
    AdminModule,
    FeatureFlagModule,
    MediaModule,
    NotificationsModule,
    ChatModule,
    TrustScoreModule,
    UsersModule,
    ReportsModule,
    ListingsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ]
})
export class AppModule {}
