import { PrismaClient } from '@prisma/client';
import { STANDARD_CATEGORY_SEEDS } from '@tgmg/types';

const prisma = new PrismaClient();

async function main() {
  for (const category of STANDARD_CATEGORY_SEEDS) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
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
