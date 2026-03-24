import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1),
  messageType: z.string().optional().default("text")
});
