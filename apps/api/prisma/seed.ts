import { PrismaClient } from '@prisma/client';
import { scryptSync } from 'crypto';
import { STANDARD_CATEGORY_SEEDS } from '@tgmg/types';

const prisma = new PrismaClient();
const PASSWORD_SALT = process.env.PASSWORD_SALT ?? 'tgmg-default-salt-change-me';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@tgmg.pk';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin@12345';
const DEFAULT_ADMIN_PHONE = process.env.DEFAULT_ADMIN_PHONE ?? '+923000000001';

const DEFAULT_WORKSHOPS = [
  {
    name: 'Workshop 1',
    city: 'Lahore',
    address: 'Lahore Partner Workshop 1',
    contact: '+92 300 1111111',
    active: true,
  },
  {
    name: 'Workshop 2',
    city: 'Lahore',
    address: 'Lahore Partner Workshop 2',
    contact: '+92 300 2222222',
    active: true,
  },
  {
    name: 'Workshop 3',
    city: 'Lahore',
    address: 'Lahore Partner Workshop 3',
    contact: '+92 300 3333333',
    active: true,
  },
  {
    name: 'Workshop 4',
    city: 'Lahore',
    address: 'Lahore Partner Workshop 4',
    contact: '+92 300 4444444',
    active: true,
  },
  {
    name: 'Workshop 5',
    city: 'Lahore',
    address: 'Lahore Partner Workshop 5',
    contact: '+92 300 5555555',
    active: true,
  },
];

function hashPassword(password: string) {
  const derived = scryptSync(password, PASSWORD_SALT, 64).toString('hex');
  return `scrypt:${derived}`;
}

async function main() {
  for (const category of STANDARD_CATEGORY_SEEDS) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const workshop of DEFAULT_WORKSHOPS) {
    const existingWorkshop = await prisma.workshopPartner.findFirst({
      where: {
        name: workshop.name,
        city: workshop.city,
      },
      select: { id: true },
    });

    if (existingWorkshop) {
      await prisma.workshopPartner.update({
        where: { id: existingWorkshop.id },
        data: workshop,
      });
    } else {
      await prisma.workshopPartner.create({
        data: workshop,
      });
    }
  }

  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      phone: DEFAULT_ADMIN_PHONE,
      name: 'TGMG Admin',
      verified: true,
      banned: false,
      role: 'ADMIN',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      phone: DEFAULT_ADMIN_PHONE,
      name: 'TGMG Admin',
      verified: true,
      banned: false,
      role: 'ADMIN',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    },
  });

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
