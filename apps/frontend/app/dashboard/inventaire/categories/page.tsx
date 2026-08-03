"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Edit2, FileSpreadsheet, FolderTree, Loader2, Plus, RotateCcw, SlidersHorizontal, Trash2, Upload, XCircle } from "lucide-react";
import { InventoryModal, InventoryPagination, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";
import { formatMoney, getActiveBoutiqueCurrency } from "../components/currency";

type Category = {
  _id: string;
  nom: string;
  description: string;
  couleur: string;
  productCount: number;
  stockValues?: Array<{ devise: string; value: number }>;
  isActive: boolean;
  createdAt: string;
};

type CategoryForm = {
  nom: string;
  description: string;
  couleur: string;
};

type ImportRow = CategoryForm & { line: number };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];
const EMPTY_FORM: CategoryForm = { nom: "", description: "", couleur: COLORS[0] };

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

const parseCsvLine = (line: string, separator: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === separator && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const normalizeHeader = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const parseCategoryCsv = (content: string): ImportRow[] => {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Le fichier doit contenir un en-tête et au moins une catégorie.");
  const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseCsvLine(lines[0], separator).map(normalizeHeader);
  const nameIndex = headers.findIndex((header) => ["nom", "categorie", "category", "name"].includes(header));
  const descriptionIndex = headers.indexOf("description");
  const colorIndex = headers.findIndex((header) => ["couleur", "color"].includes(header));
  if (nameIndex < 0) throw new Error("La colonne obligatoire « nom » est introuvable.");

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, separator);
    return {
      line: index + 2,
      nom: values[nameIndex] || "",
      description: descriptionIndex >= 0 ? values[descriptionIndex] || "" : "",
      couleur: colorIndex >= 0 && values[colorIndex] ? values[colorIndex] : COLORS[0],
    };
  });
};

