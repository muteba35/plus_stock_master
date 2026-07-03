"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, Edit2, Eye, FileSpreadsheet, ImagePlus, Loader2, PackagePlus, Plus, RotateCcw, SlidersHorizontal, Trash2, Upload, XCircle } from "lucide-react";
import { InventoryModal, InventoryPagination, PageHeader, SearchInput, StatusBadge, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";
import { formatMoney, getActiveBoutiqueCurrency } from "../components/currency";
import ProductImportModal from "./components/ProductImportModal";

type CategoryOption = { _id: string; nom: string; couleur: string; isActive: boolean };
type ProductStatus = "Disponible" | "Stock faible" | "Rupture" | "Expire";
type Product = {
  _id: string;
  nom: string;
  sku: string;
  description: string;
  categorieId: CategoryOption;
  prixAchat?: number;
  prixVente: number;
  devise?: string;
  stock: number;
  seuilAlerte: number;
  unite: string;
  codeBarres: string;
  modeApprovisionnement?: "DETAIL" | "GROS";
  libelleConditionnement?: string;
  quantiteParConditionnement?: number;
  nombreConditionnements?: number;
  codeBarresConditionnement?: string;
  dateProduction?: string;
  dateExpiration?: string;
  isExpired?: boolean;
  image: string;
  isActive: boolean;
  status: ProductStatus;
};
type ProductForm = {
  nom: string;
  sku: string;
  description: string;
  categorieId: string;
  prixAchat: string;
  prixVente: string;
  stockInitial: string;
  seuilAlerte: string;
  unite: string;
  codeBarres: string;
  modeApprovisionnement: "DETAIL" | "GROS";
  libelleConditionnement: string;
  quantiteParConditionnement: string;
  nombreConditionnements: string;
  codeBarresConditionnement: string;
  dateProduction: string;
  dateExpiration: string;
  image: string;
  isActive: boolean;
  devise: string;
};
type ImportProductRow = {
  line: number;
  nom: string;
  sku: string;
  categorie: string;
  description: string;
  prixAchat: string;
  prixVente: string;
  stockInitial: string;
  seuilAlerte: string;
  unite: string;
  codeBarres: string;
  devise: string;
  modeApprovisionnement: "DETAIL" | "GROS";
  libelleConditionnement: string;
  quantiteParConditionnement: string;
  nombreConditionnements: string;
  codeBarresConditionnement: string;
  dateProduction: string;
  dateExpiration: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const formatProductDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "Non renseignée";
const DEVISES = ["USD ($)", "CDF (FC)", "EUR (€)"];
const EMPTY_FORM: ProductForm = {
  nom: "",
  sku: "",
  description: "",
  categorieId: "",
  prixAchat: "",
  prixVente: "",
  stockInitial: "",
  seuilAlerte: "5",
  unite: "Pièce",
  codeBarres: "",
  modeApprovisionnement: "DETAIL",
  libelleConditionnement: "Carton",
  quantiteParConditionnement: "",
  nombreConditionnements: "",
  codeBarresConditionnement: "",
  dateProduction: "",
  dateExpiration: "",
  image: "",
  isActive: true,
  devise: "USD ($)",
};
const UNITS = ["Pièce", "Boîte", "Paquet", "Kg", "Gramme", "Litre", "Mètre", "Sachet", "Bouteille", "Casier", "Caisse", "Carton", "Bidon"];

const requestHeaders = () => {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

const compressProductImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) {
    reject(new Error("Le fichier sélectionné n'est pas une image."));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    reject(new Error("L'image source ne doit pas dépasser 10 Mo."));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Impossible de lire cette image."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("Format d'image non pris en charge. Utilisez JPG, PNG ou WebP."));
    image.onload = () => {
      const maxSize = 720;
      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Impossible de préparer cette image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.68));
    };
    image.src = String(reader.result || "");
  };
  reader.readAsDataURL(file);
});

const parseCsvLine = (line: string, separator: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === separator && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
};

const normalizeHeader = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[ -]/g, "_");

