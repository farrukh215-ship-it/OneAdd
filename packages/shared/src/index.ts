import { z } from "zod";

export const sharedPackageName = "@aikad/shared";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string(),
  uptime: z.number()
});

export const marketplaceUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["buyer", "seller", "admin"])
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type MarketplaceUser = z.infer<typeof marketplaceUserSchema>;
