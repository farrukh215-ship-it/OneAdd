import { IsEnum } from "class-validator";
import { ReportStatus } from "@prisma/client";

export class ReportActionDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
