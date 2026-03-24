import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireTenant } from "../../middleware/tenant.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createUserSchema } from "./users.schema.js";

export const usersRouter = Router();

usersRouter.use(authenticate, authorize("COMPANY_ADMIN"), requireTenant);

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { companyId: req.auth!.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    return res.json(users);
  })
);

usersRouter.post(
  "/",
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = await prisma.user.create({
      data: {
        companyId: req.auth!.companyId,
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
        passwordHash,
        role: req.body.role
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    return res.status(201).json(user);
  })
);
