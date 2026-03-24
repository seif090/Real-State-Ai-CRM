import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createCompanySchema } from "./companies.schema.js";

export const companiesRouter = Router();

companiesRouter.use(authenticate, authorize("SUPER_ADMIN"));

companiesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" }
    });

    return res.json(companies);
  })
);

companiesRouter.post(
  "/",
  validateBody(createCompanySchema),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.create({
      data: req.body
    });

    return res.status(201).json(company);
  })
);
