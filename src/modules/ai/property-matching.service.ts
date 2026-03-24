import type { Lead, Property } from "../../generated/prisma/client.js";

export type PropertyMatch = {
  propertyId: string;
  score: number;
  reason: string;
};

export type MatchableProperty = Pick<
  Property,
  "id" | "title" | "locationText" | "price" | "currency" | "propertyType" | "listingType" | "status"
>;

type MatchInput = {
  lead: Pick<Lead, "intent" | "preferredLocation" | "budgetMin" | "budgetMax" | "propertyType">;
  properties: MatchableProperty[];
};

type MatchOptions = {
  maxResults?: number;
  weights?: {
    propertyType?: number;
    intent?: number;
    location?: number;
    budget?: number;
  };
};

export function matchPropertiesForLead(input: MatchInput, options: MatchOptions = {}): PropertyMatch[] {
  const availableProperties = input.properties.filter((property) => property.status === "AVAILABLE");

  const weights = {
    propertyType: options.weights?.propertyType ?? 0.3,
    intent: options.weights?.intent ?? 0.2,
    location: options.weights?.location ?? 0.25,
    budget: options.weights?.budget ?? 0.25
  };

  return availableProperties
    .map((property) => {
      let score = 0;
      const reasons: string[] = [];

      if (input.lead.propertyType && property.propertyType === input.lead.propertyType) {
        score += weights.propertyType;
        reasons.push("نوع العقار متوافق");
      }

      if (input.lead.intent === "RENT" && property.listingType === "RENT") {
        score += weights.intent;
        reasons.push("نوع الطلب إيجار");
      }

      if ((input.lead.intent === "BUY" || input.lead.intent === "INVEST") && property.listingType === "SALE") {
        score += weights.intent;
        reasons.push("نوع الطلب شراء");
      }

      if (
        input.lead.preferredLocation &&
        property.locationText.toLowerCase().includes(input.lead.preferredLocation.toLowerCase())
      ) {
        score += weights.location;
        reasons.push("الموقع قريب من الطلب");
      }

      const price = Number(property.price);
      const budgetMin = input.lead.budgetMin ? Number(input.lead.budgetMin) : undefined;
      const budgetMax = input.lead.budgetMax ? Number(input.lead.budgetMax) : undefined;

      if (budgetMin && budgetMax && price >= budgetMin && price <= budgetMax) {
        score += weights.budget;
        reasons.push("السعر داخل الميزانية");
      } else if (budgetMax && price <= budgetMax * 1.15) {
        score += weights.budget * 0.5;
        reasons.push("السعر قريب من الحد الأعلى");
      }

      const maxResults = options.maxResults ?? 10;

      return {
        propertyId: property.id,
        score: Number(Math.min(score, 1).toFixed(2)),
        reason: reasons.join(" | ") || "تطابق عام"
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxResults ?? 5);
}

export function enrichReplyWithPropertyMatches(input: {
  baseReply: string;
  matches: Array<PropertyMatch & { property?: MatchableProperty }>;
}) {
  if (!input.matches.length) {
    return input.baseReply;
  }

  const topMatches = input.matches.slice(0, 3);
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  });

  const lines = topMatches
    .filter((match) => match.property)
    .map((match, index) => {
      const property = match.property!;
      return `${index + 1}. ${property.title} - ${property.locationText} - ${formatter.format(Number(property.price))} ${property.currency}`;
    });

  if (!lines.length) {
    return input.baseReply;
  }

  return `${input.baseReply}\n\nأقرب الخيارات المتاحة حاليًا:\n${lines.join("\n")}`;
}
