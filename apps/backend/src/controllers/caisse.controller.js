import mongoose from "mongoose";
import { Boutique, ExchangeRate, MouvementStock, Produit, RetourClient, Vente } from "../models/Utilisateur.js";
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
      const ligneTotalHTOriginal = roundMoney(prixUnitaireHTOriginal * quantite);
      const ligneTotalHT = roundMoney(prixUnitaireHT * quantite);
      sousTotalHT += ligneTotalHT;
      coutTotal += coutUnitaire * quantite;

      saleLines.push({
        produitId: product._id,
        nomProduit: product.nom,
        sku: product.sku,
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
      });
    }

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
