import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendMessageSchema } from "./conversations.schema.js";

export const conversationsRouter = Router();

conversationsRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

conversationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT"
          ? { lead: { assignedToUserId: req.auth!.userId } }
          : {})
      },
      include: {
        lead: {
          select: { id: true, fullName: true, phone: true, status: true }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
      orderBy: { lastMessageAt: "desc" }
    });

    return res.json(conversations);
  })
);

conversationsRouter.get(
  "/:conversationId",
  asyncHandler(async (req, res) => {
    const conversationId = String(req.params.conversationId);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT"
          ? { lead: { assignedToUserId: req.auth!.userId } }
          : {})
      },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true,
            assignedToUserId: true
          }
        },
        messages: {
          include: {
            senderUser: {
              select: { id: true, fullName: true, role: true }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    return res.json(conversation);
  })
);

conversationsRouter.post(
  "/:conversationId/messages",
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const conversationId = String(req.params.conversationId);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId: req.auth!.companyId,
        ...(req.auth!.role === "SALES_AGENT"
          ? { lead: { assignedToUserId: req.auth!.userId } }
          : {})
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "AGENT",
          senderUserId: req.auth!.userId,
          direction: "OUTBOUND",
          content: req.body.content,
          messageType: req.body.messageType,
          deliveryStatus: "SENT"
        },
        include: {
          senderUser: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date()
        }
      });

      return created;
    });

    return res.status(201).json(message);
  })
);
