import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { RedisService } from "../redis/redis.service";
import { RATE_LIMIT_METADATA, RateLimitConfig } from "./rate-limit.decorator";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      return true;
    }

    const metadata = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()]
    );

    const max = metadata?.max ?? this.configService.get<number>("RATE_LIMIT_MAX", 100);
    const windowSeconds =
      metadata?.windowSeconds ??
      this.configService.get<number>("RATE_LIMIT_WINDOW_SECONDS", 60);

    const ip = extractIp(request);
    const routeKey = `${request.method}:${request.path}`;
    const key = `rate_limit:${routeKey}:${ip}`;

    try {
      const hits = await this.redisService.incr(key);
      if (hits < 0) {
        throw new Error("rate limit backend unavailable");
      }

      if (hits === 1) {
        await this.redisService.expire(key, windowSeconds);
      }

      if (hits > max) {
        throw new HttpException(
          "Too many requests. Slow down.",
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } catch (error) {
      if (metadata?.failClosedOnRedisError) {
        throw new ServiceUnavailableException(
          "Rate limit service unavailable. Please retry."
        );
      }
      return true;
    }

    return true;
  }
}

function extractIp(request: Request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (request.ip ?? request.socket.remoteAddress ?? "0.0.0.0").replace(
    "::ffff:",
    ""
  );
}
