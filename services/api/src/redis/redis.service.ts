import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const { createClient } = require("redis");

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: any;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>("REDIS_URL");
    this.client = createClient({ url: redisUrl });
    this.client.on("error", () => {
      this.logger.warn("Redis client error.");
    });
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string) {
    try {
      await this.ensureConnected();
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for key "${key}".`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    try {
      await this.ensureConnected();
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      this.logger.warn(`Redis SET failed for key "${key}".`);
    }
  }

  async del(key: string) {
    try {
      await this.ensureConnected();
      await this.client.del(key);
    } catch {
      this.logger.warn(`Redis DEL failed for key "${key}".`);
    }
  }

  async incr(key: string) {
    try {
      await this.ensureConnected();
      return await this.client.incr(key);
    } catch {
      this.logger.warn(`Redis INCR failed for key "${key}".`);
      return -1;
    }
  }

  async expire(key: string, ttlSeconds: number) {
    try {
      await this.ensureConnected();
      await this.client.expire(key, ttlSeconds);
    } catch {
      this.logger.warn(`Redis EXPIRE failed for key "${key}".`);
    }
  }

  private async ensureConnected() {
    if (this.client.isReady || this.client.isOpen) {
      return;
    }
    await this.client.connect();
  }
}
