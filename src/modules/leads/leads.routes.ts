import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createLeadNoteSchema, createLeadSchema, updateLeadSchema } from "./leads.schema.js";

export const leadsRouter = Router();

leadsRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

leadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where =
      req.auth!.role === "SALES_AGENT"
        ? { companyId: req.auth!.companyId, assignedToUserId: req.auth!.userId }
        : { companyId: req.auth!.companyId };

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(leads);
  })
);

leadsRouter.post(
  "/",
  validateBody(createLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.create({
      data: {
        ...req.body,
        companyId: req.auth!.companyId!,
        budgetMin: req.body.budgetMin ? new Prisma.Decimal(req.body.budgetMin) : undefined,
        budgetMax: req.body.budgetMax ? new Prisma.Decimal(req.body.budgetMax) : undefined
      }
    });

    return res.status(201).json(lead);
  })
);

leadsRouter.get(
  "/:leadId",
  asyncHandler(async (req, res) => {
    const leadId = String(req.params.leadId);

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT" ? { assignedToUserId: req.auth!.userId } : {})
      },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        notes: {
          include: {
            author: {
              select: { id: true, fullName: true, role: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        deals: {
          include: {
            property: {
              select: { id: true, title: true, locationText: true, price: true, currency: true }
            },
            owner: {
              select: { id: true, fullName: true, email: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 20
            }
          },
          orderBy: { lastMessageAt: "desc" }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    return res.json(lead);
  })
);

leadsRouter.patch(
  "/:leadId",
  validateBody(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const leadId = String(req.params.leadId);

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT" ? { assignedToUserId: req.auth!.userId } : {})
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...req.body,
        budgetMin: req.body.budgetMin ? new Prisma.Decimal(req.body.budgetMin) : undefined,
        budgetMax: req.body.budgetMax ? new Prisma.Decimal(req.body.budgetMax) : undefined,
        lastContactAt: new Date()
      }
    });

    return res.json(updatedLead);
  })
);

leadsRouter.post(
  "/:leadId/notes",
  validateBody(createLeadNoteSchema),
  asyncHandler(async (req, res) => {
    const leadId = String(req.params.leadId);

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT" ? { assignedToUserId: req.auth!.userId } : {})
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        authorUserId: req.auth!.userId,
        content: req.body.content
      },
      include: {
        author: {
          select: { id: true, fullName: true, role: true }
        }
      }
    });

    return res.status(201).json(note);
  })
);
