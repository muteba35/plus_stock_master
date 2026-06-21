import { InventaireAudit } from "../models/Utilisateur.js";

export const logInventoryAction = async ({ boutiqueId, utilisateurId, action, entityType, entityId = null, label, details = {} }) => {
  try {
    return await InventaireAudit.create({
      boutiqueId,
      utilisateurId,
      action,
      entityType,
      entityId,
      label,
      details,
    });
  } catch (error) {
    console.error("Inventory audit logging failed:", error.message);
    return null;
  }
};
