import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ManageWorkshopDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsString()
  @MaxLength(40)
  contact!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
