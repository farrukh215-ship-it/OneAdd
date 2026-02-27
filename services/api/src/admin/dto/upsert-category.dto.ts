import { IsOptional, IsString } from "class-validator";

export class UpsertCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
