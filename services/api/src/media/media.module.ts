import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MediaController } from "./media.controller";
import { FileValidationService } from "./file-validation.service";
import { MediaService } from "./media.service";

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, FileValidationService]
})
export class MediaModule {}
