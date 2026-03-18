import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InspectionJobsService } from './inspection-jobs.service';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InspectionsController],
  providers: [InspectionsService, InspectionJobsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
