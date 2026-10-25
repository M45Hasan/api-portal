import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin";
import { Developer } from "../models/Developer";
import { signToken } from "../services/token.service";
import { authenticateBearer } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200)
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "Valid email and password are required" } });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  if (!admin || admin.status !== "active" || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const token = signToken({ sub: String(admin._id), principalType: "admin", role: admin.role });
  res.json({ success: true, data: { accessToken: token, tokenType: "Bearer", expiresIn: "15m", admin: { email: admin.email, role: admin.role } } });
});

router.get("/me", authenticateBearer, async (req, res) => {
  const principal = req.principal!;
  if (principal.principalType === "admin") {
    const admin = await Admin.findById(principal.sub).select("email role status").lean();
    if (!admin || admin.status !== "active") {
      res.status(401).json({ success: false, error: { code: "IDENTITY_INACTIVE", message: "Identity unavailable" } });
      return;
    }
    res.json({ success: true, data: { principalType: "admin", email: admin.email, role: admin.role } });
    return;
  }

  const developer = await Developer.findById(principal.sub).select("companyDeveloperId displayName status").lean();
  if (!developer || developer.status !== "active") {
    res.status(401).json({ success: false, error: { code: "IDENTITY_INACTIVE", message: "Identity unavailable" } });
    return;
  }
  res.json({ success: true, data: { principalType: "developer", developerId: developer.companyDeveloperId, displayName: developer.displayName } });
});

export default router;
