import { Router } from "express";
import mongoose from "mongoose";
const router = Router();
router.get("/", (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, status: "unavailable" });
    return;
  }
  res.json({ success: true, status: "healthy" });
});
export default router;
