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

  const seededListings = await prisma.listing.findMany({
    where: {
      id: {
        startsWith: 'seed-',
      },
    },
    select: {
      id: true,
    },
  });

  if (!seededListings.length) return;

  const listingIds = seededListings.map((item) => item.id);
  const listingThreads = await prisma.listingThread.findMany({
    where: {
      listingId: {
        in: listingIds,
      },
    },
    select: { id: true },
  });
  const threadIds = listingThreads.map((item) => item.id);

  await prisma.$transaction([
    prisma.inspectionAuditLog.deleteMany({
      where: {
        inspectionRequest: {
          listingId: { in: listingIds },
        },
      },
    }),
    prisma.inspectionReport.deleteMany({
      where: {
        inspectionRequest: {
          listingId: { in: listingIds },
        },
      },
    }),
    prisma.inspectionRequest.deleteMany({
      where: {
        listingId: { in: listingIds },
      },
    }),
    prisma.listingMessage.deleteMany({
      where: {
        threadId: {
          in: threadIds,
        },
      },
    }),
    prisma.offer.deleteMany({
      where: {
        listingId: {
          in: listingIds,
        },
      },
    }),
    prisma.savedAd.deleteMany({
      where: {
        listingId: {
          in: listingIds,
        },
      },
    }),
    prisma.contactLog.deleteMany({
      where: {
        listingId: {
          in: listingIds,
        },
      },
    }),
    prisma.listingViewLog.deleteMany({
      where: {
        listingId: {
          in: listingIds,
        },
      },
    }),
    prisma.listingThread.deleteMany({
      where: {
        listingId: {
          in: listingIds,
        },
      },
    }),
    prisma.listing.deleteMany({
      where: {
        id: {
          in: listingIds,
        },
      },
    }),
  ]);
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
