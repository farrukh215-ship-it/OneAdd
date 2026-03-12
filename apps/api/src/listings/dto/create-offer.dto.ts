import { IsInt, Max, Min } from 'class-validator';

export class CreateOfferDto {
  @IsInt()
  @Min(100)
  @Max(99999999)
  amount!: number;
}

