const { PrismaClient } = require("@prisma/client");
const categoryCatalog = require("../../../packages/shared/src/category-catalog.json");

const prisma = new PrismaClient();

const defaultFeatureFlags = [
  {
    key: "AUTO_HIDE_REPORTS",
    enabled: false,
    description: "Automatically hide heavily reported listings."
  },
  {
    key: "VIDEO_FEED",
    enabled: true,
    description: "Enable short-form video feed surfaces."
  },
  {
    key: "SHADOW_BAN",
    enabled: false,
    description: "Enable shadow-ban moderation actions."
  },
  {
    key: "OTP_REQUIRED",
    enabled: true,
    description: "Require OTP login flow when enabled."
  },
  {
    key: "LISTING_MODERATION_ENABLED",
    enabled: true,
    description: "Require moderation review before listings become active."
  },
  {
    key: "CHAT_ENABLED",
    enabled: true,
    description: "Enable buyer-seller chat threads and messages."
  },
  {
    key: "TRUST_SCORE_ENFORCEMENT",
    enabled: false,
    description: "Gate selected flows based on user trust score."
  },
  {
    key: "REPORTING_ENABLED",
    enabled: true,
    description: "Allow users to submit moderation reports."
  }
];

async function main() {
  for (const flag of defaultFeatureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        enabled: flag.enabled,
        description: flag.description
      },
      create: flag
    });
  }

  await syncCategories();

  console.log(`Seeded ${defaultFeatureFlags.length} feature flags.`);
}

async function syncCategories() {
  const rootIdBySlug = new Map();

  for (const root of categoryCatalog) {
    const saved = await prisma.category.upsert({
      where: { slug: root.slug },
      update: {
        name: root.name,
        parentId: null,
        depth: 0,
        path: `/${root.slug}`
      },
      create: {
        name: root.name,
        slug: root.slug,
        parentId: null,
        depth: 0,
        path: `/${root.slug}`
      }
    });

    rootIdBySlug.set(root.slug, saved.id);
  }

  for (const root of categoryCatalog) {
    const parentId = rootIdBySlug.get(root.slug);
    if (!parentId) {
      continue;
    }

    for (const sub of root.subcategories) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {
          name: sub.name,
          parentId,
          depth: 1,
          path: `/${root.slug}/${sub.slug}`
        },
        create: {
          name: sub.name,
          slug: sub.slug,
          parentId,
          depth: 1,
          path: `/${root.slug}/${sub.slug}`
        }
      });
    }
  }

  console.log(`Seeded ${categoryCatalog.length} root categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
