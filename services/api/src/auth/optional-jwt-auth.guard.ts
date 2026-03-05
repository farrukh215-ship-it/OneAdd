import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });
      if (!payload?.type) {
        request.user = payload;
      }
    } catch {
      // Optional guard intentionally ignores invalid tokens.
    }

    return true;
  }
}

function extractBearerToken(request: Request) {
  const [type, token] = request.headers.authorization?.split(" ") ?? [];
  if (type !== "Bearer") {
    return null;
  }
  return token;
}
