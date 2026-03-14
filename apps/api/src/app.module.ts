import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthController } from './health.controller';
import { ListingsModule } from './listings/listings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    OtpModule,
    NotificationsModule,
    AuthModule,
    ListingsModule,
    CategoriesModule,
    SearchModule,
    TelemetryModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
