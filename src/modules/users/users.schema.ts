import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(["COMPANY_ADMIN", "SALES_AGENT"])
});
