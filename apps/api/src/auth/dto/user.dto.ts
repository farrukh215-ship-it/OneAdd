import { User } from '@prisma/client';

export class UserDto {
  id!: string;
  phone!: string;
  email!: string | null;
  name!: string | null;
  city!: string | null;
  area!: string | null;
  verified!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromUser(user: User): UserDto {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      city: user.city,
      area: user.area,
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
