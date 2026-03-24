import type { UserRole } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        companyId?: string;
        role: UserRole;
      };
    }
  }
}

export {};
