import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("listings/assist")
  assistListing(
    @Body()
    payload: {
      mode: "title" | "description" | "price" | "category" | "safety";
      title?: string;
      description?: string;
      price?: number;
      language?: "urdu" | "roman_urdu" | "english";
    }
  ) {
    return this.aiService.listingAssist(payload);
  }

  @Post("listings/risk-score")
  listingRiskScore(@Body() payload: { title?: string; description?: string }) {
    return this.aiService.listingRiskScore(payload);
  }

  @Post("chat/suggestions")
  chatSuggestions(
    @Body()
    payload: {
      listingTitle?: string;
      offerAmount?: number;
      language?: "urdu" | "roman_urdu" | "english";
    }
  ) {
    return this.aiService.chatSuggestions(payload);
  }
}
