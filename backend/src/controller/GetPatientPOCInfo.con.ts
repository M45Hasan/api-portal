import { Request, Response } from "express";
import { GetPatientPOCInfo } from "../services/GetPatientPOCInfo.service";

export const GetPatientPOCInfoCController = async (req: Request, res: Response) => {
  try {

   
    const rawPocId = req.query.pocId;

    if (
      typeof rawPocId !== "string" ||
      !/^[1-9]\d*$/.test(rawPocId)
    ) {
      res.status(400).json({
        success: false,
        message: "A positive integer pocId is required",
      });
      return;
    }

    const pocId = Number(rawPocId);

    if (!Number.isSafeInteger(pocId)) {
      res.status(400).json({
        success: false,
        message: "pocId is outside the supported integer range",
      });
      return;
    }

    const data = await GetPatientPOCInfo(pocId);

    res.status(200).json({
      success: true,
      api: "GetPatientPOCInfo",
      data,
    });
  } catch {
    res.status(502).json({
      success: false,
      message: "GetPatientPOCInfo request failed",
    });
  }}