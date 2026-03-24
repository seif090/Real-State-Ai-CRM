import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { aiRouter } from "../modules/ai/ai.routes.js";
import { companiesRouter } from "../modules/companies/companies.routes.js";
import { conversationsRouter } from "../modules/conversations/conversations.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { dealsRouter } from "../modules/deals/deals.routes.js";
import { leadsRouter } from "../modules/leads/leads.routes.js";
import { propertiesRouter } from "../modules/properties/properties.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { whatsappRouter } from "../modules/whatsapp/whatsapp.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/ai", aiRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/companies", companiesRouter);
apiRouter.use("/conversations", conversationsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/deals", dealsRouter);
apiRouter.use("/leads", leadsRouter);
apiRouter.use("/properties", propertiesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/whatsapp", whatsappRouter);
