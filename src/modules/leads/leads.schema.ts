import { z } from "zod";

export const createLeadSchema = z.object({
  assignedToUserId: z.string().cuid().optional(),
  source: z.enum(["WHATSAPP", "MANUAL", "IMPORT"]).optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  preferredLocation: z.string().optional(),
  propertyType: z
    .enum(["APARTMENT", "VILLA", "TOWNHOUSE", "OFFICE", "SHOP", "LAND", "OTHER"])
    .optional(),
  intent: z.enum(["BUY", "RENT", "INVEST", "UNKNOWN"]).optional(),
  status: z
    .enum(["NEW", "CONTACTED", "INTERESTED", "VIEWING_SCHEDULED", "NEGOTIATION", "WON", "LOST"])
    .optional(),
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional()
});

export const updateLeadSchema = createLeadSchema.partial();

export const createLeadNoteSchema = z.object({
  content: z.string().min(2)
});
