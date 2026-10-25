import type { TokenClaims } from "../services/token.service";
declare global {
  namespace Express {
    interface Request {
      principal?: TokenClaims;
      requestId?: string;
    }
  }
}
export {};