export default function CategoriesInventairePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currency, setCurrency] = useState("USD ($)");
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const canCreate = isOwner || permissions.includes("CREER_CATEGORIE");
  const canEdit = isOwner || permissions.includes("MODIFIER_CATEGORIE");
  const canDelete = isOwner || permissions.includes("SUPPRIMER_CATEGORIE");

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const requestHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventaire/categories`, { headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les catégories.");
      setCategories(data.data || []);
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

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const closeFilter = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", closeFilter);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeFilter);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch = category.nom.toLowerCase().includes(query) || (category.description || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? category.isActive : !category.isActive);
      const matchesUsage = usageFilter === "all" || (usageFilter === "used" ? category.productCount > 0 : category.productCount === 0);
      return matchesSearch && matchesStatus && matchesUsage;
    });
  }, [categories, search, statusFilter, usageFilter]);
  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginatedCategories = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setSelected(category);
    setForm({ nom: category.nom, description: category.description || "", couleur: category.couleur || COLORS[0] });
    setFormError("");
    setFormOpen(true);
  };

  const saveCategory = async () => {
    if (!form.nom.trim()) {
      setFormError("Le nom de la catégorie est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const response = await fetch(
        selected ? `${API_URL}/inventaire/categories/${selected._id}` : `${API_URL}/inventaire/categories`,
        {
          method: selected ? "PUT" : "POST",
          headers: requestHeaders(),
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Enregistrement impossible.");
      setFormOpen(false);
      showMessage("success", data.message || "Catégorie enregistrée avec succès.");
      await fetchCategories();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventaire/categories/${selected._id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Suppression impossible.");
      setDeleteOpen(false);
      setSelected(null);
      showMessage("success", data.message || "Catégorie supprimée.");
      await fetchCategories();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const content = "\uFEFFnom;description;couleur\r\nÉlectronique;Ordinateurs et accessoires;#6366f1\r\nConsommables;Articles renouvelables;#10b981";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-categories-movora.csv";
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
    if (file.size > 2 * 1024 * 1024) {
      setImportError("Le fichier ne doit pas dépasser 2 Mo.");
      return;
    }
    try {
      const rows = parseCategoryCsv(await file.text());
      const invalid = rows.find((row) => !row.nom.trim() || !/^#[0-9A-Fa-f]{6}$/.test(row.couleur));
      if (invalid) throw new Error(`La ligne ${invalid.line} contient un nom vide ou une couleur invalide.`);
      if (rows.length > 500) throw new Error("Un import est limité à 500 catégories.");
      setImportRows(rows);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Impossible de lire le fichier.");
    }
  };

  const importCategories = async () => {
    if (importRows.length === 0) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventaire/categories/import`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ categories: importRows }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Import impossible.");
      const skipped = data.data?.skippedExisting || 0;
      const invalid = data.data?.invalid?.length || 0;
      setImportOpen(false);
      setImportRows([]);
      setImportFileName("");
      showMessage("success", `${data.data?.imported || 0} catégorie(s) importée(s), ${skipped + invalid} ignorée(s).`);
      await fetchCategories();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setUsageFilter("all");
  };

  const activeFilterCount = Number(statusFilter !== "all") + Number(usageFilter !== "all");

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader
        title="Catégories de produits"
        subtitle="Organisez votre catalogue en familles propres à la boutique active."
        action={canCreate ? <div className="flex flex-col min-[420px]:flex-row gap-2"><button onClick={() => { setImportOpen(true); setImportError(""); }} className={secondaryButton}><FileSpreadsheet size={15} /> Importer Excel</button><button onClick={openCreate} className={primaryButton}><Plus size={15} /> Nouvelle catégorie</button></div> : undefined}
      />

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
          {message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une catégorie..." />
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`} title="Filtrer le tableau"><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>
            {filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(19rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-800">Filtres</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> Réinitialiser</button></div><label className="block space-y-1.5"><span className="text-[10px] uppercase font-bold text-slate-400">Statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="all">Tous les statuts</option><option value="active">Actives</option><option value="inactive">Inactives</option></select></label><label className="block space-y-1.5"><span className="text-[10px] uppercase font-bold text-slate-400">Utilisation</span><select value={usageFilter} onChange={(event) => setUsageFilter(event.target.value)} className={fieldClass}><option value="all">Toutes</option><option value="used">Avec produits</option><option value="empty">Sans produit</option></select></label><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>Appliquer</button></div>}
          </div>
        </div>
        <div className="relative z-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs font-medium">Chargement des catégories...</p></div>
          ) : (
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Catégorie</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Produits</th><th className="px-5 py-4">Valeur du stock</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCategories.map((category) => (
                  <tr key={category._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="w-2.5 h-9 rounded-full" style={{ backgroundColor: category.couleur }} /><span className="font-bold text-slate-900">{category.nom}</span></div></td>
                    <td className="px-5 py-4 text-slate-500 max-w-xs">{category.description || "Aucune description"}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md font-bold"><FolderTree size={12} /> {category.productCount || 0}</span></td>
                    <td className="px-5 py-4 font-bold">{category.stockValues?.length ? category.stockValues.map((amount) => formatMoney(amount.value, amount.devise)).join(" · ") : formatMoney(0, currency)}</td>                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${category.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{category.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1"><button disabled={!canEdit} onClick={() => openEdit(category)} className={`p-2 transition-colors ${canEdit ? "text-slate-400 hover:text-amber-600" : "text-slate-200 cursor-not-allowed"}`} title={canEdit ? "Modifier" : "Permission MODIFIER_CATEGORIE requise"}><Edit2 size={15} /></button>{canDelete && <button onClick={() => { setSelected(category); setDeleteOpen(true); }} className="p-2 text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 size={15} /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && <div className="py-14 text-center"><FolderTree size={25} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">Aucune catégorie trouvée</p><p className="text-xs text-slate-400 mt-1">Créez votre première catégorie ou modifiez la recherche.</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} catégorie(s)</div>
        <InventoryPagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </div>

      <InventoryModal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={selected ? "Modifier la catégorie" : "Nouvelle catégorie"} subtitle="Le nom doit être unique dans la boutique active." notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0 mt-0.5" /><span>{formError}</span></div> : undefined} footer={<><button disabled={saving} onClick={() => setFormOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={saveCategory} className={primaryButton}>{saving && <Loader2 size={14} className="animate-spin" />}{selected ? "Enregistrer" : "Créer la catégorie"}</button></>}>
        <div className="space-y-4">
          <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Nom de la catégorie</span><input value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} maxLength={100} className={fieldClass} placeholder="Ex: Consommables" /></label>
          <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={4} className={`${fieldClass} h-auto py-3 resize-none`} placeholder="Décrivez les produits regroupés ici..." /></label>
          <div className="space-y-2"><span className="text-[10px] font-bold uppercase text-slate-400">Couleur d'identification</span><div className="flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} type="button" onClick={() => setForm({ ...form, couleur: color })} className={`w-8 h-8 rounded-lg border-2 transition-transform ${form.couleur === color ? "border-slate-800 scale-110" : "border-white shadow-sm"}`} style={{ backgroundColor: color }} title={`Couleur ${color}`} />)}</div></div>
        </div>
      </InventoryModal>

      <InventoryModal open={importOpen} onClose={() => !saving && setImportOpen(false)} title="Importer plusieurs catégories" subtitle="Import CSV compatible Excel, limité à 500 lignes." footer={<><button disabled={saving} onClick={() => setImportOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving || importRows.length === 0} onClick={importCategories} className={`${primaryButton} disabled:opacity-40 disabled:cursor-not-allowed`}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importer {importRows.length || ""}</button></>}>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100"><div><p className="text-xs font-bold text-indigo-800">Format attendu</p><p className="text-[10px] text-indigo-600 mt-1">Colonnes : nom, description, couleur (#RRGGBB)</p></div><button type="button" onClick={downloadTemplate} className={`${secondaryButton} border-indigo-200 text-indigo-700`}><Download size={14} /> Télécharger le modèle</button></div>
          <label className="min-h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"><FileSpreadsheet size={28} className="text-indigo-500" /><span className="text-xs font-bold text-slate-700">Choisir le fichier rempli dans Excel</span><span className="text-[10px] text-slate-400">Enregistrez-le au format CSV UTF-8</span><input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleImportFile(event.target.files?.[0])} /></label>
          {importFileName && <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"><span className="text-xs font-medium text-slate-600 truncate">{importFileName}</span><span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{importRows.length} ligne(s)</span></div>}
          {importError && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{importError}</div>}
          {importRows.length > 0 && <div className="border border-slate-200 rounded-xl overflow-hidden"><div className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">Aperçu des premières lignes</div><div className="divide-y divide-slate-100">{importRows.slice(0, 4).map((row) => <div key={row.line} className="px-3 py-2 flex items-center gap-3"><span className="w-2 h-7 rounded-full shrink-0" style={{ backgroundColor: row.couleur }} /><div className="min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{row.nom}</p><p className="text-[10px] text-slate-400 truncate">{row.description || "Sans description"}</p></div></div>)}</div></div>}
        </div>
      </InventoryModal>

      <InventoryModal open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)} title="Supprimer la catégorie" subtitle="Cette action est définitive." footer={<><button disabled={saving} onClick={() => setDeleteOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={deleteCategory} className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">{saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer</button></>}>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100"><AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" /><p className="text-xs leading-relaxed text-amber-800">Voulez-vous vraiment supprimer la catégorie <strong>{selected?.nom}</strong> ? Une catégorie contenant encore des produits ne peut pas être supprimée.</p></div>
      </InventoryModal>
    </div>
  );
}


