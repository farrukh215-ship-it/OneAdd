import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Mobile Phones", slug: "mobiles", icon: "📱", order: 1 },
  { name: "Cars", slug: "cars", icon: "🚗", order: 2 },
  { name: "Property", slug: "property", icon: "🏡", order: 3 },
  { name: "Electronics", slug: "electronics", icon: "💻", order: 4 },
  { name: "Furniture", slug: "furniture", icon: "🛋️", order: 5 },
  { name: "Cycles & Bikes", slug: "cycles", icon: "🚲", order: 6 },
  { name: "Fashion", slug: "fashion", icon: "👕", order: 7 },
  { name: "Books", slug: "books", icon: "📚", order: 8 },
  { name: "Pets", slug: "pets", icon: "🐾", order: 9 },
  { name: "Services", slug: "services", icon: "⚙️", order: 10 }
];

const cityCoords: Record<string, { lat: number; lng: number; area: string }> = {
  Lahore: { lat: 31.5204, lng: 74.3587, area: 'Gulberg' },
  Karachi: { lat: 24.8607, lng: 67.0011, area: 'Clifton' },
  Islamabad: { lat: 33.6844, lng: 73.0479, area: 'F-8' },
  Rawalpindi: { lat: 33.5651, lng: 73.0169, area: 'Saddar' },
  Faisalabad: { lat: 31.4504, lng: 73.135, area: 'People Colony' },
};

const sampleTitles: Record<string, string[]> = {
  mobiles: ['iPhone 13 PTA Approved', 'Samsung S23 Non-PTA Clean'],
  cars: ['Honda Civic 2018 Oriel', 'Suzuki Alto VXL 2021'],
  property: ['5 Marla House Urgent Sale', 'Portion for Rent Family'],
  electronics: ['Dell i7 Laptop 16GB RAM', 'Sony LED 50 inch'],
  furniture: ['Sofa Set 7 Seater', 'Wooden Dining Table 6 Chair'],
  cycles: ['Mountain Bike 26 inch', 'Road Bike Alloy Frame'],
  fashion: ['Branded Lawn 3 Piece', 'Men Sneakers Size 42'],
  books: ['CSS Prep Complete Set', 'O/A Level Notes Bundle'],
  pets: ['Persian Cat Vaccinated', 'Parrot Pair Healthy'],
  services: ['AC Service Home Visit', 'Graphic Design Monthly'],
};

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
  }

  const users = await Promise.all([
    prisma.user.upsert({
      where: { phone: '+923001111111' },
      update: {},
      create: {
        phone: '+923001111111',
        name: 'Ali Khan',
        city: 'Lahore',
        area: 'DHA',
        verified: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '+923002222222' },
      update: {},
      create: {
        phone: '+923002222222',
        name: 'Sara Malik',
        city: 'Karachi',
        area: 'Clifton',
        verified: true,
      },
    }),
  ]);

  const dbCategories = await prisma.category.findMany();

  for (const category of dbCategories) {
    const titles = sampleTitles[category.slug] ?? [`${category.name} Item 1`, `${category.name} Item 2`];
    for (let i = 0; i < 2; i += 1) {
      const cityNames = Object.keys(cityCoords);
      const city = cityNames[(category.order + i) % cityNames.length]!;
      const coords = cityCoords[city]!;
      const title = titles[i] ?? `${category.name} Listing ${i + 1}`;
      await prisma.listing.upsert({
        where: { id: `seed-${category.slug}-${i + 1}` },
        update: {},
        create: {
          id: `seed-${category.slug}-${i + 1}`,
          userId: users[i % users.length]!.id,
          title,
          description: `${title} - asli malik ki direct listing. Condition clean hai aur deal possible hai.`,
          price: 5000 + category.order * 10000 + i * 3500,
          categoryId: category.id,
          images: [
            `https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=800&q=80`,
          ],
          videos: [],
          condition: i % 2 === 0 ? 'USED' : 'NEW',
          storeType: i % 2 === 0 ? 'ROAD' : 'ONLINE',
          city,
          area: coords.area,
          lat: coords.lat + i * 0.01,
          lng: coords.lng + i * 0.01,
          status: 'ACTIVE',
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
