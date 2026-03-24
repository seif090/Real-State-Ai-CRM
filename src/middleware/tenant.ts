import type { NextFunction, Request, Response } from "express";

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.companyId) {
    return res.status(400).json({ message: "Company context is required" });
  }

  return next();
}
