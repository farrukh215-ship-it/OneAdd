import { User } from '@prisma/client';

export class UserDto {
  id!: string;
  phone!: string;
  name!: string | null;
  city!: string | null;
  area!: string | null;
  verified!: boolean;
  createdAt!: Date;

  static fromUser(user: User): UserDto {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      city: user.city,
      area: user.area,
      verified: user.verified,
      createdAt: user.createdAt,
    };
  }
}
