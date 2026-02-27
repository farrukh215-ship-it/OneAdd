import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userEmail = String(request.user?.email ?? "").trim().toLowerCase();
    const adminEmails = this.parseAdminEmails(
      this.configService.get<string>("ADMIN_EMAILS", "")
    );

    if (!userEmail || !adminEmails.has(userEmail)) {
      throw new ForbiddenException("Admin access required.");
    }

    return true;
  }

  private parseAdminEmails(value: string) {
    return new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    );
  }
}
