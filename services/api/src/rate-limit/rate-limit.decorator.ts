import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_METADATA = "rate_limit_metadata";

export type RateLimitConfig = {
  max: number;
  windowSeconds: number;
  failClosedOnRedisError?: boolean;
};

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_METADATA, config);
