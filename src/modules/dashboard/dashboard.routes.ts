import { LeadStatus } from "../../generated/prisma/client.js";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId!;
    const assignedFilter = req.auth!.role === "SALES_AGENT" ? { assignedToUserId: req.auth!.userId } : {};
    const ownerFilter = req.auth!.role === "SALES_AGENT" ? { ownerUserId: req.auth!.userId } : {};

    const [totalLeads, newLeads, activeDeals, closedWonDeals, totalProperties] = await Promise.all([
      prisma.lead.count({ where: { companyId, ...assignedFilter } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.NEW, ...assignedFilter } }),
      prisma.deal.count({
        where: {
          companyId,
          stage: { in: ["LEAD", "QUALIFIED", "VIEWING", "NEGOTIATION"] },
          ...ownerFilter
        }
      }),
      prisma.deal.count({
        where: {
          companyId,
          stage: "CLOSED_WON",
          ...ownerFilter
        }
      }),
      prisma.property.count({ where: { companyId } })
    ]);

    return res.json({
      totalLeads,
      newLeads,
      activeDeals,
      closedWonDeals,
      totalProperties
    });
  })
);

dashboardRouter.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const companyId = req.auth!.companyId!;

    const totalLeads = await prisma.lead.count({ where: { companyId } });
    const closedDeals = await prisma.deal.count({ where: { companyId, stage: "CLOSED_WON" } });

    const averageDealValueResult = await prisma.deal.aggregate({
      _avg: { value: true },
      where: { companyId, stage: "CLOSED_WON", value: { not: null } }
    });

    const propertyTypeDistribution = await prisma.property.groupBy({
      by: ["propertyType"],
      where: { companyId },
      _count: { _all: true }
    });

    const dealStageDistribution = await prisma.deal.groupBy({
      by: ["stage"],
      where: { companyId },
      _count: { _all: true }
    });

    const topActiveLeads = await prisma.lead.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, phone: true, status: true, updatedAt: true }
    });

    const conversionRate = totalLeads > 0 ? Number(((closedDeals / totalLeads) * 100).toFixed(2)) : 0;

    return res.json({
      totalLeads,
      closedDeals,
      conversionRate,
      averageDealValue: Number((averageDealValueResult._avg.value ?? 0).toFixed(2)),
      propertyTypeDistribution: propertyTypeDistribution.map((item) => ({ propertyType: item.propertyType, count: item._count._all })),
      dealStageDistribution: dealStageDistribution.map((item) => ({ stage: item.stage, count: item._count._all })),
      topActiveLeads
    });
  })
);
