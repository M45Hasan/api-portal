import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type PrincipalType = "admin" | "developer";
export interface TokenClaims {
  sub: string;
  principalType: PrincipalType;
  role?: string;
}

export function signToken(claims: TokenClaims): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
    issuer: "apiportal",
    audience: "apiportal-api"
  };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
}

export function verifyToken(token: string): TokenClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"], issuer: "apiportal", audience: "apiportal-api"
  });
  if (typeof payload === "string" || typeof payload.sub !== "string" ||
      !["admin", "developer"].includes(String(payload.principalType))) {
    throw new Error("Invalid token claims");
  }
  return {
    sub: payload.sub,
    principalType: payload.principalType as PrincipalType,
    ...(typeof payload.role === "string" ? { role: payload.role } : {})
  };
}
