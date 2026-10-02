import mongoose from "mongoose";
import { Boutique } from "../models/Utilisateur.js";

// Attach branding from the same authorized shop as the exported data.
export const attachExportContext = async (req, res, next) => {
  if (req.query.export !== "1") return next();
  const activeId = String(req.user.boutiqueActive || req.user.boutiqueId || "");
  const requestedId = req.query.boutiqueId || activeId;
  if (typeof requestedId !== "string" || !mongoose.isValidObjectId(requestedId)) {
    return res.status(400).json({ success: false, message: "Boutique invalide." });
  }
  if (!req.user.isOwner && requestedId !== activeId) {
    return res.status(403).json({ success: false, message: "Export interdit pour cette boutique." });
  }
  try {
    const shop = await Boutique.findOne({
      _id: requestedId, isDeleted: false,
      ...(req.user.isOwner ? { userId: req.user.id } : {}),
    }).select("nom appearance.logo deviseParDefaut").lean();
    if (!shop) return res.status(403).json({ success: false, message: "Boutique inaccessible." });
    const send = res.json.bind(res);
    res.json = (body) => send(body?.success === true ? {
      ...body, exportContext: {
        boutiqueId: String(shop._id), name: shop.nom, logo: shop.appearance?.logo || "",
        currency: shop.deviseParDefaut, generatedAt: new Date().toISOString(),
      },
    } : body);
    return next();
  } catch (error) { return next(error); }
};
