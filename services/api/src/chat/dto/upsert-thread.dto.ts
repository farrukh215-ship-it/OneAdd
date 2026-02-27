import { IsString } from "class-validator";

export class UpsertThreadDto {
  @IsString()
  listingId: string;
}
