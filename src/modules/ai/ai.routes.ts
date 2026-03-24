import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { analyzeConversationMessage } from "./ai.service.js";
import { enrichReplyWithPropertyMatches, matchPropertiesForLead } from "./property-matching.service.js";

export const aiRouter = Router();

aiRouter.use(authenticate, authorize("COMPANY_ADMIN", "SALES_AGENT"), requireTenant);

aiRouter.get(
  "/runs",
  asyncHandler(async (req, res) => {
    const runs = await prisma.aiRun.findMany({
      where: {
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
            phone: true
          }
        },
        conversation: {
          select: {
            id: true,
            channel: true,
            status: true
          }
        },
        recommendations: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                locationText: true,
                price: true,
                currency: true
              }
            }
          },
          orderBy: [{ score: "desc" }, { createdAt: "desc" }]
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return res.json(runs);
  })
);

aiRouter.get(
  "/runs/:runId",
  asyncHandler(async (req, res) => {
    const runId = String(req.params.runId);

    const run = await prisma.aiRun.findFirst({
      where: {
        id: runId,
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
            preferredLocation: true,
            intent: true
          }
        },
        conversation: {
          select: {
            id: true,
            channel: true,
            status: true,
            lastMessageAt: true
          }
        },
        recommendations: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                locationText: true,
                price: true,
                currency: true,
                propertyType: true,
                listingType: true
              }
            }
          },
          orderBy: [{ score: "desc" }, { createdAt: "desc" }]
        }
      }
    });

    if (!run) {
      return res.status(404).json({ message: "AI run not found" });
    }

    return res.json(run);
  })
);

aiRouter.get(
  "/leads/:leadId/match",
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

    const properties = await prisma.property.findMany({
      where: { companyId: req.auth!.companyId, status: "AVAILABLE" },
      select: {
        id: true,
        title: true,
        locationText: true,
        price: true,
        currency: true,
        propertyType: true,
        listingType: true,
        status: true
      }
    });

    const maxResults = Number(req.query.maxResults || 10);
    const weights = {
      propertyType: Number(req.query.wtPropertyType || 0.3),
      intent: Number(req.query.wtIntent || 0.2),
      location: Number(req.query.wtLocation || 0.25),
      budget: Number(req.query.wtBudget || 0.25)
    };

    const matches = matchPropertiesForLead(
      {
        lead: {
          intent: lead.intent,
          preferredLocation: lead.preferredLocation,
          budgetMin: lead.budgetMin,
          budgetMax: lead.budgetMax,
          propertyType: lead.propertyType
        },
        properties
      },
      { maxResults, weights }
    );

    const detailedMatches = matches.map((match) => {
      const property = properties.find((p) => p.id === match.propertyId);
      return {
        ...match,
        property
      };
    });

    return res.json({ leadId, matches: detailedMatches });
  })
);

aiRouter.post(
  "/conversations/:conversationId/suggest",
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
            fullName: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const latestInbound = conversation.messages.find((message) => message.direction === "INBOUND");

    if (!latestInbound) {
      return res.status(400).json({ message: "No inbound message available for analysis" });
    }

    const analysis = await analyzeConversationMessage({
      message: latestInbound.content,
      leadName: conversation.lead.fullName
    });

    const updatedLead = await prisma.lead.update({
      where: { id: conversation.lead.id },
      data: {
        intent: analysis.intent,
        preferredLocation: analysis.preferredLocation ?? undefined,
        budgetMin: analysis.budgetMin ?? undefined,
        budgetMax: analysis.budgetMax ?? undefined
      }
    });

    const properties = await prisma.property.findMany({
      where: {
        companyId: req.auth!.companyId,
        status: "AVAILABLE"
      },
      select: {
        id: true,
        title: true,
        locationText: true,
        price: true,
        currency: true,
        propertyType: true,
        listingType: true,
        status: true
      }
    });

    const matches = matchPropertiesForLead({
      lead: updatedLead,
      properties
    });

    const matchedProperties = properties.filter((property) =>
      matches.some((match) => match.propertyId === property.id)
    );

    const hydratedMatches = matches.map((match) => ({
      ...match,
      property: matchedProperties.find((property) => property.id === match.propertyId)
    }));

    const enrichedReply = enrichReplyWithPropertyMatches({
      baseReply: analysis.suggestedReply,
      matches: hydratedMatches
    });

    const enrichedAnalysis = {
      ...analysis,
      suggestedReply: enrichedReply
    };

    const aiRun = await prisma.aiRun.create({
      data: {
        companyId: req.auth!.companyId!,
        leadId: conversation.lead.id,
        conversationId: conversation.id,
        taskType: "CONVERSATION_ANALYSIS",
        status: analysis.source === "openai" ? "SUCCEEDED" : "FALLBACK",
        provider: analysis.source === "openai" ? "openai" : "local",
        model: analysis.source === "openai" ? process.env.OPENAI_MODEL || "gpt-5.2" : "fallback",
        inputSnapshot: {
          message: latestInbound.content
        },
        resultSnapshot: {
          analysis: enrichedAnalysis,
          matches: hydratedMatches
        }
      }
    });

    if (matches.length) {
      await prisma.aiPropertyRecommendation.createMany({
        data: matches.map((match) => ({
          aiRunId: aiRun.id,
          leadId: conversation.lead.id,
          propertyId: match.propertyId,
          score: match.score,
          reason: match.reason
        }))
      });
    }

    return res.json({
      sourceMessage: latestInbound.content,
      analysis: enrichedAnalysis,
      matches: hydratedMatches,
      aiRunId: aiRun.id
    });
  })
);
