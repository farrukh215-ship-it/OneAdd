import { IsBoolean } from "class-validator";

export class AdminUserActionDto {
  @IsBoolean()
  enabled: boolean;
}
