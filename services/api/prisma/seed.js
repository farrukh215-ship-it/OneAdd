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
    enabled: true,
    description: "Gate selected flows based on user trust score."
  },
  {
    key: "REPORTING_ENABLED",
    enabled: true,
    description: "Allow users to submit moderation reports."
  },
  {
    key: "COMMAND_PALETTE",
    enabled: true,
    description: "Enable global command palette quick navigation."
  },
  {
    key: "RELIST_ENABLED",
    enabled: true,
    description: "Enable one-tap relist action for sold/expired listings."
  },
  {
    key: "SAVED_SYNC",
    enabled: true,
    description: "Sync saved listings across devices."
  },
  {
    key: "RECENT_SYNC",
    enabled: true,
    description: "Sync recently viewed listings across devices."
  },
  {
    key: "SELLER_ANALYTICS",
    enabled: true,
    description: "Enable seller mini analytics metrics."
  },
  {
    key: "SEMANTIC_SEARCH",
    enabled: true,
    description: "Enable semantic search ranking."
  },
  {
    key: "AI_COPILOT",
    enabled: false,
    description: "Enable AI listing copilot features."
  },
  {
    key: "AI_FRAUD_RISK",
    enabled: false,
    description: "Enable AI fraud risk scoring and moderation assist."
  },
  {
    key: "AI_CHAT_COPILOT",
    enabled: false,
    description: "Enable AI chat suggestions."
  },
  {
    key: "RECOMMENDATIONS_FEED",
    enabled: true,
    description: "Enable personalized recommendation feed."
  },
  {
    key: "PRICE_INTELLIGENCE",
    enabled: true,
    description: "Enable dynamic price suggestion ranges."
  },
  {
    key: "FORECAST_ANALYTICS",
    enabled: false,
    description: "Enable forecast and demand analytics APIs."
  },
  {
    key: "AB_EXPERIMENTS",
    enabled: true,
    description: "Enable A/B experimentation framework hooks."
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
