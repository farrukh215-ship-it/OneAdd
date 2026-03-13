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

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
  }

  await prisma.listing.deleteMany({
    where: {
      id: {
        startsWith: 'seed-',
      },
    },
  });
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
