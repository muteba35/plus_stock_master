"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CheckCircle2, Eye, FileSpreadsheet, FileText, History, Loader2, Plus, RotateCcw, Search, SlidersHorizontal, XCircle } from "lucide-react";
import { InventoryModal, InventoryPagination, MetricCard, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";
import InventoryAuditTable, { type AuditEntry } from "./components/InventoryAuditTable";
import { exportTable, authorizedExportRows, type ExportFormat } from "../../components/export-table";
import { useDashboardAccess } from "../../components/DashboardAccess";

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


export default function MouvementsStockPage() {
  const { ui: du } = useDashboardLanguage();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [journal, setJournal] = useState<AuditEntry[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [operationScope, setOperationScope] = useState<"all" | "own">("all");
  const [summary, setSummary] = useState({ entries: 0, exits: 0, adjustments: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"movements" | "journal">("movements");
  const [movementPage, setMovementPage] = useState(1);
  const [journalPage, setJournalPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [metricDetail, setMetricDetail] = useState<{ title: string; value: string; detail: string } | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [form, setForm] = useState({ produitId: "", type: "ENTREE", quantite: "", motif: "", reference: "" });
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { permissions, isOwner } = useDashboardAccess();
  const [exporting, setExporting] = useState(false);
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
      setJournal(data.journal || []);
      setOperationScope(data.scope === "own" ? "own" : "all");
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
      const matchesFrom = !dateFrom || date >= new Date(`${dateFrom}T00:00:00`);
      const matchesTo = !dateTo || date <= new Date(`${dateTo}T23:59:59.999`);
      return matchesSearch && matchesType && matchesPeriod && matchesFrom && matchesTo;
    });
  }, [movements, search, typeFilter, periodFilter, dateFrom, dateTo]);
  const filteredJournal = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return journal.filter((entry) => {
      const date = new Date(entry.createdAt);
      const matchesSearch = entry.label.toLowerCase().includes(query) || entry.action.toLowerCase().includes(query) || entry.entityType.toLowerCase().includes(query) || `${entry.utilisateurId?.prenom || ""} ${entry.utilisateurId?.nom || ""}`.toLowerCase().includes(query);
      const matchesPeriod = periodFilter === "all" || (periodFilter === "today" && date.toDateString() === now.toDateString()) || (periodFilter === "month" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear());
      const matchesFrom = !dateFrom || date >= new Date(`${dateFrom}T00:00:00`);
      const matchesTo = !dateTo || date <= new Date(`${dateTo}T23:59:59.999`);
      return matchesSearch && matchesPeriod && matchesFrom && matchesTo;
    });
  }, [journal, search, periodFilter, dateFrom, dateTo]);
  const pageSize = 10;
  const currentMovementPage = Math.min(movementPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const currentJournalPage = Math.min(journalPage, Math.max(1, Math.ceil(filteredJournal.length / pageSize)));
  const paginatedMovements = filtered.slice((currentMovementPage - 1) * pageSize, currentMovementPage * pageSize);
  const paginatedJournal = filteredJournal.slice((currentJournalPage - 1) * pageSize, currentJournalPage * pageSize);
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      product.nom.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const selectedProduct = products.find((product) => product._id === form.produitId);
  const openCreate = () => {
    const firstAllowedType = canCreateEntry ? "ENTREE" : canCreateExit ? "SORTIE" : "AJUSTEMENT";
    setForm({ produitId: products[0]?._id || "", type: firstAllowedType, quantite: "", motif: "", reference: "" });
    setProductSearch("");
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

  const formatDate = (value: string) => new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const typeLabel = (type: Movement["type"]) => type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajustement";
  const compactNumber = (value: number) => Math.abs(value) < 1000000 ? value.toLocaleString(dashboardLocale()) : new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(value);
  

  

  
  const runExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await authorizedExportRows(API_URL + "/inventaire/mouvements", filtered);
      if (!rows.length) throw new Error(du("Aucune donnée à exporter."));
      await exportTable(format, "mouvements-stock", {
      name: "Mouvements stock",
      columns: ["Reference", "Produit", "SKU", "Type", "Variation", "Stock avant", "Stock apres", "Motif", "Date", "Auteur"],
      rows: rows.map((movement) => [movement.reference, movement.produitId?.nom || "Produit archive", movement.produitId?.sku || "", typeLabel(movement.type), movement.variation, movement.stockAvant, movement.stockApres, movement.motif, formatDate(movement.createdAt), movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : "Systeme"]),
    });
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : du("Export impossible."));
    } finally { setExporting(false); }
  };
  const exportCsv = () => void runExport("xlsx");
  const exportExcel = exportCsv;
  const exportWord = () => void runExport("docx");
  const exportCurrentPdf = () => void runExport("pdf");
  const exportPdf = exportCurrentPdf;
  const resetFilters = () => { setTypeFilter("all"); setPeriodFilter("all"); setDateFrom(""); setDateTo(""); };
  const activeFilterCount = Number(typeFilter !== "all") + Number(periodFilter !== "all") + Number(Boolean(dateFrom)) + Number(Boolean(dateTo));

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title={du("m59080aa60d70")} subtitle={du("m0f5a46682173")} action={<div className="flex flex-wrap justify-end gap-2"><button onClick={exportExcel} disabled={exporting || !canExport || filtered.length === 0} className={`${secondaryButton} disabled:opacity-40 disabled:cursor-not-allowed`} title={canExport ? du("mbeaa61a07557") : du("mbdd7e3d96cfd")}><FileSpreadsheet size={15} /> {du("m48d53635551c")}</button><button onClick={exportPdf} disabled={exporting || !canExport || filtered.length === 0} className={`${secondaryButton} disabled:opacity-40 disabled:cursor-not-allowed`} title={canExport ? du("m751090542c11") : du("mbdd7e3d96cfd")}><FileText size={15} /> {du("m1d393b0081b6")}</button>{canCreateMovement && <button onClick={openCreate} className={primaryButton}><Plus size={15} /> {du("mf79a3da26c47")}</button>}</div>} />
      {operationScope === "own" && <div className="flex items-center gap-2 p-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-semibold"><History size={15} />{du("mcc8318640771")}</div>}
      {message && <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{du(message.text)}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label={du("m95947f1aef95")} value={compactNumber(summary.entries)} detail={du("m1eee3b6be037")} icon={ArrowDownLeft} tone="emerald" onInspect={() => setMetricDetail({ title: "Entrées ce mois", value: summary.entries.toLocaleString(dashboardLocale()), detail: "Unités réceptionnées" })} /><MetricCard label={du("m7ab02568cc13")} value={compactNumber(summary.exits)} detail={du("m2e8170da3a98")} icon={ArrowUpRight} tone="rose" onInspect={() => setMetricDetail({ title: "Sorties ce mois", value: summary.exits.toLocaleString(dashboardLocale()), detail: "Sorties manuelles enregistrées" })} /><MetricCard label={du("m403f059e65c1")} value={compactNumber(summary.adjustments)} detail={du("mc5e7ec5c723b")} icon={ArrowLeftRight} tone="amber" onInspect={() => setMetricDetail({ title: "Ajustements", value: summary.adjustments.toLocaleString(dashboardLocale()), detail: "Comptages corrigés ce mois" })} /></div>

      <div className="inline-flex self-start p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1"><button onClick={() => setActiveView("movements")} className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-2 ${activeView === "movements" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}><ArrowLeftRight size={14} /> {du("m59080aa60d70")}</button><button onClick={() => setActiveView("journal")} className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-2 ${activeView === "journal" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}><History size={14} /> {du("m30ae28d230f7")}</button></div>

      <InventoryAuditTable visible={activeView === "journal"} loading={loading} entries={paginatedJournal} totalItems={filteredJournal.length} search={search} page={currentJournalPage} pageSize={pageSize} onSearch={setSearch} onPageChange={setJournalPage} formatDate={formatDate} />

      <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible ${activeView === "movements" ? "block" : "hidden"}`}>
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl"><SearchInput value={search} onChange={setSearch} placeholder={du("mcd188312e089")} /><div className="relative" ref={filterRef}><button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`} title={du("mec16710e0e6c")}><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>{filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(20rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex justify-between"><p className="text-xs font-bold">{du("m6e2287796c72")}</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> {du("m5b35e0e35591")}</button></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("mbaaddf70fb5d")}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={fieldClass}><option value="all">{du("m2ff599814388")}</option><option value="ENTREE">{du("m40b0faf0ec33")}</option><option value="SORTIE">{du("mc28aa6066d69")}</option><option value="AJUSTEMENT">{du("m403f059e65c1")}</option></select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m97f3c4722ee5")}</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className={fieldClass}><option value="all">{du("m26f5597b9646")}</option><option value="today">{du("m99099b6e904f")}</option><option value="month">{du("m8d7225a5b415")}</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m0b6722a8adfb")}</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPeriodFilter("all"); }} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m3325c2b56f2b")}</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPeriodFilter("all"); }} className={fieldClass} /></label></div><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>{du("mb4c8b1dd7acd")}</button></div>}</div></div>
        <div className="relative z-0 overflow-x-auto">{loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">{du("mc0ac988c67de")}</p></div> : <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("m393ca26ab12c")}</th><th className="px-5 py-4">{du("ma0d3db2f0803")}</th><th className="px-5 py-4">{du("md7c9f92ed999")}</th><th className="px-5 py-4">{du("m8dc605f468e5")}</th><th className="px-5 py-4">{du("md5cade7ef319")}</th><th className="px-5 py-4">{du("m99c40ab40592")}</th><th className="px-5 py-4">{du("m73370806b518")}</th><th className="px-5 py-4 text-right">{du("m3175df75860e")}</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedMovements.map((movement) => <tr key={movement._id} className="hover:bg-slate-50/60"><td className="px-5 py-4 font-mono text-[11px] text-slate-500">{movement.reference}</td><td className="px-5 py-4"><p className="font-bold text-slate-900">{movement.produitId?.nom || du("m4bdb5f1b9014")}</p><p className="text-[10px] text-slate-400">{movement.produitId?.sku}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "ENTREE" ? "text-emerald-600" : movement.type === "SORTIE" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "ENTREE" ? <ArrowDownLeft size={14} /> : movement.type === "SORTIE" ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}{du(typeLabel(movement.type))}</span></td><td className={`px-5 py-4 font-black ${movement.variation > 0 ? "text-emerald-600" : movement.variation < 0 ? "text-rose-600" : "text-slate-500"}`}>{movement.variation > 0 ? "+" : ""}{movement.variation}</td><td className="px-5 py-4"><span className="text-slate-400">{movement.stockAvant}</span><span className="mx-1.5 text-slate-300">→</span><strong>{movement.stockApres}</strong></td><td className="px-5 py-4 text-slate-500">{formatDate(movement.createdAt)}</td><td className="px-5 py-4 text-slate-600">{movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : du("m1abaf88d08a5")}</td><td className="px-5 py-4 text-right"><button onClick={() => { setSelectedMovement(movement); setDetailOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600" title={du("m2cf9926224a3")}><Eye size={15} /></button></td></tr>)}</tbody></table>}</div>
        {!loading && filtered.length === 0 && <div className="py-14 text-center"><ArrowLeftRight size={26} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">{du("m13a4bc084813")}</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} {du("mb45eb754e49a")}</div>
        <InventoryPagination page={currentMovementPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setMovementPage} />
      </div>

      <InventoryModal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={du("mf79a3da26c47")} subtitle={du("m241547785f9d")} notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{du(formError)}</div> : undefined} footer={<><button disabled={saving} onClick={() => setFormOpen(false)} className={secondaryButton}>{du("m46ad3916f6a0")}</button><button disabled={saving} onClick={createMovement} className={primaryButton}>{saving && <Loader2 size={14} className="animate-spin" />} {du("m71dc74873e23")}</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">{du("ma0d3db2f0803")}</span><div className="relative"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className={`${fieldClass} pl-10`} placeholder={du("m15296ed43f6f")} /></div><select value={form.produitId} onChange={(event) => setForm({ ...form, produitId: event.target.value })} className={fieldClass}><option value="">{du("me0036130c3c4")}</option>{filteredProducts.map((product) => <option key={product._id} value={product._id}>{product.nom} · {product.sku} {du("m15e2e23d8393")}{" "}{product.stock} {du(product.unite)}</option>)}</select>{filteredProducts.length === 0 && <p className="text-[10px] font-semibold text-rose-500">{du("m90a91c826607")}</p>}{selectedProduct && <p className="text-[10px] text-slate-400">{du("m58e09e869ae2")}{" "}<strong className="text-slate-700">{selectedProduct.stock} {du(selectedProduct.unite)}</strong></p>}</label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m064878ffbc9d")}</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={fieldClass}>{canCreateEntry && <option value="ENTREE">{du("md9c7efe13095")}</option>}{canCreateExit && <option value="SORTIE">{du("m53a09db23f5c")}</option>}{canCreateAdjustment && <option value="AJUSTEMENT">{du("m3961beaaab08")}</option>}</select></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{form.type === "AJUSTEMENT" ? du("m702719544939") : form.type === "SORTIE" ? du("m2ae19475cb0c") : du("m7eca1d5dc9f1")}</span><input type="number" min={form.type === "AJUSTEMENT" ? 0 : 0.01} step="0.01" value={form.quantite} onChange={(event) => setForm({ ...form, quantite: event.target.value })} className={fieldClass} /></label><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">{du("mc89ac8f0d41a")}</span><input value={form.motif} onChange={(event) => setForm({ ...form, motif: event.target.value })} className={fieldClass} placeholder={form.type === "ENTREE" ? du("mcd899395dc9d") : form.type === "SORTIE" ? du("ma0627265bcae") : du("m57553670fe64")} /></label><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m7d0adbac9853")}</span><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={fieldClass} placeholder={du("m1d49690bc86d")} /></label></div>
      </InventoryModal>

      <InventoryModal open={Boolean(metricDetail)} onClose={() => setMetricDetail(null)} title={metricDetail?.title || du("m3175df75860e")} subtitle={du(metricDetail?.detail) || du("mf8d9845cc98c")} footer={<button onClick={() => setMetricDetail(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("mf8d9845cc98c")}</p><p className="text-2xl font-black text-slate-900 mt-2 break-words">{metricDetail?.value}</p><p className="text-xs text-slate-500 mt-2">{du(metricDetail?.detail)}</p></div></InventoryModal>

      <InventoryModal open={detailOpen} onClose={() => setDetailOpen(false)} title={du("mb9e9b3caaeed")} subtitle={selectedMovement?.reference || ""} footer={<button onClick={() => setDetailOpen(false)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="grid grid-cols-2 gap-4 text-xs">{selectedMovement && <><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("ma0d3db2f0803")}</p><p className="font-bold mt-1">{selectedMovement.produitId?.nom || du("m4bdb5f1b9014")}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("md7c9f92ed999")}</p><p className="font-bold mt-1">{du(typeLabel(selectedMovement.type))}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("mf469f9cb25f8")}</p><p className="font-black text-lg mt-1">{selectedMovement.stockAvant}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("m1c3eb807871d")}</p><p className="font-black text-lg mt-1">{selectedMovement.stockApres}</p></div><div className="col-span-2"><p className="text-[10px] uppercase font-bold text-slate-400">{du("mc89ac8f0d41a")}</p><p className="font-medium mt-1 p-3 bg-slate-50 rounded-xl">{selectedMovement.motif}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("m99c40ab40592")}</p><p className="font-medium mt-1">{formatDate(selectedMovement.createdAt)}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("m5880e59e0c06")}</p><p className="font-medium mt-1">{selectedMovement.utilisateurId ? `${selectedMovement.utilisateurId.prenom} ${selectedMovement.utilisateurId.nom}` : du("m1abaf88d08a5")}</p></div></>}</div></InventoryModal>
    </div>
  );
}


