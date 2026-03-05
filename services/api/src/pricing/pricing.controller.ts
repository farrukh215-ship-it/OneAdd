import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PricingService } from "./pricing.service";

@ApiTags("pricing")
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get("suggest")
  suggest(
    @Query("categoryId") categoryId?: string,
    @Query("city") city?: string,
    @Query("condition") condition?: string
  ) {
    return this.pricingService.suggest(categoryId, city, condition);
  }
}
