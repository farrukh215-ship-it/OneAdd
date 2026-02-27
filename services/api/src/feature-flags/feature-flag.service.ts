import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { FEATURE_FLAG_KEYS, FeatureFlagKey } from "./feature-flag.keys";

const FEATURE_FLAGS_CACHE_KEY = "feature_flags:all";
const FEATURE_FLAGS_CACHE_TTL_SECONDS = 60;

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async isEnabled(key: string | FeatureFlagKey): Promise<boolean> {
    const flags = await this.getFlagsMap();
    return Boolean(flags[key]);
  }

  async getAllFlags() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
      select: { key: true, enabled: true, updatedAt: true },
      orderBy: { key: "asc" }
    });
    await this.writeCache(flags);
    return flags;
  }

  async setFlag(key: FeatureFlagKey, enabled: boolean) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Feature flag "${key}" not found.`);
    }

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
      select: { key: true, enabled: true, updatedAt: true }
    });

    await this.refreshCache();
    return updated;
  }

  async refreshCache() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
      select: { key: true, enabled: true }
    });
    await this.writeCache(flags);
  }

  private async getFlagsMap(): Promise<Record<string, boolean>> {
    const cached = await this.redis.get(FEATURE_FLAGS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Record<string, boolean>;
    }

    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
      select: { key: true, enabled: true }
    });

    const map = flags.reduce<Record<string, boolean>>((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {});

    await this.redis.set(
      FEATURE_FLAGS_CACHE_KEY,
      JSON.stringify(map),
      FEATURE_FLAGS_CACHE_TTL_SECONDS
    );
    return map;
  }

  private async writeCache(
    flags: Array<{ key: string; enabled: boolean; updatedAt?: Date }>
  ) {
    const map = flags.reduce<Record<string, boolean>>((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {});

    await this.redis.set(
      FEATURE_FLAGS_CACHE_KEY,
      JSON.stringify(map),
      FEATURE_FLAGS_CACHE_TTL_SECONDS
    );
  }
}
