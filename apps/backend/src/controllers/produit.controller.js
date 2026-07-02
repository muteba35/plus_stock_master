import mongoose from "mongoose";
import { Boutique, Categorie, MouvementStock, Notification, Produit } from "../models/Utilisateur.js";
import { logInventoryAction } from "../utils/inventoryAudit.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

const canViewPurchasePrice = (req) => req.user?.isOwner || req.user?.permissions?.includes("VOIR_PRIX_ACHAT");
const SUPPORTED_CURRENCIES = ["USD ($)", "CDF (FC)", "EUR (€)"];

const normalizeCurrency = (value, fallback = "USD ($)") => {
  const currency = String(value || "").trim();
  return SUPPORTED_CURRENCIES.includes(currency) ? currency : fallback;
};

const getBoutiqueCurrency = async (boutiqueId) => {
  const boutique = await Boutique.findOne({ _id: boutiqueId, isDeleted: false }).select("deviseParDefaut");
  return boutique?.deviseParDefaut || "USD ($)";
};

const productStatus = (stock, threshold, isExpired = false) => {
  if (isExpired) return "Expire";
  if (stock <= 0) return "Rupture";
  if (stock <= threshold) return "Stock faible";
  return "Disponible";
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const expireProductsIfNeeded = async (boutiqueId, utilisateurId = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredProducts = await Produit.find({
    boutiqueId,
    isDeleted: false,
    isExpired: { $ne: true },
    dateExpiration: { $ne: null, $lte: today },
  }).select("+isDeleted");

  for (const product of expiredProducts) {
    const stockAvant = Number(product.stock || 0);
    product.stock = 0;
    product.isActive = false;
    product.isExpired = true;
    product.expiredAt = new Date();
    await product.save();

    if (stockAvant > 0) {
      await MouvementStock.create({
        produitId: product._id,
        boutiqueId,
        utilisateurId,
        type: "SORTIE",
        quantite: stockAvant,
        variation: -stockAvant,
        stockAvant,
        stockApres: 0,
        motif: "Sortie automatique pour produit expire",
        reference: `EXP-${product.sku}`,
      });
    }

    await logInventoryAction({
      boutiqueId,
      utilisateurId,
      action: "PRODUIT_EXPIRE",
      entityType: "PRODUIT",
      entityId: product._id,
      label: `Produit expire : ${product.nom}`,
      details: { sku: product.sku, stockRetire: stockAvant, dateExpiration: product.dateExpiration },
    });

    await Notification.updateOne(
      { boutiqueId, sourceKey: `product-expired-${product._id}` },
      {
        $setOnInsert: {
          boutiqueId,
          sourceKey: `product-expired-${product._id}`,
          title: "Produit expiré retiré du stock",
          message: `${product.nom} a été retiré automatiquement du stock à cause de sa date d'expiration.`,
          type: "danger",
          priority: "critique",
          category: "expiration",
          href: "/dashboard/inventaire/produits",
          actionLabel: "Voir les produits",
          actionHref: "/dashboard/inventaire/produits",
          createdBy: utilisateurId || null,
          meta: { produitId: product._id, sku: product.sku, stockRetire: stockAvant, dateExpiration: product.dateExpiration },
        },
      },
      { upsert: true }
    );
  }
};

const serializeProduct = (product, showPurchasePrice) => {
  const data = product.toObject();
  if (!showPurchasePrice) delete data.prixAchat;
  return {
    ...data,
    status: productStatus(data.stock, data.seuilAlerte, data.isExpired),
  };
};

const validateCategory = async (categorieId, boutiqueId) => {
  if (!mongoose.isValidObjectId(categorieId)) return null;
  return Categorie.findOne({ _id: categorieId, boutiqueId, isActive: true });
};

export const getProduits = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    await expireProductsIfNeeded(boutiqueId, req.user?.id);

    const showPurchasePrice = canViewPurchasePrice(req);
    const query = Produit.find({ boutiqueId, isDeleted: false })
      .populate("categorieId", "nom couleur")
      .sort({ createdAt: -1 });
    if (showPurchasePrice) query.select("+prixAchat");
    const products = await query;

    return res.status(200).json({
      success: true,
      results: products.length,
      data: products.map((product) => serializeProduct(product, showPurchasePrice)),
    });
  } catch (error) {
    console.error("getProduits:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les produits." });
  }
};

