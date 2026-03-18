import { IsBoolean, IsDateString, IsString } from 'class-validator';

export class BookInspectionDto {
  @IsString()
  workshopPartnerId!: string;

  @IsDateString()
  bookedDate!: string;

  @IsBoolean()
  offlinePaymentAcknowledged!: boolean;
}

