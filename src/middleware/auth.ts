import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type JwtPayload = {
  sub: string;
  companyId?: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "SALES_AGENT";
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.auth = {
      userId: payload.sub,
      companyId: payload.companyId,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function authorize(...roles: JwtPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}
