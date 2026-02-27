import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });

      if (payload?.type) {
        throw new UnauthorizedException("Invalid access token.");
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }
}

function extractBearerToken(request: Request) {
  const [type, token] = request.headers.authorization?.split(" ") ?? [];
  if (type !== "Bearer") {
    return null;
  }
  return token;
}
