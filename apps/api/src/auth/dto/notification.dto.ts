export class NotificationDto {
  id!: string;
  title!: string;
  body!: string;
  href!: string;
  type!: 'contact' | 'saved_update' | 'new_listing';
  createdAt!: string;
}
