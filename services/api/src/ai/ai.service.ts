import { Injectable } from "@nestjs/common";
import { FeatureFlagService } from "../feature-flags/feature-flag.service";

type AssistMode = "title" | "description" | "price" | "category" | "safety";

@Injectable()
export class AiService {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  async listingAssist(payload: {
    mode: AssistMode;
    title?: string;
    description?: string;
    price?: number;
    language?: "urdu" | "roman_urdu" | "english";
  }) {
    const enabled = await this.featureFlags.isEnabled("AI_COPILOT");
    const mode = payload.mode;
    const title = payload.title?.trim() ?? "";
    const description = payload.description?.trim() ?? "";
    const language = payload.language ?? "roman_urdu";

    if (!enabled) {
      return {
        enabled: false,
        mode,
        result: "AI copilot abhi phased rollout me hai. Basic helper active hai."
      };
    }

    if (mode === "title") {
      const nextTitle = title || "Asli Condition Household Item";
      return { enabled: true, mode, result: nextTitle };
    }
    if (mode === "description") {
      const body = description || "Asli condition, carefully used item.";
      return {
        enabled: true,
        mode,
        result: `${body}\n- Original photos attached\n- Serious buyers only\n- Safe meetup preferred`,
        language
      };
    }
    if (mode === "price") {
      const baseline = Number(payload.price ?? 0);
      const suggested =
        baseline > 0 ? Math.round(baseline * 0.95) : title.toLowerCase().includes("iphone") ? 85000 : 12000;
      return {
        enabled: true,
        mode,
        result: {
          suggested,
          range: [Math.round(suggested * 0.9), Math.round(suggested * 1.1)]
        }
      };
    }
    if (mode === "category") {
      const haystack = `${title} ${description}`.toLowerCase();
      const hint = haystack.includes("bike")
        ? "apni-sawari"
        : haystack.includes("sofa") || haystack.includes("bed")
          ? "ghar-ka-saaman"
          : "bijli-ka-saaman";
      return { enabled: true, mode, result: hint };
    }

    const suspicious = /(advance payment|gift card|western union|urgent money)/i.test(
      `${title} ${description}`
    );
    return {
      enabled: true,
      mode,
      result: suspicious
        ? "Possible risk detected. Buyer ko secure meetup aur no-advance policy suggest karein."
        : "No critical risk phrase detected."
    };
  }

  async listingRiskScore(payload: { title?: string; description?: string }) {
    const enabled = await this.featureFlags.isEnabled("AI_FRAUD_RISK");
    const text = `${payload.title ?? ""} ${payload.description ?? ""}`;
    const checks: Array<{ key: string; match: boolean; weight: number }> = [
      { key: "advance_payment", match: /advance payment/i.test(text), weight: 30 },
      { key: "gift_card", match: /gift card/i.test(text), weight: 25 },
      { key: "off_platform", match: /whatsapp only|telegram only/i.test(text), weight: 15 },
      { key: "urgency_spam", match: /urgent sale|urgent money/i.test(text), weight: 10 }
    ];

    const score = Math.min(
      100,
      checks.filter((item) => item.match).reduce((sum, item) => sum + item.weight, 0)
    );
    const reasonCodes = checks.filter((item) => item.match).map((item) => item.key);

    return {
      enabled,
      score,
      riskLevel: score >= 60 ? "high" : score >= 30 ? "medium" : "low",
      reasonCodes
    };
  }

  async chatSuggestions(payload: {
    listingTitle?: string;
    offerAmount?: number;
    language?: "urdu" | "roman_urdu" | "english";
  }) {
    const enabled = await this.featureFlags.isEnabled("AI_CHAT_COPILOT");
    const listing = payload.listingTitle?.trim() || "item";
    const offerText =
      typeof payload.offerAmount === "number" && payload.offerAmount > 0
        ? `Offer: PKR ${payload.offerAmount.toLocaleString()}`
        : "Offer discuss karna hai";

    return {
      enabled,
      suggestions: [
        `Assalam o Alaikum, ${listing} available hai?`,
        `${offerText}. Agar theek ho to meetup plan karte hain.`,
        "Final best price kya hoga?",
        "Please original condition aur defects confirm kar dein."
      ]
    };
  }
}
