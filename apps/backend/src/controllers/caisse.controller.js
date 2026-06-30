import mongoose from "mongoose";
import { Boutique, Categorie, ExchangeRate, MouvementStock, Produit, RetourClient, Vente } from "../models/Utilisateur.js";
import { logInventoryAction } from "../utils/inventoryAudit.js";

const TVA_RATE = 0.16;

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

const saleReference = () => `VTE-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
const returnReference = () => `RET-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

const invoiceReference = () => `FAC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const startOfLocalDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfLocalDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getReportDateRange = (query = {}) => {
  const period = String(query.period || "all").toLowerCase();
  const now = new Date();

  if (period === "today") {
    return { start: startOfLocalDay(now), end: endOfLocalDay(now), period };
  }

  if (period === "week") {
    const start = startOfLocalDay(now);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return { start, end: endOfLocalDay(now), period };
  }

  if (period === "month") {
    const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end: endOfLocalDay(now), period };
  }

  if (period === "custom") {
    const start = query.startDate ? startOfLocalDay(query.startDate) : null;
    const end = query.endDate ? endOfLocalDay(query.endDate) : null;
    if (start && Number.isNaN(start.getTime())) return { period: "all" };
    if (end && Number.isNaN(end.getTime())) return { period: "all" };
    return { start, end, period };
  }

  return { period: "all" };
};

const getRateForSale = (source, cible, rates) => {
  if (!source || !cible || source === cible) return 1;
  const direct = rates.find((rate) => rate.source === source && rate.cible === cible);
  if (direct) return Number(direct.taux);
  const inverse = rates.find((rate) => rate.source === cible && rate.cible === source);
  if (inverse) return 1 / Number(inverse.taux);
  throw new Error(`Taux manquant : ${source} vers ${cible}.`);
};

const compactRateSnapshot = (rates, referenceCurrency, usedCurrencies) => {
  const snapshot = [];
  usedCurrencies.forEach((currency) => {
    snapshot.push({
      source: currency,
      cible: referenceCurrency,
      taux: getRateForSale(currency, referenceCurrency, rates),
    });
  });
  return snapshot;
};

const serializeSale = (sale) => ({
  _id: sale._id,
  reference: sale.reference,
  factureReference: sale.factureReference,
  boutiqueId: sale.boutiqueId,
  utilisateurId: sale.utilisateurId,
  clientNom: sale.clientNom,
  devise: sale.devise,
  deviseReference: sale.deviseReference,
  devisePaiement: sale.devisePaiement,
  tauxPaiement: sale.tauxPaiement,
  tauxUtilises: sale.tauxUtilises,
  paiement: sale.paiement,
  statut: sale.statut,
  sousTotalHT: sale.sousTotalHT,
  remisePourcentage: sale.remisePourcentage,
  remiseMontant: sale.remiseMontant,
  taxableAmount: sale.taxableAmount,
  tvaRate: sale.tvaRate,
  tvaMontant: sale.tvaMontant,
  totalTTC: sale.totalTTC,
  montantRecuOriginal: sale.montantRecuOriginal,
  montantRecu: sale.montantRecu,
  monnaieRendue: sale.monnaieRendue,
  lignes: sale.lignes,
  coutTotal: sale.coutTotal,
  margeEstimee: sale.margeEstimee,
  createdAt: sale.createdAt,
});

export const createVente = async (req, res) => {
  const rollbackUpdates = [];

  try {
    const boutiqueId = getBoutiqueId(req);
    const lignes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
    const paiement = String(req.body.paiement || "").trim();
    const clientNom = String(req.body.clientNom || "Client comptoir").trim();
    const remisePourcentage = Number(req.body.remisePourcentage || 0);
    const montantRecuOriginal = Number(req.body.montantRecu || 0);
    const devisePaiement = String(req.body.devisePaiement || "").trim();

    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (lignes.length === 0) {
      return res.status(400).json({ success: false, message: "Le panier est vide." });
    }
    if (!["Espèces", "Carte", "Mobile"].includes(paiement)) {
      return res.status(400).json({ success: false, message: "Mode de paiement invalide." });
    }
    if (!Number.isFinite(remisePourcentage) || remisePourcentage < 0 || remisePourcentage > 100) {
      return res.status(400).json({ success: false, message: "La remise doit etre comprise entre 0 et 100%." });
    }
    if (remisePourcentage > 0 && !req.user?.isOwner && !req.user?.permissions?.includes("APPLIQUER_REMISE")) {
      return res.status(403).json({ success: false, message: "Permission APPLIQUER_REMISE requise pour appliquer une remise." });
    }

    const normalizedLines = lignes.map((line) => ({
      produitId: String(line.produitId || ""),
      quantite: Number(line.quantite),
    }));

    if (normalizedLines.some((line) => !mongoose.isValidObjectId(line.produitId) || !Number.isFinite(line.quantite) || line.quantite <= 0)) {
      return res.status(400).json({ success: false, message: "Une ligne du panier est invalide." });
    }

    const groupedLines = new Map();
    normalizedLines.forEach((line) => {
      groupedLines.set(line.produitId, (groupedLines.get(line.produitId) || 0) + line.quantite);
    });

    const productIds = [...groupedLines.keys()];
    const products = await Produit.find({
      _id: { $in: productIds },
      boutiqueId,
      isDeleted: false,
      isActive: true,
    }).select("+prixAchat");

    if (products.length !== productIds.length) {
      return res.status(404).json({ success: false, message: "Un produit du panier est introuvable ou inactif." });
    }

    const boutique = await Boutique.findById(boutiqueId);
    const deviseReference = boutique?.deviseParDefaut || "USD ($)";
    const paymentCurrency = devisePaiement || deviseReference;
    const exchangeRates = await ExchangeRate.find({ boutiqueId, isActive: true });
    const usedCurrencies = new Set(products.map((product) => product.devise || "USD ($)"));
    usedCurrencies.add(paymentCurrency);

    const devise = deviseReference;
    const saleLines = [];
    let sousTotalHT = 0;
    let coutTotal = 0;

    for (const product of products) {
      const quantite = groupedLines.get(product._id.toString());
      if (product.stock < quantite) {
        return res.status(409).json({ success: false, message: `Stock insuffisant pour ${product.nom}.` });
      }

      const productCurrency = product.devise || deviseReference;
      const tauxConversion = getRateForSale(productCurrency, deviseReference, exchangeRates);
      const prixUnitaireHTOriginal = Number(product.prixVente || 0);
      const prixUnitaireHT = roundMoney(prixUnitaireHTOriginal * tauxConversion);
      const coutUnitaire = roundMoney(Number(product.prixAchat || 0) * tauxConversion);
      const totalCout = roundMoney(coutUnitaire * quantite);
      const ligneTotalHTOriginal = roundMoney(prixUnitaireHTOriginal * quantite);
      const ligneTotalHT = roundMoney(prixUnitaireHT * quantite);
      sousTotalHT += ligneTotalHT;
      coutTotal += totalCout;

      saleLines.push({
        produitId: product._id,
        nomProduit: product.nom,
        sku: product.sku,
        categorieId: product.categorieId || null,
        categorieNom: "Non classe",
        quantite,
        deviseOriginale: productCurrency,
        tauxConversion,
        prixUnitaireHTOriginal,
        totalHTOriginal: ligneTotalHTOriginal,
        totalTTCOriginal: roundMoney(ligneTotalHTOriginal * (1 + TVA_RATE)),
        prixUnitaireHT,
        prixUnitaireTTC: roundMoney(prixUnitaireHT * (1 + TVA_RATE)),
        totalHT: ligneTotalHT,
        totalTTC: roundMoney(ligneTotalHT * (1 + TVA_RATE)),
        coutUnitaire,
        totalCout,
        margeBrute: roundMoney(ligneTotalHT - totalCout),
      });
    }

    const categoryIdsForSale = [...new Set(saleLines.map((line) => line.categorieId?.toString()).filter(Boolean))];
    const categoriesForSale = await Categorie.find({ _id: { $in: categoryIdsForSale }, boutiqueId }).select("nom");
    const categoryNamesById = new Map(categoriesForSale.map((category) => [category._id.toString(), category.nom]));
    saleLines.forEach((line) => {
      if (line.categorieId) line.categorieNom = categoryNamesById.get(line.categorieId.toString()) || "Non classe";
    });

    sousTotalHT = roundMoney(sousTotalHT);
    const remiseMontant = roundMoney((sousTotalHT * remisePourcentage) / 100);
    const taxableAmount = roundMoney(sousTotalHT - remiseMontant);
    const tvaMontant = roundMoney(taxableAmount * TVA_RATE);
    const totalTTC = roundMoney(taxableAmount + tvaMontant);
    const tauxPaiement = getRateForSale(paymentCurrency, deviseReference, exchangeRates);
    const montantRecu = paiement === "Espèces" ? roundMoney(montantRecuOriginal * tauxPaiement) : totalTTC;
    const monnaieRendue = paiement === "Espèces" ? roundMoney(Math.max(0, montantRecu - totalTTC)) : 0;

    if (paiement === "Espèces" && montantRecu < totalTTC) {
      return res.status(400).json({ success: false, message: "Le montant reçu est inferieur au total TTC." });
    }

    for (const line of saleLines) {
      const before = await Produit.findOneAndUpdate(
        { _id: line.produitId, boutiqueId, stock: { $gte: line.quantite }, isDeleted: false, isActive: true },
        { $inc: { stock: -line.quantite } },
        { returnDocument: "before" }
      );
      if (!before) {
        for (const rollback of rollbackUpdates.reverse()) await rollback().catch(() => undefined);
        return res.status(409).json({ success: false, message: `Stock insuffisant pour ${line.nomProduit}.` });
      }

      line.stockAvant = before.stock;
      line.stockApres = before.stock - line.quantite;
      rollbackUpdates.push(() => Produit.updateOne({ _id: line.produitId }, { $inc: { stock: line.quantite } }));
    }

    const reference = saleReference();
    const vente = await Vente.create({
      boutiqueId,
      utilisateurId: req.user.id,
      reference,
      factureReference: invoiceReference(),
      clientNom,
      devise,
      deviseReference,
      devisePaiement: paymentCurrency,
      tauxPaiement,
      tauxUtilises: compactRateSnapshot(exchangeRates, deviseReference, usedCurrencies),
      paiement,
      statut: "PAYEE",
      sousTotalHT,
      remisePourcentage,
      remiseMontant,
      taxableAmount,
      tvaRate: TVA_RATE,
      tvaMontant,
      totalTTC,
      coutTotal: roundMoney(coutTotal),
      margeEstimee: roundMoney(taxableAmount - coutTotal),
      montantRecuOriginal: paiement === "Espèces" ? montantRecuOriginal : totalTTC,
      montantRecu: paiement === "Espèces" ? montantRecu : totalTTC,
      monnaieRendue,
      lignes: saleLines,
    });

    await MouvementStock.insertMany(
      saleLines.map((line) => ({
        produitId: line.produitId,
        boutiqueId,
        utilisateurId: req.user.id,
        type: "SORTIE",
        quantite: line.quantite,
        variation: -line.quantite,
        stockAvant: line.stockAvant,
        stockApres: line.stockApres,
        motif: "Sortie automatique apres vente caisse",
        reference,
      }))
    );

    await logInventoryAction({
      boutiqueId,
      utilisateurId: req.user.id,
      action: "VENTE_CAISSE",
      entityType: "VENTE",
      entityId: vente._id,
      label: `Vente caisse : ${reference}`,
      details: { totalTTC, tvaMontant, remiseMontant, devise, lignes: saleLines.length },
    });

    rollbackUpdates.length = 0;
    return res.status(201).json({
      success: true,
      message: "Vente enregistrée avec succes.",
      data: serializeSale(vente),
    });
  } catch (error) {
    for (const rollback of rollbackUpdates.reverse()) await rollback().catch(() => undefined);
    console.error("createVente:", error);
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Données invalides." });
    }
    if (error?.message?.startsWith("Taux manquant")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer la vente." });
  }
};

export const getVentes = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const canViewAll = req.user?.isOwner || req.user?.permissions?.includes("VOIR_HISTORIQUE_VENTES");
    const filter = canViewAll ? { boutiqueId } : { boutiqueId, utilisateurId: req.user.id };
    const ventes = await Vente.find(filter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      data: ventes.map(serializeSale),
      scope: canViewAll ? "all" : "own",
    });
  } catch (error) {
    console.error("getVentes:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les ventes." });
  }
};


export const getFactures = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const canViewAll = req.user?.isOwner || req.user?.permissions?.includes("VOIR_FACTURES") || req.user?.permissions?.includes("VOIR_HISTORIQUE_VENTES");
    const filter = canViewAll ? { boutiqueId } : { boutiqueId, utilisateurId: req.user.id };
    const factures = await Vente.find(filter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      data: factures.map(serializeSale),
      scope: canViewAll ? "all" : "own",
    });
  } catch (error) {
    console.error("getFactures:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les factures." });
  }
};


const serializeReturn = (retour) => ({
  _id: retour._id,
  reference: retour.reference,
  venteId: retour.venteId,
  venteReference: retour.venteReference,
  factureReference: retour.factureReference,
  utilisateurId: retour.utilisateurId,
  clientNom: retour.clientNom,
  devise: retour.devise,
  typeRetour: retour.typeRetour,
  motif: retour.motif,
  statut: retour.statut,
  montantTotalTTC: retour.montantTotalTTC,
  lignes: retour.lignes,
  createdAt: retour.createdAt,
});

export const getRetours = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const canViewAll = req.user?.isOwner || req.user?.permissions?.includes("VOIR_RETOURS_CLIENTS") || req.user?.permissions?.includes("ANNULER_VENTE");
    const retourFilter = canViewAll ? { boutiqueId } : { boutiqueId, utilisateurId: req.user.id };
    const retours = await RetourClient.find(retourFilter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(500);

    const saleFilter = canViewAll ? { boutiqueId, statut: { $in: ["PAYEE", "REMBOURSEE"] } } : { boutiqueId, utilisateurId: req.user.id, statut: { $in: ["PAYEE", "REMBOURSEE"] } };
    const ventes = await Vente.find(saleFilter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(250);

    return res.status(200).json({
      success: true,
      data: retours.map(serializeReturn),
      ventes: ventes.map(serializeSale),
    });
  } catch (error) {
    console.error("getRetours:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les retours clients." });
  }
};

export const createRetour = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const venteId = String(req.body.venteId || "");
    const produitId = String(req.body.produitId || "");
    const quantite = Number(req.body.quantite || 0);
    const typeRetour = String(req.body.typeRetour || "REMBOURSEMENT").toUpperCase();
    const remiseEnStock = Boolean(req.body.remiseEnStock);
    const motif = String(req.body.motif || "").trim();

    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (!mongoose.isValidObjectId(venteId) || !mongoose.isValidObjectId(produitId)) {
      return res.status(400).json({ success: false, message: "Vente ou produit invalide." });
    }
    if (!Number.isFinite(quantite) || quantite <= 0) {
      return res.status(400).json({ success: false, message: "La quantité retournée est invalide." });
    }
    if (!["REMBOURSEMENT", "ECHANGE", "AVOIR"].includes(typeRetour)) {
      return res.status(400).json({ success: false, message: "Type de retour invalide." });
    }
    if (motif.length < 4) {
      return res.status(400).json({ success: false, message: "Le motif du retour est requis." });
    }

    const vente = await Vente.findOne({ _id: venteId, boutiqueId, statut: { $in: ["PAYEE", "REMBOURSEE"] } });
    if (!vente) {
      return res.status(404).json({ success: false, message: "Vente introuvable pour cette boutique." });
    }

    const line = vente.lignes.find((item) => item.produitId?.toString() === produitId);
    if (!line) {
      return res.status(404).json({ success: false, message: "Ce produit n'existe pas dans la vente sélectionnée." });
    }

    const alreadyReturned = await RetourClient.aggregate([
      {
        $match: {
          boutiqueId: new mongoose.Types.ObjectId(boutiqueId),
          venteId: new mongoose.Types.ObjectId(venteId),
          statut: "VALIDE",
        },
      },
      { $unwind: "$lignes" },
      { $match: { "lignes.produitId": new mongoose.Types.ObjectId(produitId) } },
      { $group: { _id: null, quantite: { $sum: "$lignes.quantite" } } },
    ]);

    const returnedQty = alreadyReturned[0]?.quantite || 0;
    const remainingQty = Number(line.quantite || 0) - returnedQty;
    if (quantite > remainingQty) {
      return res.status(409).json({
        success: false,
        message: `Quantité impossible. Il reste ${remainingQty} unité(s) retournable(s) pour ce produit.`,
      });
    }

    const unitTTC = Number(line.totalTTC || 0) / Number(line.quantite || 1);
    const montantTTC = roundMoney(unitTTC * quantite);
    const reference = returnReference();

    const retour = await RetourClient.create({
      boutiqueId,
      venteId,
      utilisateurId: req.user.id,
      reference,
      venteReference: vente.reference,
      factureReference: vente.factureReference,
      clientNom: vente.clientNom,
      devise: vente.devise,
      typeRetour,
      motif,
      statut: "VALIDE",
      montantTotalTTC: montantTTC,
      lignes: [
        {
          produitId,
          nomProduit: line.nomProduit,
          sku: line.sku,
          quantite,
          montantTTC,
          remiseEnStock,
        },
      ],
    });

    if (remiseEnStock) {
      const before = await Produit.findOneAndUpdate(
        { _id: produitId, boutiqueId, isDeleted: false },
        { $inc: { stock: quantite } },
        { returnDocument: "before" }
      );

      if (!before) {
        await RetourClient.deleteOne({ _id: retour._id });
        return res.status(404).json({ success: false, message: "Produit introuvable pour la remise en stock." });
      }

      await MouvementStock.create({
        produitId,
        boutiqueId,
        utilisateurId: req.user.id,
        type: "ENTREE",
        quantite,
        variation: quantite,
        stockAvant: before.stock,
        stockApres: before.stock + quantite,
        motif: "Retour client remis en stock",
        reference,
      });
    }

    const totalSoldQty = vente.lignes.reduce((sum, item) => sum + Number(item.quantite || 0), 0);
    const returnedAfter = await RetourClient.aggregate([
      {
        $match: {
          boutiqueId: new mongoose.Types.ObjectId(boutiqueId),
          venteId: new mongoose.Types.ObjectId(venteId),
          statut: "VALIDE",
        },
      },
      { $unwind: "$lignes" },
      { $group: { _id: null, quantite: { $sum: "$lignes.quantite" } } },
    ]);
    if ((returnedAfter[0]?.quantite || 0) >= totalSoldQty) {
      vente.statut = "REMBOURSEE";
      await vente.save();
    }

    await logInventoryAction({
      boutiqueId,
      utilisateurId: req.user.id,
      action: "RETOUR_CLIENT",
      entityType: "RETOUR_CLIENT",
      entityId: retour._id,
      label: `Retour client : ${reference}`,
      details: {
        venteReference: vente.reference,
        montantTotalTTC: montantTTC,
        typeRetour,
        remiseEnStock,
        quantite,
      },
    });

    const populated = await RetourClient.findById(retour._id).populate("utilisateurId", "nom prenom");
    return res.status(201).json({
      success: true,
      message: "Retour client enregistré avec succès.",
      data: serializeReturn(populated),
    });
  } catch (error) {
    console.error("createRetour:", error);
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Données invalides." });
    }
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer le retour client." });
  }
};


export const getRapportsCaisse = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const canViewAll = req.user?.isOwner || req.user?.permissions?.includes("VOIR_RAPPORTS_CAISSE");
    const baseFilter = canViewAll ? { boutiqueId } : { boutiqueId, utilisateurId: req.user.id };
    const dateRange = getReportDateRange(req.query);
    const dateFilter = {};
    if (dateRange.start || dateRange.end) {
      dateFilter.createdAt = {};
      if (dateRange.start) dateFilter.createdAt.$gte = dateRange.start;
      if (dateRange.end) dateFilter.createdAt.$lte = dateRange.end;
    }
    const reportFilter = { ...baseFilter, ...dateFilter };
    const ventes = await Vente.find(reportFilter)
      .select("+coutTotal +margeEstimee")
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(1000);
    const retours = await RetourClient.find(reportFilter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(1000);

    const productIds = [...new Set(ventes.flatMap((sale) => sale.lignes.map((line) => line.produitId?.toString()).filter(Boolean)))];
    const products = await Produit.find({ _id: { $in: productIds }, boutiqueId }).select("nom sku categorieId +prixAchat").populate("categorieId", "nom");
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));

    const addToMap = (map, key, value) => {
      const current = map.get(key) || { ...value, caHT: 0, totalTTC: 0, cout: 0, marge: 0, quantite: 0, ventes: 0, tva: 0 };
      current.caHT += value.caHT || 0;
      current.totalTTC += value.totalTTC || 0;
      current.cout += value.cout || 0;
      current.marge += value.marge || 0;
      current.quantite += value.quantite || 0;
      current.ventes += value.ventes || 0;
      current.tva += value.tva || 0;
      map.set(key, current);
    };

    const daily = new Map();
    const cashiers = new Map();
    const payments = new Map();
    const productsReport = new Map();
    const categoriesReport = new Map();
    const salesDetails = [];

    let totalSales = 0;
    let totalHT = 0;
    let totalTTC = 0;
    let totalTVA = 0;
    let totalCost = 0;
    let totalMargin = 0;

    ventes.forEach((sale) => {
      if (sale.statut !== "PAYEE") return;
      const day = new Date(sale.createdAt).toISOString().slice(0, 10);
      const cashierName = typeof sale.utilisateurId === "object" && sale.utilisateurId
        ? ((sale.utilisateurId.prenom || "") + " " + (sale.utilisateurId.nom || "")).trim() || "Caissier"
        : "Caissier";
      const cost = Number(sale.coutTotal || 0);
      const margin = Number(sale.margeEstimee ?? (Number(sale.taxableAmount || 0) - cost));
      const taxable = Number(sale.taxableAmount || sale.sousTotalHT || 0);
      totalSales += 1;
      totalHT += taxable;
      totalTTC += Number(sale.totalTTC || 0);
      totalTVA += Number(sale.tvaMontant || 0);
      totalCost += cost;
      totalMargin += margin;

      addToMap(daily, day, { date: day, caHT: taxable, totalTTC: Number(sale.totalTTC || 0), tva: Number(sale.tvaMontant || 0), cout: cost, marge: margin, ventes: 1 });
      addToMap(cashiers, cashierName, { caissier: cashierName, caHT: taxable, totalTTC: Number(sale.totalTTC || 0), tva: Number(sale.tvaMontant || 0), cout: cost, marge: margin, ventes: 1 });
      addToMap(payments, sale.paiement || "Non precise", { paiement: sale.paiement || "Non precise", caHT: taxable, totalTTC: Number(sale.totalTTC || 0), tva: Number(sale.tvaMontant || 0), cout: cost, marge: margin, ventes: 1 });

      const saleHT = Number(sale.sousTotalHT || sale.taxableAmount || 0);
      sale.lignes.forEach((line) => {
        const product = productsById.get(line.produitId?.toString());
        const lineCost = Number(line.totalCout ?? 0) || (saleHT > 0 ? roundMoney(cost * (Number(line.totalHT || 0) / saleHT)) : 0);
        const lineMargin = Number(line.margeBrute ?? roundMoney(Number(line.totalHT || 0) - lineCost));
        const productName = line.nomProduit || product?.nom || "Produit archive";
        const sku = line.sku || product?.sku || "";
        const categoryName = line.categorieNom || product?.categorieId?.nom || "Non classe";
        const quantity = Number(line.quantite || 0);
        const unitSale = quantity > 0 ? roundMoney(Number(line.totalHT || 0) / quantity) : Number(line.prixUnitaireHT || 0);
        const unitCost = quantity > 0 ? roundMoney(lineCost / quantity) : Number(line.coutUnitaire || product?.prixAchat || 0);
        const unitMargin = roundMoney(unitSale - unitCost);
        addToMap(productsReport, String(line.produitId || productName), { produit: productName, sku, categorie: categoryName, caHT: Number(line.totalHT || 0), totalTTC: Number(line.totalTTC || 0), cout: lineCost, marge: lineMargin, quantite: quantity, ventes: 1 });
        addToMap(categoriesReport, categoryName, { categorie: categoryName, caHT: Number(line.totalHT || 0), totalTTC: Number(line.totalTTC || 0), cout: lineCost, marge: lineMargin, quantite: quantity, ventes: 1 });
        salesDetails.push({
          reference: sale.reference,
          factureReference: sale.factureReference,
          clientNom: sale.clientNom,
          date: sale.createdAt,
          caissier: cashierName,
          paiement: sale.paiement || "Non precise",
          produit: productName,
          sku,
          categorie: categoryName,
          quantite: quantity,
          prixVente: unitSale,
          coutAchat: unitCost,
          margeUnitaire: unitMargin,
          marge: lineMargin,
          totalTTC: Number(line.totalTTC || 0),
          devise: sale.deviseReference || sale.devise,
        });
      });
    });

    const validReturns = retours.filter((item) => item.statut === "VALIDE");
    const returnsBySaleAndProduct = new Map();
    validReturns.forEach((retour) => {
      retour.lignes.forEach((line) => {
        const key = [retour.venteReference, line.sku || line.nomProduit].join("::");
        const current = returnsBySaleAndProduct.get(key) || 0;
        returnsBySaleAndProduct.set(key, current + Number(line.montantTTC || 0));
      });
    });
    const totalReturns = validReturns.reduce((sum, item) => sum + Number(item.montantTotalTTC || 0), 0);
    const devise = ventes.find((sale) => sale.deviseReference || sale.devise)?.deviseReference || ventes.find((sale) => sale.devise)?.devise || "USD ($)";

    const serializeRows = (items) => items.map((item) => ({
      ...item,
      caHT: roundMoney(item.caHT),
      totalTTC: roundMoney(item.totalTTC),
      tva: roundMoney(item.tva || 0),
      cout: roundMoney(item.cout),
      marge: roundMoney(item.marge),
      tauxMarge: item.caHT > 0 ? roundMoney((item.marge / item.caHT) * 100) : 0,
      quantite: roundMoney(item.quantite),
    }));

    return res.status(200).json({
      success: true,
      scope: canViewAll ? "all" : "own",
      devise,
      filters: {
        period: dateRange.period,
        startDate: dateRange.start || null,
        endDate: dateRange.end || null,
      },
      metrics: {
        ventes: totalSales,
        caHT: roundMoney(totalHT),
        caTTC: roundMoney(totalTTC),
        tva: roundMoney(totalTVA),
        cout: roundMoney(totalCost),
        marge: roundMoney(totalMargin),
        tauxMarge: totalHT > 0 ? roundMoney((totalMargin / totalHT) * 100) : 0,
        retours: validReturns.length,
        montantRetours: roundMoney(totalReturns),
        netApresRetours: roundMoney(totalTTC - totalReturns),
      },
      daily: serializeRows([...daily.values()]).sort((a, b) => a.date.localeCompare(b.date)),
      cashiers: serializeRows([...cashiers.values()]).sort((a, b) => b.totalTTC - a.totalTTC),
      payments: serializeRows([...payments.values()]).sort((a, b) => b.totalTTC - a.totalTTC),
      products: serializeRows([...productsReport.values()]).sort((a, b) => b.marge - a.marge),
      categories: serializeRows([...categoriesReport.values()]).sort((a, b) => b.marge - a.marge),
      salesDetails: salesDetails.map((item) => ({
        ...item,
        quantite: roundMoney(item.quantite),
        prixVente: roundMoney(item.prixVente),
        coutAchat: roundMoney(item.coutAchat),
        margeUnitaire: roundMoney(item.margeUnitaire),
        marge: roundMoney(item.marge),
        montantRetourTTC: roundMoney(returnsBySaleAndProduct.get([item.reference, item.sku || item.produit].join("::")) || 0),
        margeApresRetour: roundMoney(item.marge - (returnsBySaleAndProduct.get([item.reference, item.sku || item.produit].join("::")) || 0)),
        totalTTC: roundMoney(item.totalTTC),
      })),
      returns: validReturns.map((item) => ({ reference: item.reference, venteReference: item.venteReference, clientNom: item.clientNom, typeRetour: item.typeRetour, montantTotalTTC: item.montantTotalTTC, createdAt: item.createdAt })),
    });
  } catch (error) {
    console.error("getRapportsCaisse:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les rapports caisse." });
  }
};


