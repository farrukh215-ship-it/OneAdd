const { PrismaClient } = require("@prisma/client");

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

  console.log(`Seeded ${defaultFeatureFlags.length} feature flags.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