export const getProduitById = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Produit ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    await expireProductsIfNeeded(boutiqueId, req.user?.id);

    const showPurchasePrice = canViewPurchasePrice(req);
    const query = Produit.findOne({ _id: req.params.id, boutiqueId, isDeleted: false })
      .populate("categorieId", "nom couleur");
    if (showPurchasePrice) query.select("+prixAchat");
    const product = await query;
    if (!product) return res.status(404).json({ success: false, message: "Produit introuvable." });
    return res.status(200).json({ success: true, data: serializeProduct(product, showPurchasePrice) });
  } catch (error) {
    console.error("getProduitById:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger le produit." });
  }
};

export const createProduit = async (req, res) => {
  let createdProduct = null;
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const boutiqueCurrency = await getBoutiqueCurrency(boutiqueId);
    const devise = normalizeCurrency(req.body.devise, boutiqueCurrency);
    const nom = String(req.body.nom || "").trim();
    const sku = String(req.body.sku || "").trim().toUpperCase();
    const prixVente = Number(req.body.prixVente);
    const prixAchat = Number(req.body.prixAchat || 0);
    const modeApprovisionnement = req.body.modeApprovisionnement === "GROS" ? "GROS" : "DETAIL";
    const nombreConditionnements = Number(req.body.nombreConditionnements || 0);
    const quantiteParConditionnement = Number(req.body.quantiteParConditionnement || 0);
    const stockInitial = modeApprovisionnement === "GROS"
      ? nombreConditionnements * quantiteParConditionnement
      : Number(req.body.stockInitial || 0);
    const seuilAlerte = Number(req.body.seuilAlerte ?? 5);
    const dateProduction = parseOptionalDate(req.body.dateProduction);
    const dateExpiration = parseOptionalDate(req.body.dateExpiration);

    if (!nom || !sku) return res.status(400).json({ success: false, message: "Le nom et le SKU sont obligatoires." });
    if (dateProduction === undefined || dateExpiration === undefined) {
      return res.status(400).json({ success: false, message: "Date de production ou date d'expiration invalide." });
    }
    if (dateProduction && dateExpiration && dateExpiration <= dateProduction) {
      return res.status(400).json({ success: false, message: "La date d'expiration doit etre posterieure a la date de production." });
    }
    if (
      ![prixVente, prixAchat, stockInitial, seuilAlerte].every(Number.isFinite) ||
      prixVente <= 0 ||
      stockInitial < 0 ||
      seuilAlerte < 0 ||
      (req.body.prixAchat !== undefined && prixAchat <= 0) ||
      (modeApprovisionnement === "GROS" && (!Number.isFinite(nombreConditionnements) || !Number.isFinite(quantiteParConditionnement) || nombreConditionnements <= 0 || quantiteParConditionnement <= 0))
    ) {
      return res.status(400).json({ success: false, message: "Les prix, le stock et le conditionnement doivent contenir des valeurs valides." });
    }

    const category = await validateCategory(req.body.categorieId, boutiqueId);
    if (!category) return res.status(400).json({ success: false, message: "La categorie selectionnee est invalide ou inactive." });

    createdProduct = await Produit.create({
      nom,
      sku,
      description: String(req.body.description || "").trim(),
      categorieId: category._id,
      boutiqueId,
      prixAchat,
      prixVente,
      devise,
      stock: stockInitial,
      seuilAlerte,
      unite: String(req.body.unite || "Pièce").trim(),
      codeBarres: String(req.body.codeBarres || "").trim(),
      image: String(req.body.image || ""),
      modeApprovisionnement,
      libelleConditionnement: String(req.body.libelleConditionnement || "Carton").trim(),
      quantiteParConditionnement,
      nombreConditionnements,
      codeBarresConditionnement: String(req.body.codeBarresConditionnement || "").trim(),
      dateProduction,
      dateExpiration,
    });

    if (stockInitial > 0) {
      await MouvementStock.create({
        produitId: createdProduct._id,
        boutiqueId,
        utilisateurId: req.user.id,
        type: "ENTREE",
        quantite: stockInitial,
        variation: stockInitial,
        stockAvant: 0,
        stockApres: stockInitial,
        motif: modeApprovisionnement === "GROS" ? "Stock initial en gros lors de la creation du produit" : "Stock initial lors de la creation du produit",
        reference: `INIT-${createdProduct.sku}`,
      });
    }

    await expireProductsIfNeeded(boutiqueId, req.user?.id);
    createdProduct = await Produit.findById(createdProduct._id).select("+prixAchat") || createdProduct;
    await createdProduct.populate("categorieId", "nom couleur");
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "PRODUIT_CREE", entityType: "PRODUIT", entityId: createdProduct._id, label: `Produit créé : ${createdProduct.nom}`, details: { sku: createdProduct.sku, stockInitial, dateProduction, dateExpiration } });
    return res.status(201).json({
      success: true,
      message: "Produit cree avec succes.",
      data: serializeProduct(createdProduct, canViewPurchasePrice(req)),
    });
  } catch (error) {
    if (createdProduct) await Produit.deleteOne({ _id: createdProduct._id }).catch(() => undefined);
    if (error?.code === 11000) {
      const field = error.keyPattern?.codeBarres ? "code-barres" : "SKU";
      return res.status(409).json({ success: false, message: `Ce ${field} existe deja dans la boutique.` });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    }
    console.error("createProduit:", error);
    return res.status(500).json({ success: false, message: "Impossible de creer le produit." });
  }
};

