import { z } from "zod";

export const createDealSchema = z.object({
  leadId: z.string().cuid(),
  propertyId: z.string().cuid().optional(),
  ownerUserId: z.string().cuid(),
  stage: z.enum(["LEAD", "QUALIFIED", "VIEWING", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]).optional(),
  value: z.number().nonnegative().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  lossReason: z.string().optional()
});

export const updateDealSchema = createDealSchema.partial().omit({ leadId: true });
