import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createDealSchema, updateDealSchema } from "./deals.schema.js";

export const dealsRouter = Router();

dealsRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

dealsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const deals = await prisma.deal.findMany({
      where: {
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT" ? { ownerUserId: req.auth!.userId } : {})
      },
      include: {
        lead: { select: { id: true, fullName: true, phone: true } },
        property: { select: { id: true, title: true, price: true } },
        owner: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(deals);
  })
);

dealsRouter.post(
  "/",
  validateBody(createDealSchema),
  asyncHandler(async (req, res) => {
    const deal = await prisma.$transaction(async (tx) => {
      const createdDeal = await tx.deal.create({
        data: {
          companyId: req.auth!.companyId!,
          leadId: req.body.leadId,
          propertyId: req.body.propertyId,
          ownerUserId: req.body.ownerUserId,
          stage: req.body.stage,
          value: req.body.value ? new Prisma.Decimal(req.body.value) : undefined,
          expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
          lossReason: req.body.lossReason
        }
      });

      await tx.dealStageHistory.create({
        data: {
          companyId: req.auth!.companyId!,
          dealId: createdDeal.id,
          toStage: createdDeal.stage,
          changedById: req.auth!.userId
        }
      });

      return createdDeal;
    });

    return res.status(201).json(deal);
  })
);

dealsRouter.patch(
  "/:dealId",
  validateBody(updateDealSchema),
  asyncHandler(async (req, res) => {
    const dealId = String(req.params.dealId);

    const existingDeal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT" ? { ownerUserId: req.auth!.userId } : {})
      }
    });

    if (!existingDeal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    const deal = await prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id: existingDeal.id },
        data: {
          propertyId: req.body.propertyId,
          ownerUserId: req.body.ownerUserId,
          stage: req.body.stage,
          value: req.body.value ? new Prisma.Decimal(req.body.value) : undefined,
          expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
          lossReason: req.body.lossReason,
          closedAt:
            req.body.stage === "CLOSED_WON" || req.body.stage === "CLOSED_LOST" ? new Date() : undefined
        }
      });

      if (req.body.stage && req.body.stage !== existingDeal.stage) {
        await tx.dealStageHistory.create({
          data: {
            companyId: req.auth!.companyId!,
            dealId: existingDeal.id,
            fromStage: existingDeal.stage,
            toStage: req.body.stage,
            changedById: req.auth!.userId
          }
        });
      }

      return updatedDeal;
    });

    return res.json(deal);
  })
);