export const importProduits = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const rows = Array.isArray(req.body.produits) ? req.body.produits : [];
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (rows.length === 0) return res.status(400).json({ success: false, message: "Le fichier ne contient aucun produit." });
    if (rows.length > 500) return res.status(400).json({ success: false, message: "Un import est limite a 500 produits." });

    const boutiqueCurrency = await getBoutiqueCurrency(boutiqueId);
    const categories = await Categorie.find({ boutiqueId, isActive: true });
    const categoryByName = new Map(categories.map((category) => [category.nom.toLocaleLowerCase("fr"), category]));
    const existingProducts = await Produit.find({ boutiqueId, isDeleted: false }).select("sku codeBarres");
    const existingSkus = new Set(existingProducts.map((product) => product.sku.toUpperCase()));
    const existingBarcodes = new Set(existingProducts.map((product) => product.codeBarres).filter(Boolean));
    const fileSkus = new Set();
    const fileBarcodes = new Set();
    const invalid = [];
    const documents = [];

    rows.forEach((row, index) => {
      const line = Number(row?.line) || index + 2;
      const nom = String(row?.nom || "").trim();
      const sku = String(row?.sku || "").trim().toUpperCase();
      const categoryName = String(row?.categorie || "").trim().toLocaleLowerCase("fr");
      const category = categoryByName.get(categoryName);
      const prixAchat = Number(row?.prixAchat || 0);
      const prixVente = Number(row?.prixVente);
      const modeApprovisionnement = row?.modeApprovisionnement === "GROS" ? "GROS" : "DETAIL";
      const nombreConditionnements = Number(row?.nombreConditionnements || 0);
      const quantiteParConditionnement = Number(row?.quantiteParConditionnement || 0);
      const stockInitial = modeApprovisionnement === "GROS" ? nombreConditionnements * quantiteParConditionnement : Number(row?.stockInitial || 0);
      const seuilAlerte = Number(row?.seuilAlerte ?? 5);
      const codeBarres = String(row?.codeBarres || "").trim();
      const codeBarresConditionnement = String(row?.codeBarresConditionnement || "").trim();
      const devise = normalizeCurrency(row?.devise, boutiqueCurrency);
      const dateProduction = parseOptionalDate(row?.dateProduction);
      const dateExpiration = parseOptionalDate(row?.dateExpiration);
      const numbers = [prixAchat, prixVente, stockInitial, seuilAlerte];

      let reason = "";
      if (!nom || !sku || !categoryName) reason = "Nom, SKU ou categorie manquant";
      else if (!category) reason = "Categorie inexistante ou inactive";
      else if (dateProduction === undefined || dateExpiration === undefined) reason = "Date de production ou expiration invalide";
      else if (dateProduction && dateExpiration && dateExpiration <= dateProduction) reason = "Date d expiration anterieure a la production";
      else if (!numbers.every(Number.isFinite) || numbers.some((value) => value < 0)) reason = "Prix, stock ou seuil invalide";
      else if (modeApprovisionnement === "GROS" && (!Number.isFinite(nombreConditionnements) || !Number.isFinite(quantiteParConditionnement) || nombreConditionnements <= 0 || quantiteParConditionnement <= 0)) reason = "Conditionnement gros invalide";
      else if (existingSkus.has(sku)) reason = "SKU deja existant";
      else if (fileSkus.has(sku)) reason = "SKU en double dans le fichier";
      else if (codeBarres && existingBarcodes.has(codeBarres)) reason = "Code-barres deja existant";
      else if (codeBarres && fileBarcodes.has(codeBarres)) reason = "Code-barres en double dans le fichier";

      if (reason) {
        invalid.push({ line, sku, reason });
        return;
      }

      fileSkus.add(sku);
      if (codeBarres) fileBarcodes.add(codeBarres);
      documents.push({
        nom,
        sku,
        description: String(row?.description || "").trim(),
        categorieId: category._id,
        boutiqueId,
        prixAchat,
        prixVente,
        devise,
        stock: stockInitial,
        seuilAlerte,
        unite: String(row?.unite || "Pièce").trim(),
        codeBarres,
        image: "",
        modeApprovisionnement,
        libelleConditionnement: String(row?.libelleConditionnement || "Carton").trim(),
        quantiteParConditionnement,
        nombreConditionnements,
        codeBarresConditionnement,
        dateProduction,
        dateExpiration,
      });
    });

    let inserted = [];
    if (documents.length > 0) {
      inserted = await Produit.insertMany(documents, { ordered: false });
      const movements = inserted
        .filter((product) => product.stock > 0)
        .map((product) => ({
          produitId: product._id,
          boutiqueId,
          utilisateurId: req.user.id,
          type: "ENTREE",
          quantite: product.stock,
          variation: product.stock,
          stockAvant: 0,
          stockApres: product.stock,
          motif: "Stock initial lors de l'import du produit",
          reference: `INIT-${product.sku}`,
        }));
      if (movements.length > 0) await MouvementStock.insertMany(movements, { ordered: false });
    }
    if (inserted.length > 0) {
      await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "PRODUITS_IMPORTES", entityType: "PRODUIT", label: `${inserted.length} produit(s) importé(s)`, details: { count: inserted.length } });
    }

    return res.status(201).json({
      success: true,
      message: `${inserted.length} produit(s) importe(s) avec succes.`,
      data: { imported: inserted.length, invalid },
    });
  } catch (error) {
    console.error("importProduits:", error);
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Le fichier contient un SKU ou un code-barres deja utilise." });
    return res.status(500).json({ success: false, message: "Impossible d'importer les produits." });
  }
};

