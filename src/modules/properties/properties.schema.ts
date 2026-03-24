import { z } from "zod";

export const createPropertySchema = z.object({
  code: z.string().optional(),
  title: z.string().min(2),
  locationText: z.string().min(2),
  propertyType: z.enum(["APARTMENT", "VILLA", "TOWNHOUSE", "OFFICE", "SHOP", "LAND", "OTHER"]),
  listingType: z.enum(["SALE", "RENT"]),
  price: z.number().nonnegative(),
  currency: z.string().default("EGP"),
  areaSqm: z.number().positive().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "RENTED", "INACTIVE"]).optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional()
});

export const updatePropertySchema = createPropertySchema.partial();
