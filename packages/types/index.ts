export interface User {
  id: string;
  phone: string;
  name?: string;
  city?: string;
  area?: string;
  cnicHash?: string;
  verified: boolean;
  banned: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count?: number;
}

export interface Listing {
  id: string;
  userId: string;
  user?: Pick<User, "id" | "name" | "city" | "verified">;
  title: string;
  description: string;
  price: number;
  category: Category;
  categoryId: string;
  images: string[];
  condition: "NEW" | "USED";
  city: string;
  area?: string;
  status: "ACTIVE" | "SOLD" | "DELETED";
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
