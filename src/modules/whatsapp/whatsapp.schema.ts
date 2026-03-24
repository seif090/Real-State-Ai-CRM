import { z } from "zod";

export const whatsappWebhookSchema = z.object({
  companySlug: z.string().min(2),
  contactName: z.string().optional(),
  phone: z.string().min(6),
  messageId: z.string().optional(),
  text: z.string().min(1)
});
