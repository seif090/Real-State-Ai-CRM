import { Router } from "express";
import { LeadSource } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { analyzeConversationMessage } from "../ai/ai.service.js";
import { enrichReplyWithPropertyMatches, matchPropertiesForLead } from "../ai/property-matching.service.js";
import { whatsappWebhookSchema } from "./whatsapp.schema.js";

export const whatsappRouter = Router();

whatsappRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ message: "Verification failed" });
});

whatsappRouter.post(
  "/webhook",
  validateBody(whatsappWebhookSchema),
  asyncHandler(async (req, res) => {
    const { companySlug, contactName, phone, messageId, text } = req.body;

    const company = await prisma.company.findUnique({
      where: { slug: companySlug }
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const analysis = await analyzeConversationMessage({
        message: text,
        leadName: contactName
      });

      const lead = await tx.lead.upsert({
        where: {
          companyId_phone: {
            companyId: company.id,
            phone
          }
        },
        create: {
          companyId: company.id,
          fullName: contactName,
          phone,
          source: LeadSource.WHATSAPP,
          intent: analysis.intent,
          preferredLocation: analysis.preferredLocation,
          budgetMin: analysis.budgetMin,
          budgetMax: analysis.budgetMax,
          lastContactAt: new Date()
        },
        update: {
          fullName: contactName ?? undefined,
          intent: analysis.intent,
          preferredLocation: analysis.preferredLocation ?? undefined,
          budgetMin: analysis.budgetMin ?? undefined,
          budgetMax: analysis.budgetMax ?? undefined,
          lastContactAt: new Date()
        }
      });

      const existingConversation = await tx.conversation.findFirst({
        where: {
          companyId: company.id,
          leadId: lead.id,
          externalThreadId: phone,
          status: "OPEN"
        }
      });

      const conversation = existingConversation
        ? await tx.conversation.update({
            where: { id: existingConversation.id },
            data: { lastMessageAt: new Date() }
          })
        : await tx.conversation.create({
            data: {
              companyId: company.id,
              leadId: lead.id,
              channel: "WHATSAPP",
              externalThreadId: phone,
              lastMessageAt: new Date()
            }
          });

      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          direction: "INBOUND",
          content: text,
          externalMessageId: messageId,
          deliveryStatus: "DELIVERED"
        }
      });

      const aiMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "AI",
          direction: "OUTBOUND",
          content: analysis.suggestedReply,
          messageType: "text",
          deliveryStatus: "PENDING"
        }
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date()
        }
      });

      return { lead, conversation, message, aiMessage, analysis };
    });

    const properties = await prisma.property.findMany({
      where: {
        companyId: company.id,
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
      lead: result.lead,
      properties
    });

    const hydratedMatches = matches.map((match) => ({
      ...match,
      property: properties.find((property) => property.id === match.propertyId)
    }));

    const enrichedAnalysis = {
      ...result.analysis,
      suggestedReply: enrichReplyWithPropertyMatches({
        baseReply: result.analysis.suggestedReply,
        matches: hydratedMatches
      })
    };

    await prisma.message.update({
      where: { id: result.aiMessage.id },
      data: {
        content: enrichedAnalysis.suggestedReply
      }
    });

    const aiRun = await prisma.aiRun.create({
      data: {
        companyId: company.id,
        leadId: result.lead.id,
        conversationId: result.conversation.id,
        taskType: "CONVERSATION_ANALYSIS",
        status: result.analysis.source === "openai" ? "SUCCEEDED" : "FALLBACK",
        provider: result.analysis.source === "openai" ? "openai" : "local",
        model: result.analysis.source === "openai" ? process.env.OPENAI_MODEL || "gpt-5.2" : "fallback",
        inputSnapshot: {
          message: text,
          phone
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
          leadId: result.lead.id,
          propertyId: match.propertyId,
          score: match.score,
          reason: match.reason
        }))
      });
    }

    return res.status(202).json({
      success: true,
      leadId: result.lead.id,
      conversationId: result.conversation.id,
      messageId: result.message.id,
      aiReplyPreview: enrichedAnalysis.suggestedReply,
      aiRunId: aiRun.id
    });
  })
);
