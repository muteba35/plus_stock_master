"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CheckCircle2, Eye, FileSpreadsheet, FileText, Loader2, Plus, RotateCcw, SlidersHorizontal, XCircle } from "lucide-react";
import { InventoryModal, MetricCard, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";

type ProductOption = { _id: string; nom: string; sku: string; stock: number; unite: string };
type Movement = {
  _id: string;
  reference: string;
  produitId: { _id: string; nom: string; sku: string; unite: string } | null;
  utilisateurId: { nom: string; prenom: string } | null;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT";
  quantite: number;
  variation: number;
  stockAvant: number;
  stockApres: number;
  motif: string;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
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
  } catch { return { permissions: [] as string[], isOwner: false }; }
};

export default function MouvementsStockPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [summary, setSummary] = useState({ entries: 0, exits: 0, adjustments: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [form, setForm] = useState({ produitId: "", type: "ENTREE", quantite: "", motif: "", reference: "" });
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const canCreateEntry = isOwner || permissions.includes("CREER_ENTREE_STOCK");
  const canCreateExit = isOwner || permissions.includes("CREER_SORTIE_STOCK");
  const canCreateAdjustment = isOwner || permissions.includes("CREER_AJUSTEMENT_STOCK");
  const canCreateMovement = canCreateEntry || canCreateExit || canCreateAdjustment;
  const canExport = isOwner || permissions.includes("EXPORTER_MOUVEMENTS_STOCK");

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventaire/mouvements`, { headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les mouvements.");
      setMovements(data.data || []);
      setProducts(data.products || []);
      setSummary(data.summary || { entries: 0, exits: 0, adjustments: 0 });
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { void fetchMovements(); }, [fetchMovements]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return movements.filter((movement) => {
      const date = new Date(movement.createdAt);
      const matchesSearch = (movement.produitId?.nom || "").toLowerCase().includes(query) || (movement.produitId?.sku || "").toLowerCase().includes(query) || movement.reference.toLowerCase().includes(query) || movement.motif.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || movement.type === typeFilter;
      const matchesPeriod = periodFilter === "all" || (periodFilter === "today" && date.toDateString() === now.toDateString()) || (periodFilter === "month" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear());
      return matchesSearch && matchesType && matchesPeriod;
    });
  }, [movements, search, typeFilter, periodFilter]);

  const selectedProduct = products.find((product) => product._id === form.produitId);
  const openCreate = () => {
    const firstAllowedType = canCreateEntry ? "ENTREE" : canCreateExit ? "SORTIE" : "AJUSTEMENT";
    setForm({ produitId: products[0]?._id || "", type: firstAllowedType, quantite: "", motif: "", reference: "" });
    setFormError("");
    setFormOpen(true);
  };

  const createMovement = async () => {
    if (!form.produitId || !form.quantite || !form.motif.trim()) {
      setFormError("Le produit, la quantité et le motif sont obligatoires.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const response = await fetch(`${API_URL}/inventaire/mouvements`, { method: "POST", headers: requestHeaders(), body: JSON.stringify({ ...form, quantite: Number(form.quantite) }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Enregistrement impossible.");
      setFormOpen(false);
      showMessage("success", data.message || "Mouvement enregistré.");
      await fetchMovements();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally { setSaving(false); }
  };

  const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const typeLabel = (type: Movement["type"]) => type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajustement";
  const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const escapeHtml = (value: string | number) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] || character));

  const exportExcel = () => {
    const headers = ["Reference", "Produit", "SKU", "Type", "Variation", "Stock avant", "Stock apres", "Motif", "Date", "Auteur"];
    const rows = filtered.map((movement) => [movement.reference, movement.produitId?.nom || "Produit archive", movement.produitId?.sku || "", typeLabel(movement.type), movement.variation, movement.stockAvant, movement.stockApres, movement.motif, formatDate(movement.createdAt), movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : "Systeme"]);
    const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) {
      showMessage("error", "Le navigateur a bloqué la fenêtre d’impression PDF.");
      return;
    }
    const rows = filtered.map((movement) => `<tr><td>${escapeHtml(movement.reference)}</td><td><strong>${escapeHtml(movement.produitId?.nom || "Produit archivé")}</strong><br><small>${escapeHtml(movement.produitId?.sku || "")}</small></td><td>${escapeHtml(typeLabel(movement.type))}</td><td>${movement.variation > 0 ? "+" : ""}${escapeHtml(movement.variation)}</td><td>${escapeHtml(movement.stockAvant)} → ${escapeHtml(movement.stockApres)}</td><td>${escapeHtml(movement.motif)}</td><td>${escapeHtml(formatDate(movement.createdAt))}</td><td>${escapeHtml(movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : "Système")}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Historique des mouvements</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}small{color:#94a3b8}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>Historique des mouvements de stock</h1><p>Export du ${escapeHtml(new Date().toLocaleString("fr-FR"))} · ${filtered.length} mouvement(s)</p><table><thead><tr><th>Référence</th><th>Produit</th><th>Type</th><th>Variation</th><th>Stock</th><th>Motif</th><th>Date</th><th>Auteur</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">StockMaster Pro · Document généré automatiquement</div><script>window.onload=()=>{window.print();}</script></body></html>`);
    popup.document.close();
  };
  const resetFilters = () => { setTypeFilter("all"); setPeriodFilter("all"); };
  const activeFilterCount = Number(typeFilter !== "all") + Number(periodFilter !== "all");

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Mouvements de stock" subtitle="Historique sécurisé des entrées, sorties et ajustements." action={<div className="flex flex-wrap justify-end gap-2"><button onClick={exportExcel} disabled={!canExport || filtered.length === 0} className={`${secondaryButton} disabled:opacity-40 disabled:cursor-not-allowed`} title={canExport ? "Exporter les résultats filtrés vers Excel" : "Permission EXPORTER_MOUVEMENTS_STOCK requise"}><FileSpreadsheet size={15} /> Excel</button><button onClick={exportPdf} disabled={!canExport || filtered.length === 0} className={`${secondaryButton} disabled:opacity-40 disabled:cursor-not-allowed`} title={canExport ? "Exporter les résultats filtrés en PDF" : "Permission EXPORTER_MOUVEMENTS_STOCK requise"}><FileText size={15} /> PDF</button>{canCreateMovement && <button onClick={openCreate} className={primaryButton}><Plus size={15} /> Nouveau mouvement</button>}</div>} />
      {message && <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{message.text}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label="Entrées ce mois" value={String(summary.entries)} detail="Unités réceptionnées" icon={ArrowDownLeft} tone="emerald" /><MetricCard label="Sorties ce mois" value={String(summary.exits)} detail="Sorties manuelles enregistrées" icon={ArrowUpRight} tone="rose" /><MetricCard label="Ajustements" value={String(summary.adjustments)} detail="Comptages corrigés ce mois" icon={ArrowLeftRight} tone="amber" /></div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit, SKU, motif ou référence..." /><div className="relative" ref={filterRef}><button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`} title="Filtrer"><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>{filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(19rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex justify-between"><p className="text-xs font-bold">Filtres</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> Réinitialiser</button></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={fieldClass}><option value="all">Tous</option><option value="ENTREE">Entrées</option><option value="SORTIE">Sorties</option><option value="AJUSTEMENT">Ajustements</option></select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Période</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className={fieldClass}><option value="all">Toutes les dates</option><option value="today">Aujourd’hui</option><option value="month">Ce mois</option></select></label><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>Appliquer</button></div>}</div></div>
        <div className="relative z-0 overflow-x-auto">{loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">Chargement des mouvements...</p></div> : <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Référence</th><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Opération</th><th className="px-5 py-4">Variation</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Effectué par</th><th className="px-5 py-4 text-right">Détail</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((movement) => <tr key={movement._id} className="hover:bg-slate-50/60"><td className="px-5 py-4 font-mono text-[11px] text-slate-500">{movement.reference}</td><td className="px-5 py-4"><p className="font-bold text-slate-900">{movement.produitId?.nom || "Produit archivé"}</p><p className="text-[10px] text-slate-400">{movement.produitId?.sku}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "ENTREE" ? "text-emerald-600" : movement.type === "SORTIE" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "ENTREE" ? <ArrowDownLeft size={14} /> : movement.type === "SORTIE" ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}{typeLabel(movement.type)}</span></td><td className={`px-5 py-4 font-black ${movement.variation > 0 ? "text-emerald-600" : movement.variation < 0 ? "text-rose-600" : "text-slate-500"}`}>{movement.variation > 0 ? "+" : ""}{movement.variation}</td><td className="px-5 py-4"><span className="text-slate-400">{movement.stockAvant}</span><span className="mx-1.5 text-slate-300">→</span><strong>{movement.stockApres}</strong></td><td className="px-5 py-4 text-slate-500">{formatDate(movement.createdAt)}</td><td className="px-5 py-4 text-slate-600">{movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : "Système"}</td><td className="px-5 py-4 text-right"><button onClick={() => { setSelectedMovement(movement); setDetailOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600" title="Consulter"><Eye size={15} /></button></td></tr>)}</tbody></table>}</div>
        {!loading && filtered.length === 0 && <div className="py-14 text-center"><ArrowLeftRight size={26} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">Aucun mouvement trouvé</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} mouvement(s)</div>
      </div>

      <InventoryModal open={formOpen} onClose={() => !saving && setFormOpen(false)} title="Nouveau mouvement" subtitle="Cette opération modifiera immédiatement le stock du produit." notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{formError}</div> : undefined} footer={<><button disabled={saving} onClick={() => setFormOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={createMovement} className={primaryButton}>{saving && <Loader2 size={14} className="animate-spin" />} Enregistrer</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Produit</span><select value={form.produitId} onChange={(event) => setForm({ ...form, produitId: event.target.value })} className={fieldClass}><option value="">Sélectionner...</option>{products.map((product) => <option key={product._id} value={product._id}>{product.nom} · stock {product.stock} {product.unite}</option>)}</select>{selectedProduct && <p className="text-[10px] text-slate-400">Stock disponible : <strong className="text-slate-700">{selectedProduct.stock} {selectedProduct.unite}</strong></p>}</label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Type de mouvement</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={fieldClass}>{canCreateEntry && <option value="ENTREE">Entrée</option>}{canCreateExit && <option value="SORTIE">Sortie manuelle</option>}{canCreateAdjustment && <option value="AJUSTEMENT">Ajustement d’inventaire</option>}</select></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{form.type === "AJUSTEMENT" ? "Stock réellement compté" : form.type === "SORTIE" ? "Quantité à retirer" : "Quantité à ajouter"}</span><input type="number" min={form.type === "AJUSTEMENT" ? 0 : 0.01} step="0.01" value={form.quantite} onChange={(event) => setForm({ ...form, quantite: event.target.value })} className={fieldClass} /></label><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Motif</span><input value={form.motif} onChange={(event) => setForm({ ...form, motif: event.target.value })} className={fieldClass} placeholder={form.type === "ENTREE" ? "Ex: Livraison fournisseur" : form.type === "SORTIE" ? "Ex: Produit endommagé" : "Ex: Correction après inventaire"} /></label><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Référence externe (facultatif)</span><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={fieldClass} placeholder="Ex: BL-2026-0042" /></label></div>
      </InventoryModal>

      <InventoryModal open={detailOpen} onClose={() => setDetailOpen(false)} title="Détail du mouvement" subtitle={selectedMovement?.reference || ""} footer={<button onClick={() => setDetailOpen(false)} className={secondaryButton}>Fermer</button>}><div className="grid grid-cols-2 gap-4 text-xs">{selectedMovement && <><div><p className="text-[10px] uppercase font-bold text-slate-400">Produit</p><p className="font-bold mt-1">{selectedMovement.produitId?.nom || "Produit archivé"}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Opération</p><p className="font-bold mt-1">{typeLabel(selectedMovement.type)}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Stock avant</p><p className="font-black text-lg mt-1">{selectedMovement.stockAvant}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Stock après</p><p className="font-black text-lg mt-1">{selectedMovement.stockApres}</p></div><div className="col-span-2"><p className="text-[10px] uppercase font-bold text-slate-400">Motif</p><p className="font-medium mt-1 p-3 bg-slate-50 rounded-xl">{selectedMovement.motif}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Date</p><p className="font-medium mt-1">{formatDate(selectedMovement.createdAt)}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Auteur</p><p className="font-medium mt-1">{selectedMovement.utilisateurId ? `${selectedMovement.utilisateurId.prenom} ${selectedMovement.utilisateurId.nom}` : "Système"}</p></div></>}</div></InventoryModal>
    </div>
  );
}
