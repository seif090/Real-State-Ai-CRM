import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createPropertySchema, updatePropertySchema } from "./properties.schema.js";

export const propertiesRouter = Router();

propertiesRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

propertiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const properties = await prisma.property.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { createdAt: "desc" }
    });

    return res.json(properties);
  })
);

propertiesRouter.post(
  "/",
  validateBody(createPropertySchema),
  asyncHandler(async (req, res) => {
    const property = await prisma.property.create({
      data: {
        ...req.body,
        companyId: req.auth!.companyId!,
        createdByUserId: req.auth!.userId,
        price: new Prisma.Decimal(req.body.price)
      }
    });

    return res.status(201).json(property);
  })
);

propertiesRouter.get(
  "/:propertyId",
  asyncHandler(async (req, res) => {
    const propertyId = String(req.params.propertyId);

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: req.auth!.companyId
      },
      include: {
        media: {
          orderBy: { sortOrder: "asc" }
        },
        deals: {
          include: {
            lead: {
              select: { id: true, fullName: true, phone: true, status: true }
            },
            owner: {
              select: { id: true, fullName: true, email: true }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    return res.json(property);
  })
);

propertiesRouter.patch(
  "/:propertyId",
  validateBody(updatePropertySchema),
  asyncHandler(async (req, res) => {
    const propertyId = String(req.params.propertyId);

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: req.auth!.companyId
      }
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: property.id },
      data: {
        ...req.body,
        price: req.body.price ? new Prisma.Decimal(req.body.price) : undefined
      }
    });

    return res.json(updatedProperty);
  })
);
