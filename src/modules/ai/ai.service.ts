import OpenAI from "openai";

export type LeadIntent = "BUY" | "RENT" | "INVEST" | "UNKNOWN";

type AiAnalysisInput = {
  message: string;
  leadName?: string | null;
};

export type AiAnalysisResult = {
  intent: LeadIntent;
  preferredLocation?: string;
  budgetMin?: number;
  budgetMax?: number;
  summary: string;
  suggestedReply: string;
  source: "openai" | "fallback";
};

type RawAiAnalysis = Omit<AiAnalysisResult, "source">;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const model = process.env.OPENAI_MODEL || "gpt-5.2";

export async function analyzeConversationMessage(
  input: AiAnalysisInput
): Promise<AiAnalysisResult> {
  if (openaiClient) {
    try {
      const analysis = await analyzeWithOpenAI(input);
      return {
        ...analysis,
        source: "openai"
      };
    } catch (error) {
      console.error("OpenAI analysis failed, using fallback.", error);
    }
  }

  return {
    ...analyzeWithFallback(input),
    source: "fallback"
  };
}

async function analyzeWithOpenAI(input: AiAnalysisInput): Promise<RawAiAnalysis> {
  const response = await openaiClient!.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You analyze inbound real-estate CRM messages. Extract customer intent, possible location, approximate budget range, write a short Arabic summary, and produce a concise Arabic sales reply. If data is missing, keep fields empty and do not invent facts."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              leadName: input.leadName ?? null,
              message: input.message
            })
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "real_estate_ai_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            intent: {
              type: "string",
              enum: ["BUY", "RENT", "INVEST", "UNKNOWN"]
            },
            preferredLocation: {
              type: ["string", "null"]
            },
            budgetMin: {
              type: ["number", "null"]
            },
            budgetMax: {
              type: ["number", "null"]
            },
            summary: {
              type: "string"
            },
            suggestedReply: {
              type: "string"
            }
          },
          required: [
            "intent",
            "preferredLocation",
            "budgetMin",
            "budgetMax",
            "summary",
            "suggestedReply"
          ]
        }
      }
    }
  });

  const parsed = JSON.parse(response.output_text) as {
    intent: LeadIntent;
    preferredLocation: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    summary: string;
    suggestedReply: string;
  };

  return {
    intent: parsed.intent,
    preferredLocation: parsed.preferredLocation ?? undefined,
    budgetMin: parsed.budgetMin ?? undefined,
    budgetMax: parsed.budgetMax ?? undefined,
    summary: parsed.summary,
    suggestedReply: parsed.suggestedReply
  };
}

function analyzeWithFallback(input: AiAnalysisInput): RawAiAnalysis {
  const normalized = normalizeArabicDigits(input.message).toLowerCase();
  const intent = detectIntent(normalized);
  const location = detectLocation(input.message);
  const budget = detectBudget(normalized);
  const summaryParts = [
    `النية: ${translateIntent(intent)}`,
    location ? `الموقع: ${location}` : null,
    budget.min || budget.max
      ? `الميزانية: ${formatBudgetSummary(budget.min, budget.max)}`
      : null
  ].filter(Boolean);

  return {
    intent,
    preferredLocation: location,
    budgetMin: budget.min,
    budgetMax: budget.max,
    summary: summaryParts.join(" | ") || "لم يتم استخراج بيانات كافية من الرسالة.",
    suggestedReply: buildSuggestedReply({
      leadName: input.leadName,
      intent,
      location,
      budgetMin: budget.min,
      budgetMax: budget.max
    })
  };
}

const arabicIndicDigitsMap: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9"
};

const locationKeywords = [
  "الشيخ زايد",
  "زايد",
  "التجمع",
  "التجمع الخامس",
  "الساحل الشمالي",
  "الساحل",
  "العاصمة الإدارية",
  "6 أكتوبر",
  "دبي",
  "دبي كريك",
  "dubai creek harbour",
  "القاهرة الجديدة",
  "المهندسين",
  "مدينة نصر"
];

function detectIntent(message: string): LeadIntent {
  if (includesAny(message, ["ايجار", "إيجار", "rent", "lease", "استئجار"])) {
    return "RENT";
  }

  if (includesAny(message, ["استثمار", "invest", "عوائد", "عائد", "resale"])) {
    return "INVEST";
  }

  if (includesAny(message, ["شراء", "اشتري", "أشتري", "buy", "امتلك", "own"])) {
    return "BUY";
  }

  return "UNKNOWN";
}

function detectLocation(message: string) {
  return locationKeywords.find((keyword) =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

function detectBudget(message: string) {
  const millionMatch = message.match(/(\d+(?:\.\d+)?)\s*(مليون|million|m)\b/);
  if (millionMatch) {
    const value = Number(millionMatch[1]) * 1_000_000;
    return { min: value * 0.9, max: value * 1.1 };
  }

  const numberMatches = [...message.matchAll(/\b\d{5,9}\b/g)].map((match) => Number(match[0]));
  if (numberMatches.length >= 2) {
    const sorted = numberMatches.sort((a, b) => a - b);
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }

  if (numberMatches.length === 1) {
    return { min: numberMatches[0] * 0.9, max: numberMatches[0] * 1.1 };
  }

  return { min: undefined, max: undefined };
}

function buildSuggestedReply(input: {
  leadName?: string | null;
  intent: LeadIntent;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
}) {
  const greeting = input.leadName ? `أهلاً ${input.leadName}` : "أهلاً بحضرتك";
  const intentPart =
    input.intent === "BUY"
      ? "أفهم أنك تبحث عن شراء عقار"
      : input.intent === "RENT"
        ? "أفهم أنك تبحث عن وحدة للإيجار"
        : input.intent === "INVEST"
          ? "أفهم أنك تبحث عن فرصة استثمار عقاري"
          : "استلمت طلبك وسأساعدك في ترشيح الخيارات المناسبة";
  const locationPart = input.location ? ` في ${input.location}` : "";
  const budgetPart =
    input.budgetMin || input.budgetMax
      ? ` ضمن ميزانية تقريبية ${formatBudgetSummary(input.budgetMin, input.budgetMax)}`
      : "";

  return `${greeting}، ${intentPart}${locationPart}${budgetPart}. أستطيع ترشيح أفضل الخيارات المتاحة ومشاركة التفاصيل أو ترتيب مكالمة أو معاينة حسب المناسب لك.`;
}

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => arabicIndicDigitsMap[digit] ?? digit);
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function translateIntent(intent: LeadIntent) {
  if (intent === "BUY") return "شراء";
  if (intent === "RENT") return "إيجار";
  if (intent === "INVEST") return "استثمار";
  return "غير واضحة";
}

function formatBudgetSummary(min?: number, max?: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  });

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }

  if (min) return formatter.format(min);
  if (max) return formatter.format(max);
  return "غير محددة";
}
