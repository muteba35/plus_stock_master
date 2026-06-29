import mongoose from "mongoose";
import { AuditLog, Boutique } from "../models/Utilisateur.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

export const getAuditLogs = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(5, Number(req.query.limit || 15)));
    const filter = { boutiqueId };

    if (req.query.module && req.query.module !== "all") filter.module = req.query.module;
    if (req.query.severity && req.query.severity !== "all") filter.severity = req.query.severity;
    if (req.query.method && req.query.method !== "all") filter.method = req.query.method;
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (req.query.search) {
      const search = new RegExp(String(req.query.search).trim(), "i");
      filter.$or = [
        { userName: search },
        { userEmail: search },
        { action: search },
        { module: search },
        { target: search },
        { ipAddress: search },
        { browser: search },
        { path: search },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("getAuditLogs:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger le journal d'audit." });
  }
};
