import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, UserRole } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post(
  "/register-company",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { companyName, companySlug, fullName, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug: companySlug,
          status: "TRIAL"
        }
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          fullName,
          email,
          passwordHash,
          role: UserRole.COMPANY_ADMIN
        }
      });

      return { company, user };
    });

    const token = jwt.sign(
      {
        sub: result.user.id,
        companyId: result.company.id,
        role: result.user.role
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      company: result.company,
      user: sanitizeUser(result.user)
    });
  })
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      {
        sub: user.id,
        companyId: user.companyId ?? undefined,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: sanitizeUser(user)
    });
  })
);

function sanitizeUser<T extends Prisma.UserGetPayload<Record<string, never>>>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