export const updateProduit = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Produit ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    let product = await Produit.findOne({ _id: req.params.id, boutiqueId, isDeleted: false }).select("+prixAchat");
    if (!product) return res.status(404).json({ success: false, message: "Produit introuvable." });

    if (req.body.categorieId !== undefined) {
      const category = await validateCategory(req.body.categorieId, boutiqueId);
      if (!category) return res.status(400).json({ success: false, message: "La categorie selectionnee est invalide ou inactive." });
      product.categorieId = category._id;
    }

    if (req.body.nom !== undefined) product.nom = String(req.body.nom).trim();
    if (req.body.sku !== undefined) product.sku = String(req.body.sku).trim().toUpperCase();
    if (req.body.description !== undefined) product.description = String(req.body.description).trim();
    if (req.body.unite !== undefined) product.unite = String(req.body.unite).trim();
    if (req.body.modeApprovisionnement !== undefined) product.modeApprovisionnement = req.body.modeApprovisionnement === "GROS" ? "GROS" : "DETAIL";
    if (req.body.libelleConditionnement !== undefined) product.libelleConditionnement = String(req.body.libelleConditionnement || "").trim();
    if (req.body.quantiteParConditionnement !== undefined) product.quantiteParConditionnement = Number(req.body.quantiteParConditionnement || 0);
    if (req.body.nombreConditionnements !== undefined) product.nombreConditionnements = Number(req.body.nombreConditionnements || 0);
    if (req.body.codeBarresConditionnement !== undefined) product.codeBarresConditionnement = String(req.body.codeBarresConditionnement || "").trim();
    if (req.body.dateProduction !== undefined) {
      const dateProduction = parseOptionalDate(req.body.dateProduction);
      if (dateProduction === undefined) return res.status(400).json({ success: false, message: "Date de production invalide." });
      product.dateProduction = dateProduction;
    }
    if (req.body.dateExpiration !== undefined) {
      const dateExpiration = parseOptionalDate(req.body.dateExpiration);
      if (dateExpiration === undefined) return res.status(400).json({ success: false, message: "Date d'expiration invalide." });
      product.dateExpiration = dateExpiration;
      product.isExpired = false;
      product.expiredAt = null;
      if (dateExpiration && dateExpiration < new Date()) {
        product.isActive = false;
      }
    }
    if (product.dateProduction && product.dateExpiration && product.dateExpiration <= product.dateProduction) {
      return res.status(400).json({ success: false, message: "La date d'expiration doit etre posterieure a la date de production." });
    }
    if (req.body.codeBarres !== undefined) product.codeBarres = String(req.body.codeBarres).trim();
    if (req.body.image !== undefined) product.image = String(req.body.image);
    if (req.body.isActive !== undefined) product.isActive = Boolean(req.body.isActive);
    if (req.body.devise !== undefined) {
      const devise = normalizeCurrency(req.body.devise, "");
      if (!devise) return res.status(400).json({ success: false, message: "Devise du produit invalide." });
      product.devise = devise;
    }

    for (const field of ["prixVente", "seuilAlerte"]) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value) || (field === "prixVente" ? value <= 0 : value < 0)) return res.status(400).json({ success: false, message: `${field} contient une valeur invalide.` });
        product[field] = value;
      }
    }
    if (req.body.prixAchat !== undefined) {
      if (!canViewPurchasePrice(req)) {
        return res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier le prix d'achat." });
      }
      const value = Number(req.body.prixAchat);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ success: false, message: "prixAchat doit etre superieur a zero." });
      product.prixAchat = value;
    }

    await product.save();
    await expireProductsIfNeeded(boutiqueId, req.user?.id);
    product = await Produit.findById(product._id).select("+prixAchat") || product;
    await product.populate("categorieId", "nom couleur");
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "PRODUIT_MODIFIE", entityType: "PRODUIT", entityId: product._id, label: `Produit modifié : ${product.nom}`, details: { sku: product.sku } });
    return res.status(200).json({ success: true, message: "Produit mis a jour avec succes.", data: serializeProduct(product, canViewPurchasePrice(req)) });
  } catch (error) {
    if (error?.code === 11000) {
      const field = error.keyPattern?.codeBarres ? "code-barres" : "SKU";
      return res.status(409).json({ success: false, message: `Ce ${field} existe deja dans la boutique.` });
    }
    if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    console.error("updateProduit:", error);
    return res.status(500).json({ success: false, message: "Impossible de modifier le produit." });
  }
};

export const deleteProduit = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Produit ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    const product = await Produit.findOne({ _id: req.params.id, boutiqueId, isDeleted: false }).select("+isDeleted");
    if (!product) return res.status(404).json({ success: false, message: "Produit introuvable." });
    if (product.stock > 0) {
      return res.status(409).json({ success: false, message: "Le stock doit etre a zero avant de supprimer ce produit." });
    }
    product.isDeleted = true;
    product.isActive = false;
    await product.save();
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "PRODUIT_SUPPRIME", entityType: "PRODUIT", entityId: product._id, label: `Produit supprimé : ${product.nom}`, details: { sku: product.sku } });
    return res.status(200).json({ success: true, message: "Produit supprime avec succes." });
  } catch (error) {
    console.error("deleteProduit:", error);
    return res.status(500).json({ success: false, message: "Impossible de supprimer le produit." });
  }
};
