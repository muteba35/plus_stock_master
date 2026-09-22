"use client";
import { useDashboardAccess } from "../../components/DashboardAccess";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertOctagon, AlertTriangle, BellRing, CheckCircle2, Loader2, PackagePlus, RotateCcw, SlidersHorizontal, XCircle } from "lucide-react";
import { InventoryModal, InventoryPagination, MetricCard, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";

type StockAlert = {
  _id: string;
  nom: string;
  sku: string;
  stock: number;
  seuilAlerte: number;
  unite: string;
  categorieId: { _id: string; nom: string; couleur: string } | null;
  severity: "RUPTURE" | "FAIBLE";
  suggestedQuantity: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const requestHeaders = () => {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
};

export default function AlertesStockPage() {
  const { ui: du } = useDashboardLanguage();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [summary, setSummary] = useState({ total: 0, ruptures: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [metricDetail, setMetricDetail] = useState<{ title: string; value: string; detail: string } | null>(null);
  const [selected, setSelected] = useState<StockAlert | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { permissions, isOwner } = useDashboardAccess();
  const filterRef = useRef<HTMLDivElement | null>(null);
  const canRestock = isOwner || permissions.includes("REAPPROVISIONNER_STOCK");

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventaire/alertes`, { headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les alertes.");
      setAlerts(data.data || []);
      setSummary(data.summary || { total: 0, ruptures: 0, lowStock: 0 });
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { void fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const categories = useMemo(() => Array.from(new Map(alerts.filter((alert) => alert.categorieId).map((alert) => [alert.categorieId!._id, alert.categorieId!])).values()), [alerts]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSearch = alert.nom.toLowerCase().includes(query) || alert.sku.toLowerCase().includes(query);
      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
      const matchesCategory = categoryFilter === "all" || alert.categorieId?._id === categoryFilter;
      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [alerts, search, severityFilter, categoryFilter]);
  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paginatedAlerts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openRestock = (alert: StockAlert) => {
    setSelected(alert);
    setQuantity(String(alert.suggestedQuantity));
    setReference("");
    setFormError("");
    setRestockOpen(true);
  };

  const restock = async () => {
    if (!selected || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setFormError("Indiquez une quantité de réapprovisionnement supérieure à zéro.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const response = await fetch(`${API_URL}/inventaire/alertes/${selected._id}/reapprovisionner`, {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ quantite: Number(quantity), reference }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Réapprovisionnement impossible.");
      setRestockOpen(false);
      showMessage("success", `${selected.nom} a été réapprovisionné avec succès.`);
      await fetchAlerts();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally { setSaving(false); }
  };

  const compactNumber = (value: number) => Math.abs(value) < 1000000 ? value.toLocaleString(dashboardLocale()) : new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(value);
  const resetFilters = () => { setSeverityFilter("all"); setCategoryFilter("all"); };
  const activeFilterCount = Number(severityFilter !== "all") + Number(categoryFilter !== "all");

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title={du("m4a4e2c871381")} subtitle={du("m889498852b75")} />
      {message && <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{du(message.text)}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label={du("ma04ac09064bd")} value={compactNumber(summary.total)} detail={du("mb01856cae54f")} icon={BellRing} tone="amber" onInspect={() => setMetricDetail({ title: "Alertes actives", value: summary.total.toLocaleString(dashboardLocale()), detail: "Produits à surveiller" })} /><MetricCard label={du("mbecd31a4c41b")} value={compactNumber(summary.ruptures)} detail={du("m16a52e348638")} icon={AlertOctagon} tone="rose" onInspect={() => setMetricDetail({ title: "Ruptures", value: summary.ruptures.toLocaleString(dashboardLocale()), detail: "Produits en rupture" })} /><MetricCard label={du("m3b15f1aae6ac")} value={compactNumber(summary.lowStock)} detail={du("m0b74b31cc14e")} icon={AlertTriangle} tone="amber" onInspect={() => setMetricDetail({ title: "Stock faible", value: summary.lowStock.toLocaleString(dashboardLocale()), detail: "Produits sous le seuil minimum" })} /></div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl"><SearchInput value={search} onChange={setSearch} placeholder={du("m08f89ac8abba")} /><div className="relative" ref={filterRef}><button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`} title={du("mec16710e0e6c")}><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>{filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(19rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex justify-between"><p className="text-xs font-bold">{du("m6e2287796c72")}</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> {du("m5b35e0e35591")}</button></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m2b5104f5fc26")}</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className={fieldClass}><option value="all">{du("m3cbaeda3d2dd")}</option><option value="RUPTURE">{du("mbecd31a4c41b")}</option><option value="FAIBLE">{du("m3b15f1aae6ac")}</option></select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m68a5341fc6bd")}</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={fieldClass}><option value="all">{du("m29e06e012d24")}</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.nom}</option>)}</select></label><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>{du("mb4c8b1dd7acd")}</button></div>}</div></div>
        <div className="relative z-0 overflow-x-auto">{loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">{du("m7f8cd645c156")}</p></div> : <table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("ma0d3db2f0803")}</th><th className="px-5 py-4">{du("m68a5341fc6bd")}</th><th className="px-5 py-4">{du("m87c718cc4525")}</th><th className="px-5 py-4">{du("meb212e3d44c1")}</th><th className="px-5 py-4">{du("m2b5104f5fc26")}</th><th className="px-5 py-4">{du("md4aa392260c0")}</th><th className="px-5 py-4 text-right">{du("m64cff1319d2f")}</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedAlerts.map((alert) => <tr key={alert._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{alert.nom}</p><p className="text-[10px] text-slate-400">{alert.sku}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: alert.categorieId?.couleur || "#94a3b8" }} />{alert.categorieId?.nom || du("m846588b32a24")}</span></td><td className="px-5 py-4"><span className={`text-lg font-black ${alert.severity === "RUPTURE" ? "text-rose-600" : "text-amber-600"}`}>{alert.stock}</span> <span className="text-slate-400">{du(alert.unite)}</span></td><td className="px-5 py-4 font-bold text-slate-600">{alert.seuilAlerte}</td><td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${alert.severity === "RUPTURE" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{alert.severity === "RUPTURE" ? du("m45ab2e3f28dc") : du("m3b15f1aae6ac")}</span></td><td className="px-5 py-4 text-slate-500">{du("mb8fedd6e39a5")}{" "}<strong className="text-slate-700">{alert.suggestedQuantity} {du(alert.unite)}</strong></td><td className="px-5 py-4 text-right"><button disabled={!canRestock} onClick={() => openRestock(alert)} className={`${primaryButton} disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`} title={canRestock ? du("m5e30ce077537") : du("m05f2b2a1afb9")}><PackagePlus size={14} /> {du("m5e30ce077537")}</button></td></tr>)}</tbody></table>}</div>
        {!loading && filtered.length === 0 && <div className="py-14 flex flex-col items-center text-center"><CheckCircle2 size={28} className="text-emerald-500" /><p className="text-sm font-bold text-slate-800 mt-3">{du("m3335c6dc8074")}</p><p className="text-xs text-slate-400 mt-1">{du("ma38ac886ea7d")}</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} {du("m4534d1619930")}</div>
        <InventoryPagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </div>

      <InventoryModal open={Boolean(metricDetail)} onClose={() => setMetricDetail(null)} title={metricDetail?.title || du("m3175df75860e")} subtitle={du(metricDetail?.detail) || du("mf8d9845cc98c")} footer={<button onClick={() => setMetricDetail(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("mf8d9845cc98c")}</p><p className="text-2xl font-black text-slate-900 mt-2 break-words">{metricDetail?.value}</p><p className="text-xs text-slate-500 mt-2">{du(metricDetail?.detail)}</p></div></InventoryModal>

      <InventoryModal open={restockOpen} onClose={() => !saving && setRestockOpen(false)} title={du("mf8a218590ab2")} subtitle={selected ? du("m294bef54f2e5", {p0: selected.nom, p1: selected.stock, p2: selected.unite}) : ""} notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{du(formError)}</div> : undefined} footer={<><button disabled={saving} onClick={() => setRestockOpen(false)} className={secondaryButton}>{du("m46ad3916f6a0")}</button><button disabled={saving} onClick={restock} className={primaryButton}>{saving ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />} {du("m55faf9d678aa")}</button></>}><div className="space-y-4"><div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("mbcef07b3e012")}</p><p className="text-lg font-black mt-1">{selected?.seuilAlerte || 0}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">{du("m4e9836bd9341")}</p><p className="text-lg font-black text-emerald-600 mt-1">{(selected?.stock || 0) + (Number(quantity) || 0)}</p></div></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m7eca1d5dc9f1")}</span><input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">{du("m8d65b7dccb3a")}</span><input value={reference} onChange={(event) => setReference(event.target.value)} className={fieldClass} placeholder={du("m1d49690bc86d")} /></label></div></InventoryModal>
    </div>
  );
}
