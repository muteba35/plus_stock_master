import { FinanceCharge } from "../models/Utilisateur.js";

const allowedTypes = ["TRANSPORT", "ELECTRICITE", "LOYER", "SALAIRE", "FOURNITURE", "TAXE", "AUTRE"];
const allowedStatus = ["PAYEE", "PREVUE"];
const allowedRecurrence = ["PONCTUELLE", "MENSUELLE", "HEBDOMADAIRE", "ANNUELLE"];

const getBoutiqueId = (req) => req.user?.boutiqueId || req.user?.boutiqueActive;

const parseDateRange = (query = {}) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (query.period === "today") {
    return { start, end };
  }

  if (query.period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { start, end };
  }

  if (query.period === "month" || !query.period) {
    start.setDate(1);
    return { start, end };
  }

  if (query.period === "year") {
    start.setMonth(0, 1);
    return { start, end };
  }

  if (query.period === "custom") {
    const customStart = query.startDate ? new Date(query.startDate) : null;
    const customEnd = query.endDate ? new Date(query.endDate) : null;
    if (customStart) customStart.setHours(0, 0, 0, 0);
    if (customEnd) customEnd.setHours(23, 59, 59, 999);
    return { start: customStart, end: customEnd };
  }

  return { start: null, end: null };
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const serializeCharge = (charge) => ({
  id: charge._id.toString(),
  libelle: charge.libelle,
  type: charge.type,
  montant: roundMoney(charge.montant),
  devise: charge.devise,
  statut: charge.statut,
  recurrence: charge.recurrence,
  dateCharge: charge.dateCharge,
  note: charge.note || "",
  createdAt: charge.createdAt,
  updatedAt: charge.updatedAt,
});

export const getFinanceCharges = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });

    const { start, end } = parseDateRange(req.query);
    const filter = { boutiqueId };
    if (start || end) {
      filter.dateCharge = {};
      if (start) filter.dateCharge.$gte = start;
      if (end) filter.dateCharge.$lte = end;
    }

    const charges = await FinanceCharge.find(filter).sort({ dateCharge: -1, createdAt: -1 }).limit(1000);
    const totalCharges = charges
      .filter((charge) => charge.statut === "PAYEE")
      .reduce((sum, charge) => sum + Number(charge.montant || 0), 0);
    const totalPrevues = charges
      .filter((charge) => charge.statut === "PREVUE")
      .reduce((sum, charge) => sum + Number(charge.montant || 0), 0);

    const byType = Object.values(charges.reduce((acc, charge) => {
      const key = charge.type || "AUTRE";
      acc[key] ||= { type: key, count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(charge.montant || 0);
      return acc;
    }, {})).map((row) => ({ ...row, total: roundMoney(row.total) }));

    return res.status(200).json({
      success: true,
      devise: charges[0]?.devise || "USD ($)",
      charges: charges.map(serializeCharge),
      metrics: {
        count: charges.length,
        totalCharges: roundMoney(totalCharges),
        totalPrevues: roundMoney(totalPrevues),
      },
      byType,
    });
  } catch (error) {
    console.error("getFinanceCharges:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les charges." });
  }
};

export const createFinanceCharge = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });

    const libelle = String(req.body.libelle || "").trim();
    const type = String(req.body.type || "AUTRE").trim().toUpperCase();
    const montant = Number(req.body.montant);
    const devise = String(req.body.devise || "USD ($)").trim();
    const statut = String(req.body.statut || "PAYEE").trim().toUpperCase();
    const recurrence = String(req.body.recurrence || "PONCTUELLE").trim().toUpperCase();
    const note = String(req.body.note || "").trim();
    const dateCharge = req.body.dateCharge ? new Date(req.body.dateCharge) : new Date();

    if (!libelle) return res.status(400).json({ success: false, message: "Le libelle de la charge est requis." });
    if (!Number.isFinite(montant) || montant <= 0) return res.status(400).json({ success: false, message: "Le montant de la charge doit etre superieur a zero." });
    if (!allowedTypes.includes(type)) return res.status(400).json({ success: false, message: "Type de charge invalide." });
    if (!allowedStatus.includes(statut)) return res.status(400).json({ success: false, message: "Statut de charge invalide." });
    if (!allowedRecurrence.includes(recurrence)) return res.status(400).json({ success: false, message: "Recurrence invalide." });
    if (Number.isNaN(dateCharge.getTime())) return res.status(400).json({ success: false, message: "Date de charge invalide." });

    const charge = await FinanceCharge.create({
      boutiqueId,
      utilisateurId: req.user.id,
      libelle,
      type,
      montant,
      devise,
      statut,
      recurrence,
      dateCharge,
      note,
    });

    return res.status(201).json({ success: true, message: "Charge enregistree avec succes.", charge: serializeCharge(charge) });
  } catch (error) {
    console.error("createFinanceCharge:", error);
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer la charge." });
  }
};

export const updateFinanceCharge = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const charge = await FinanceCharge.findOne({ _id: req.params.id, boutiqueId });
    if (!charge) return res.status(404).json({ success: false, message: "Charge introuvable." });

    if (req.body.libelle !== undefined) charge.libelle = String(req.body.libelle || "").trim();
    if (req.body.type !== undefined) charge.type = String(req.body.type || "AUTRE").trim().toUpperCase();
    if (req.body.montant !== undefined) charge.montant = Number(req.body.montant);
    if (req.body.devise !== undefined) charge.devise = String(req.body.devise || "USD ($)").trim();
    if (req.body.statut !== undefined) charge.statut = String(req.body.statut || "PAYEE").trim().toUpperCase();
    if (req.body.recurrence !== undefined) charge.recurrence = String(req.body.recurrence || "PONCTUELLE").trim().toUpperCase();
    if (req.body.dateCharge !== undefined) charge.dateCharge = new Date(req.body.dateCharge);
    if (req.body.note !== undefined) charge.note = String(req.body.note || "").trim();

    if (!charge.libelle) return res.status(400).json({ success: false, message: "Le libelle de la charge est requis." });
    if (!Number.isFinite(charge.montant) || charge.montant <= 0) return res.status(400).json({ success: false, message: "Le montant de la charge doit etre superieur a zero." });
    if (!allowedTypes.includes(charge.type)) return res.status(400).json({ success: false, message: "Type de charge invalide." });
    if (!allowedStatus.includes(charge.statut)) return res.status(400).json({ success: false, message: "Statut de charge invalide." });
    if (!allowedRecurrence.includes(charge.recurrence)) return res.status(400).json({ success: false, message: "Recurrence invalide." });

    await charge.save();
    return res.status(200).json({ success: true, message: "Charge mise a jour.", charge: serializeCharge(charge) });
  } catch (error) {
    console.error("updateFinanceCharge:", error);
    return res.status(500).json({ success: false, message: "Impossible de modifier la charge." });
  }
};

export const deleteFinanceCharge = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const deleted = await FinanceCharge.findOneAndDelete({ _id: req.params.id, boutiqueId });
    if (!deleted) return res.status(404).json({ success: false, message: "Charge introuvable." });
    return res.status(200).json({ success: true, message: "Charge supprimee." });
  } catch (error) {
    console.error("deleteFinanceCharge:", error);
    return res.status(500).json({ success: false, message: "Impossible de supprimer la charge." });
  }
};