const parseProductCsv = (content: string): ImportProductRow[] => {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Le fichier doit contenir un en-tête et au moins un produit.");
  const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseCsvLine(lines[0], separator).map(normalizeHeader);
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = {
    nom: indexOf("nom", "name", "produit"), sku: indexOf("sku", "reference"), categorie: indexOf("categorie", "category"),
    description: indexOf("description"), prixAchat: indexOf("prix_achat", "purchase_price"), prixVente: indexOf("prix_vente", "sale_price"),
    stockInitial: indexOf("stock_initial", "stock"), seuilAlerte: indexOf("seuil_alerte", "seuil"), unite: indexOf("unite", "unit"), codeBarres: indexOf("code_barres", "barcode"), devise: indexOf("devise", "currency"),
    modeApprovisionnement: indexOf("mode_approvisionnement", "mode", "type_insertion"), libelleConditionnement: indexOf("conditionnement", "libelle_conditionnement"),
    quantiteParConditionnement: indexOf("quantite_par_conditionnement", "unites_par_conditionnement"), nombreConditionnements: indexOf("nombre_conditionnements", "nb_conditionnements"),
    codeBarresConditionnement: indexOf("code_barres_conditionnement", "barcode_conditionnement"), dateProduction: indexOf("date_production"), dateExpiration: indexOf("date_expiration"),
  };
  if (indexes.nom < 0 || indexes.sku < 0 || indexes.categorie < 0 || indexes.prixVente < 0) {
    throw new Error("Colonnes obligatoires : nom, sku, categorie et prix_vente.");
  }
  const valueAt = (values: string[], index: number, fallback = "") => index >= 0 ? values[index] || fallback : fallback;
  return lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line, separator);
    return {
      line: lineIndex + 2,
      nom: valueAt(values, indexes.nom), sku: valueAt(values, indexes.sku).toUpperCase(), categorie: valueAt(values, indexes.categorie),
      description: valueAt(values, indexes.description), prixAchat: valueAt(values, indexes.prixAchat, "0"), prixVente: valueAt(values, indexes.prixVente),
      stockInitial: valueAt(values, indexes.stockInitial, "0"), seuilAlerte: valueAt(values, indexes.seuilAlerte, "5"), unite: valueAt(values, indexes.unite, "Pièce"), codeBarres: valueAt(values, indexes.codeBarres), devise: valueAt(values, indexes.devise, getActiveBoutiqueCurrency()),
      modeApprovisionnement: valueAt(values, indexes.modeApprovisionnement, "DETAIL").toUpperCase() === "GROS" ? "GROS" : "DETAIL",
      libelleConditionnement: valueAt(values, indexes.libelleConditionnement, "Carton"),
      quantiteParConditionnement: valueAt(values, indexes.quantiteParConditionnement, ""),
      nombreConditionnements: valueAt(values, indexes.nombreConditionnements, ""),
      codeBarresConditionnement: valueAt(values, indexes.codeBarresConditionnement, ""),
      dateProduction: valueAt(values, indexes.dateProduction, ""),
      dateExpiration: valueAt(values, indexes.dateExpiration, ""),
    };
  });
};

