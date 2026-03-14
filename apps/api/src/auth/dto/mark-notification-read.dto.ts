import { IsString } from 'class-validator';

export class MarkNotificationReadDto {
  @IsString()
  notificationId!: string;
}

