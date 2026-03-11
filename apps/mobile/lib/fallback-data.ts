import type { Category, Listing } from '@tgmg/types';

export const fallbackCategories: Category[] = [
  { id: '1', name: 'Mobile Phones', slug: 'mobiles', icon: '📱' },
  { id: '2', name: 'Cars', slug: 'cars', icon: '🚗' },
  { id: '3', name: 'Property', slug: 'property', icon: '🏡' },
  { id: '4', name: 'Electronics', slug: 'electronics', icon: '💻' },
  { id: '5', name: 'Furniture', slug: 'furniture', icon: '🛋️' },
  { id: '6', name: 'Cycles & Bikes', slug: 'cycles', icon: '🚲' },
  { id: '7', name: 'Fashion', slug: 'fashion', icon: '👕' },
  { id: '8', name: 'Books', slug: 'books', icon: '📚' },
];

export const fallbackListings: Listing[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `listing-${index + 1}`,
  userId: 'user-1',
  user: { id: 'user-1', name: 'Ali', city: 'Lahore', verified: true },
  title: ['iPhone 13 PTA', 'Suzuki Cultus 2017', 'Wooden Bed Set', 'Study Laptop'][index % 4]!,
  description: 'Saaf cheez hai, direct owner, dekh kar le ja sakte hain.',
  price: [125000, 2100000, 48000, 95000][index % 4]!,
  category: fallbackCategories[index % fallbackCategories.length]!,
  categoryId: fallbackCategories[index % fallbackCategories.length]!.id,
  images: [],
  condition: index % 2 === 0 ? 'USED' : 'NEW',
  city: ['Lahore', 'Karachi', 'Islamabad'][index % 3]!,
  area: ['DHA', 'Johar Town', 'Gulberg'][index % 3]!,
  status: 'ACTIVE',
  views: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));
