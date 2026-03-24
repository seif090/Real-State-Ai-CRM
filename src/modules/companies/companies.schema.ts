import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  country: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]).optional()
});