export default function ProduitsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("active");
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportProductRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currency, setCurrency] = useState("USD ($)");
  const [{ permissions, isOwner }] = useState(getStoredAccess);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const canCreate = isOwner || permissions.includes("AJOUTER_PRODUIT");
  const canEdit = isOwner || permissions.includes("MODIFIER_PRODUIT");
  const canDelete = isOwner || permissions.includes("SUPPRIMER_PRODUIT");
  const canViewPurchasePrice = isOwner || permissions.includes("VOIR_PRIX_ACHAT");

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/inventaire/produits`, { headers: requestHeaders() }),
        fetch(`${API_URL}/inventaire/categories`, { headers: requestHeaders() }),
      ]);
      const [productsData, categoriesData] = await Promise.all([productsResponse.json(), categoriesResponse.json()]);
      if (!productsResponse.ok || !productsData.success) throw new Error(productsData.message || "Impossible de charger les produits.");
      setProducts(productsData.data || []);
      setCategories(categoriesResponse.ok && categoriesData.success ? (categoriesData.data || []) : []);
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    const syncCurrency = () => setCurrency(getActiveBoutiqueCurrency());
    syncCurrency();
    window.addEventListener("userProfileUpdated", syncCurrency);
    return () => window.removeEventListener("userProfileUpdated", syncCurrency);
  }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => {
    if (searchParams.get("new") === "1" && canCreate && !formOpen) openCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canCreate, categories.length]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = product.nom.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query) || (product.codeBarres || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || product.categorieId?._id === categoryFilter;
      const matchesActivity = activityFilter === "all" || (activityFilter === "active" ? product.isActive : !product.isActive);
      return matchesSearch && matchesStatus && matchesCategory && matchesActivity;
    });
  }, [products, search, statusFilter, categoryFilter, activityFilter]);
  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginatedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const productToForm = (product: Product): ProductForm => ({
    nom: product.nom,
    sku: product.sku,
    description: product.description || "",
    categorieId: product.categorieId?._id || "",
    prixAchat: String(product.prixAchat ?? 0),
    prixVente: String(product.prixVente),
    stockInitial: String(product.stock),
    seuilAlerte: String(product.seuilAlerte),
    unite: product.unite || "Pièce",
    codeBarres: product.codeBarres || "",
    image: product.image || "",
    modeApprovisionnement: product.modeApprovisionnement || "DETAIL",
    libelleConditionnement: product.libelleConditionnement || "Carton",
    quantiteParConditionnement: String(product.quantiteParConditionnement || ""),
    nombreConditionnements: String(product.nombreConditionnements || ""),
    codeBarresConditionnement: product.codeBarresConditionnement || "",
    dateProduction: product.dateProduction ? product.dateProduction.slice(0, 10) : "",
    dateExpiration: product.dateExpiration ? product.dateExpiration.slice(0, 10) : "",
    isActive: product.isActive,
    devise: product.devise || currency,
  });

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
    setForm({ ...EMPTY_FORM, devise: currency, categorieId: categories.find((category) => category.isActive)?._id || "" });
    setFormError("");
    setFormOpen(true);
  };
  const openProduct = (product: Product, mode: "edit" | "view") => {
    setSelected(product);
    setModalMode(mode);
    setForm(productToForm(product));
    setFormError("");
    setFormOpen(true);
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    try {
      setImageProcessing(true);
      setFormError("");
      const compressedImage = await compressProductImage(file);
      setForm((current) => ({ ...current, image: compressedImage }));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible de traiter cette image.");
    } finally {
      setImageProcessing(false);
    }
  };

  const saveProduct = async () => {
    const requiredErrors: string[] = [];
    if (!form.nom.trim()) requiredErrors.push("nom du produit");
    if (!form.sku.trim()) requiredErrors.push("SKU");
    if (!form.categorieId) requiredErrors.push("catégorie");
    if (!DEVISES.includes(form.devise)) requiredErrors.push("devise du produit");
    if (!form.prixVente.trim() || Number(form.prixVente) <= 0) requiredErrors.push("prix de vente supérieur à zéro");
    if (canViewPurchasePrice && (!form.prixAchat.trim() || Number(form.prixAchat) <= 0)) requiredErrors.push("prix d'achat supérieur à zéro");
    if (modalMode === "create" && form.modeApprovisionnement === "DETAIL" && (!form.stockInitial.trim() || Number(form.stockInitial) < 0)) {
      requiredErrors.push("stock initial valide");
    }

    if (modalMode === "create" && form.modeApprovisionnement === "GROS") {
      const packagesCount = Number(form.nombreConditionnements || 0);
      const unitsPerPackage = Number(form.quantiteParConditionnement || 0);
      if (!Number.isFinite(packagesCount) || !Number.isFinite(unitsPerPackage) || packagesCount <= 0 || unitsPerPackage <= 0) {
        requiredErrors.push("conditionnement gros valide");
      }
    }
    if (!form.seuilAlerte.trim() || Number(form.seuilAlerte) < 0) requiredErrors.push("seuil d'alerte valide");
    if (!form.unite.trim()) requiredErrors.push("unité");
    if (requiredErrors.length > 0) {
      setFormError(`Veuillez compléter correctement : ${requiredErrors.join(", ")}.`);
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const payload: Record<string, unknown> = {
        nom: form.nom,
        sku: form.sku,
        description: form.description,
        categorieId: form.categorieId,
        prixVente: Number(form.prixVente),
        devise: form.devise,
        seuilAlerte: Number(form.seuilAlerte),
        unite: form.unite,
        codeBarres: form.codeBarres,
        modeApprovisionnement: form.modeApprovisionnement,
        libelleConditionnement: form.libelleConditionnement,
        quantiteParConditionnement: Number(form.quantiteParConditionnement || 0),
        nombreConditionnements: Number(form.nombreConditionnements || 0),
        codeBarresConditionnement: form.codeBarresConditionnement,
        dateProduction: form.dateProduction || null,
        dateExpiration: form.dateExpiration || null,
        image: form.image,
        isActive: form.isActive,
      };
      if (canViewPurchasePrice) payload.prixAchat = Number(form.prixAchat);
      if (modalMode === "create") {
        payload.stockInitial = form.modeApprovisionnement === "GROS"
          ? Number(form.nombreConditionnements || 0) * Number(form.quantiteParConditionnement || 0)
          : Number(form.stockInitial);
      }
      const response = await fetch(modalMode === "edit" && selected ? `${API_URL}/inventaire/produits/${selected._id}` : `${API_URL}/inventaire/produits`, {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: requestHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Enregistrement impossible.");
      setFormOpen(false);
      showMessage("success", data.message || "Produit enregistré avec succès.");
      await fetchData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      setDeleteError("");
      const response = await fetch(`${API_URL}/inventaire/produits/${selected._id}`, { method: "DELETE", headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Suppression impossible.");
      setDeleteOpen(false);
      setSelected(null);
      showMessage("success", data.message || "Produit supprimé.");
      await fetchData();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const downloadImportTemplate = () => {
    const content = "\uFEFFnom;sku;categorie;description;prix_achat;prix_vente;stock_initial;seuil_alerte;unite;code_barres;devise;mode_approvisionnement;conditionnement;nombre_conditionnements;quantite_par_conditionnement;code_barres_conditionnement;date_production;date_expiration\r\nClavier mécanique;CLA-MEC-001;Périphériques;Clavier USB professionnel;45;69;20;5;Pièce;1234567890123;USD ($);DETAIL;;;;;2026-01-01;2027-01-01\r\nMayonnaise carton;MAY-GRO-001;Alimentation;Carton de 10 bouteilles;10;15;0;5;Bouteille;9876543210001;CDF (FC);GROS;Carton;2;10;9876543219999;2026-01-01;2026-12-31";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-produits-movoora.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file?: File) => {
    setImportError("");
    setImportRows([]);
    setImportFileName(file?.name || "");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportError("Utilisez le modèle CSV compatible avec Excel.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImportError("Le fichier ne doit pas dépasser 3 Mo.");
      return;
    }
    try {
      const rows = parseProductCsv(await file.text());
      if (rows.length > 500) throw new Error("Un import est limité à 500 produits.");
      const categoryNames = new Set(categories.filter((category) => category.isActive).map((category) => category.nom.toLocaleLowerCase("fr")));
      const invalid = rows.find((row) =>
        !row.nom || !row.sku || !row.categorie || !row.prixVente || !DEVISES.includes(row.devise || currency) ||
        !categoryNames.has(row.categorie.toLocaleLowerCase("fr")) ||
        [row.prixAchat, row.prixVente, row.seuilAlerte].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0) ||
        (row.modeApprovisionnement === "DETAIL" && (!Number.isFinite(Number(row.stockInitial)) || Number(row.stockInitial) < 0)) ||
        (row.modeApprovisionnement === "GROS" && (!Number.isFinite(Number(row.nombreConditionnements)) || !Number.isFinite(Number(row.quantiteParConditionnement)) || Number(row.nombreConditionnements) <= 0 || Number(row.quantiteParConditionnement) <= 0))
      );
      if (invalid) throw new Error(`La ligne ${invalid.line} contient une catégorie inconnue ou une valeur obligatoire invalide.`);
      setImportRows(rows);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Impossible de lire le fichier.");
    }
  };

  const importProducts = async () => {
    if (importRows.length === 0) return;
    try {
      setSaving(true);
      setImportError("");
      const response = await fetch(`${API_URL}/inventaire/produits/import`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ produits: importRows }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Import impossible.");
      setImportOpen(false);
      setImportRows([]);
      setImportFileName("");
      showMessage("success", `${data.data?.imported || 0} produit(s) importé(s), ${data.data?.invalid?.length || 0} ligne(s) ignorée(s).`);
      await fetchData();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => { setStatusFilter("all"); setCategoryFilter("all"); setActivityFilter("active"); };
  const activeFilterCount = Number(statusFilter !== "all") + Number(categoryFilter !== "all") + Number(activityFilter !== "active");
  const readOnly = modalMode === "view";
  const computedBulkStock = Number(form.nombreConditionnements || 0) * Number(form.quantiteParConditionnement || 0);

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Gestion des produits" subtitle="Créez et gérez les articles de la boutique active." action={canCreate ? <div className="flex flex-col min-[420px]:flex-row gap-2"><button onClick={() => { setImportOpen(true); setImportError(""); setImportRows([]); setImportFileName(""); }} className={secondaryButton}><FileSpreadsheet size={15} /> Importer Excel</button><button onClick={openCreate} className={primaryButton}><Plus size={15} /> Nouveau produit</button></div> : undefined} />

      {message && <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{message.text}</div>}

      <ProductImportModal currency={currency} open={importOpen} saving={saving} rows={importRows} fileName={importFileName} error={importError} onClose={() => !saving && setImportOpen(false)} onDownloadTemplate={downloadImportTemplate} onFile={(file) => void handleImportFile(file)} onImport={importProducts} />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, SKU ou code-barres..." />
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`} title="Filtrer"><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>
            {filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(20rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex items-center justify-between"><p className="text-xs font-bold">Filtres</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> Réinitialiser</button></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Catégorie</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={fieldClass}><option value="all">Toutes les catégories</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.nom}</option>)}</select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">État du stock</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="all">Tous</option><option value="Disponible">Disponible</option><option value="Stock faible">Stock faible</option><option value="Rupture">Rupture</option><option value="Expire">Expire</option></select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Activité</span><select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} className={fieldClass}><option value="all">Tous</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select></label><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>Appliquer</button></div>}
          </div>
        </div>

        <div className="relative z-0 overflow-x-auto">
          {loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">Chargement des produits...</p></div> : <table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Catégorie</th>{canViewPurchasePrice && <th className="px-5 py-4">Prix d'achat</th>}<th className="px-5 py-4">Prix de vente</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedProducts.map((product) => <tr key={product._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-100" /> : <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><PackagePlus size={16} /></span>}<div><p className="font-bold text-slate-900">{product.nom}</p><p className="text-[10px] text-slate-400 mt-0.5">{product.sku} · {product.unite}</p></div></div></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.categorieId?.couleur || "#94a3b8" }} />{product.categorieId?.nom || "Non classé"}</span></td>{canViewPurchasePrice && <td className="px-5 py-4 font-bold text-slate-600">{formatMoney(product.prixAchat || 0, product.devise || "USD ($)")}</td>}<td className="px-5 py-4 font-bold">{formatMoney(product.prixVente, product.devise || "USD ($)")}</td><td className="px-5 py-4"><span className="font-black">{product.stock}</span><span className="text-slate-400"> / seuil {product.seuilAlerte}</span></td><td className="px-5 py-4"><StatusBadge status={product.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openProduct(product, "view")} className="p-2 text-slate-400 hover:text-indigo-600" title="Consulter"><Eye size={15} /></button><button disabled={!canEdit} onClick={() => openProduct(product, "edit")} className={`p-2 ${canEdit ? "text-slate-400 hover:text-amber-600" : "text-slate-200 cursor-not-allowed"}`} title={canEdit ? "Modifier" : "Permission MODIFIER_PRODUIT requise"}><Edit2 size={15} /></button><button disabled={!canDelete} onClick={() => { setSelected(product); setDeleteError(""); setDeleteOpen(true); }} className={`p-2 ${canDelete ? "text-slate-400 hover:text-rose-600" : "text-slate-200 cursor-not-allowed"}`} title={canDelete ? "Supprimer" : "Permission SUPPRIMER_PRODUIT requise"}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>}
        </div>
        {!loading && filtered.length === 0 && <div className="py-14 text-center"><PackagePlus size={26} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">Aucun produit trouvé</p><p className="text-xs text-slate-400 mt-1">Créez un produit ou ajustez vos filtres.</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} produit(s) affiché(s)</div>
        <InventoryPagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </div>

      <InventoryModal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={modalMode === "create" ? "Nouveau produit" : modalMode === "edit" ? "Modifier le produit" : "Fiche du produit"} subtitle={modalMode === "create" ? "Le stock initial créera automatiquement une entrée de stock." : modalMode === "edit" ? "La quantité se modifie uniquement dans les mouvements de stock." : "Informations enregistrées dans la boutique active."} notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{formError}</div> : undefined} footer={readOnly ? <button onClick={() => setFormOpen(false)} className={secondaryButton}>Fermer</button> : <><button disabled={saving} onClick={() => setFormOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={saveProduct} className={primaryButton}>{saving && <Loader2 size={14} className="animate-spin" />}{modalMode === "create" ? "Créer le produit" : "Enregistrer"}</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 flex items-center gap-4"><span className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">{imageProcessing ? <Loader2 size={20} className="animate-spin text-indigo-500" /> : form.image ? <img src={form.image} alt="Aperçu" className="w-full h-full object-cover" /> : <ImagePlus size={20} className="text-slate-400" />}</span>{!readOnly && <span className={`${secondaryButton} cursor-pointer ${imageProcessing ? "opacity-50 pointer-events-none" : ""}`}><ImagePlus size={14} /> {imageProcessing ? "Compression..." : "Choisir une image"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleImage(event.target.files?.[0])} /></span>}<span className="text-[10px] text-slate-400">JPG, PNG ou WebP · compression automatique</span></label>
          <label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Nom du produit <b className="text-rose-500">*</b></span><input required disabled={readOnly} value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} className={fieldClass} placeholder="Ex: Clavier mécanique" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">SKU <b className="text-rose-500">*</b></span><input required disabled={readOnly} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} className={fieldClass} placeholder="CLA-MEC-001" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Catégorie <b className="text-rose-500">*</b></span><select required disabled={readOnly} value={form.categorieId} onChange={(event) => setForm({ ...form, categorieId: event.target.value })} className={fieldClass}><option value="">Sélectionner...</option>{categories.filter((category) => category.isActive || category._id === form.categorieId).map((category) => <option key={category._id} value={category._id}>{category.nom}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Devise du produit <b className="text-rose-500">*</b></span><select required disabled={readOnly} value={form.devise} onChange={(event) => setForm({ ...form, devise: event.target.value })} className={fieldClass}>{DEVISES.map((devise) => <option key={devise} value={devise}>{devise}</option>)}</select></label>
          {canViewPurchasePrice && <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Prix d'achat ({form.devise}) <b className="text-rose-500">*</b></span><input required disabled={readOnly} type="number" min="0.01" step="0.01" value={form.prixAchat} onChange={(event) => setForm({ ...form, prixAchat: event.target.value })} className={fieldClass} /></label>}
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Prix de vente ({form.devise}) <b className="text-rose-500">*</b></span><input required disabled={readOnly} type="number" min="0.01" step="0.01" value={form.prixVente} onChange={(event) => setForm({ ...form, prixVente: event.target.value })} className={fieldClass} /></label>
          {modalMode === "create" && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" disabled={readOnly} onClick={() => setForm({ ...form, modeApprovisionnement: "DETAIL" })} className={(form.modeApprovisionnement === "DETAIL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500") + " h-9 rounded-lg text-[11px] font-bold"}>Insertion en detail</button>
              <button type="button" disabled={readOnly} onClick={() => setForm({ ...form, modeApprovisionnement: "GROS" })} className={(form.modeApprovisionnement === "GROS" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500") + " h-9 rounded-lg text-[11px] font-bold"}>Insertion en gros</button>
            </div>
          )}
          {modalMode === "create" && form.modeApprovisionnement === "DETAIL" ? (
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Stock initial <b className="text-rose-500">*</b></span><input required type="number" min="0" value={form.stockInitial} onChange={(event) => setForm({ ...form, stockInitial: event.target.value })} className={fieldClass} /></label>
          ) : modalMode === "create" ? (
            <>
              <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Conditionnement</span><input value={form.libelleConditionnement} onChange={(event) => setForm({ ...form, libelleConditionnement: event.target.value })} className={fieldClass} placeholder="Ex: Carton, pack, caisse" /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Nombre de conditionnements <b className="text-rose-500">*</b></span><input required type="number" min="1" value={form.nombreConditionnements} onChange={(event) => setForm({ ...form, nombreConditionnements: event.target.value })} className={fieldClass} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Unites par conditionnement <b className="text-rose-500">*</b></span><input required type="number" min="1" value={form.quantiteParConditionnement} onChange={(event) => setForm({ ...form, quantiteParConditionnement: event.target.value })} className={fieldClass} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Stock calcule</span><input disabled value={`${computedBulkStock || 0} ${form.unite}`} className={`${fieldClass} bg-slate-100`} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Code-barres conditionnement</span><input value={form.codeBarresConditionnement} onChange={(event) => setForm({ ...form, codeBarresConditionnement: event.target.value })} className={fieldClass} placeholder="Facultatif" /></label>
            </>
          ) : (
            <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Stock actuel</span><input disabled value={`${selected?.stock || 0} ${selected?.unite || ""}`} className={`${fieldClass} bg-slate-100`} /></label>
          )}
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Seuil d'alerte <b className="text-rose-500">*</b></span><input required disabled={readOnly} type="number" min="0" value={form.seuilAlerte} onChange={(event) => setForm({ ...form, seuilAlerte: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Unité <b className="text-rose-500">*</b></span><select required disabled={readOnly} value={form.unite} onChange={(event) => setForm({ ...form, unite: event.target.value })} className={fieldClass}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Code-barres detail</span><input disabled={readOnly} value={form.codeBarres} onChange={(event) => setForm({ ...form, codeBarres: event.target.value })} className={fieldClass} placeholder="Facultatif" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Date de production</span><input disabled={readOnly} type="date" value={form.dateProduction} onChange={(event) => setForm({ ...form, dateProduction: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Date d'expiration</span><input disabled={readOnly} type="date" value={form.dateExpiration} onChange={(event) => setForm({ ...form, dateExpiration: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Description</span><textarea disabled={readOnly} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${fieldClass} h-auto py-3 resize-none`} /></label>
{readOnly && <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Informations de conservation</p><div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><div><p className="text-slate-400 font-bold">Production</p><p className="font-black text-slate-800">{formatProductDate(form.dateProduction)}</p></div><div><p className="text-slate-400 font-bold">Expiration</p><p className="font-black text-slate-800">{formatProductDate(form.dateExpiration)}</p></div></div>{selected?.isExpired && <p className="mt-3 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">Ce produit est expiré : son stock est automatiquement passé à zéro.</p>}</div>}
          {modalMode === "edit" && <label className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl border border-slate-200"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="w-4 h-4 accent-indigo-600" /><span className="text-xs font-bold text-slate-700">Produit actif et disponible dans le catalogue</span></label>}
        </div>
      </InventoryModal>

      <InventoryModal open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)} title="Supprimer le produit" subtitle="Le stock doit être à zéro avant cette opération." notice={deleteError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{deleteError}</div> : undefined} footer={<><button disabled={saving} onClick={() => setDeleteOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={deleteProduct} className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-rose-600 text-white text-xs font-bold rounded-xl">{saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer</button></>}><div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100"><AlertTriangle size={18} className="text-amber-600 shrink-0" /><p className="text-xs text-amber-800">Voulez-vous supprimer <strong>{selected?.nom}</strong> ? Son historique de mouvements sera conservé.</p></div></InventoryModal>
    </div>
  );
}


