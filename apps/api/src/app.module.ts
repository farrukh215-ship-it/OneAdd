import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { InspectionsModule } from './inspections/inspections.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    FirebaseModule,
    OtpModule,
    NotificationsModule,
    AuthModule,
    ListingsModule,
    CategoriesModule,
    SearchModule,
    HomeModule,
    TelemetryModule,
    UploadsModule,
    InspectionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
