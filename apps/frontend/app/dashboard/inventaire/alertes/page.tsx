"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertOctagon, AlertTriangle, BellRing, CheckCircle2, Loader2, PackagePlus, RotateCcw, SlidersHorizontal, XCircle } from "lucide-react";
import { InventoryModal, MetricCard, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";

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
const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch { return { permissions: [] as string[], isOwner: false }; }
};

export default function AlertesStockPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [summary, setSummary] = useState({ total: 0, ruptures: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [selected, setSelected] = useState<StockAlert | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);
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

  const resetFilters = () => { setSeverityFilter("all"); setCategoryFilter("all"); };
  const activeFilterCount = Number(severityFilter !== "all") + Number(categoryFilter !== "all");

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Alertes de stock" subtitle="Produits arrivés à leur seuil minimum dans la boutique active." />
      {message && <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>{message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{message.text}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label="Alertes actives" value={String(summary.total)} detail="Produits à surveiller" icon={BellRing} tone="amber" /><MetricCard label="Ruptures" value={String(summary.ruptures)} detail="Action immédiate requise" icon={AlertOctagon} tone="rose" /><MetricCard label="Stock faible" value={String(summary.lowStock)} detail="Sous le seuil minimum" icon={AlertTriangle} tone="amber" /></div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div className="relative z-30 p-4 border-b border-slate-100 flex gap-2 bg-white rounded-t-2xl"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher par produit ou SKU..." /><div className="relative" ref={filterRef}><button onClick={() => setFilterOpen((current) => !current)} className={`h-10 w-10 rounded-xl border flex items-center justify-center relative ${filterOpen || activeFilterCount ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500"}`} title="Filtrer"><SlidersHorizontal size={16} />{activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</button>{filterOpen && <div className="absolute right-0 top-12 z-[70] w-[min(19rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-[0_18px_45px_-12px_rgba(15,23,42,0.25)] p-4 space-y-4"><div className="flex justify-between"><p className="text-xs font-bold">Filtres</p><button onClick={resetFilters} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><RotateCcw size={11} /> Réinitialiser</button></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Niveau</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className={fieldClass}><option value="all">Toutes les alertes</option><option value="RUPTURE">Ruptures</option><option value="FAIBLE">Stock faible</option></select></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Catégorie</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={fieldClass}><option value="all">Toutes les catégories</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.nom}</option>)}</select></label><button onClick={() => setFilterOpen(false)} className={`${primaryButton} w-full`}>Appliquer</button></div>}</div></div>
        <div className="relative z-0 overflow-x-auto">{loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">Analyse du stock...</p></div> : <table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Catégorie</th><th className="px-5 py-4">Stock actuel</th><th className="px-5 py-4">Seuil</th><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Recommandation</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((alert) => <tr key={alert._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{alert.nom}</p><p className="text-[10px] text-slate-400">{alert.sku}</p></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: alert.categorieId?.couleur || "#94a3b8" }} />{alert.categorieId?.nom || "Non classé"}</span></td><td className="px-5 py-4"><span className={`text-lg font-black ${alert.severity === "RUPTURE" ? "text-rose-600" : "text-amber-600"}`}>{alert.stock}</span> <span className="text-slate-400">{alert.unite}</span></td><td className="px-5 py-4 font-bold text-slate-600">{alert.seuilAlerte}</td><td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${alert.severity === "RUPTURE" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{alert.severity === "RUPTURE" ? "Rupture" : "Stock faible"}</span></td><td className="px-5 py-4 text-slate-500">Ajouter au moins <strong className="text-slate-700">{alert.suggestedQuantity} {alert.unite}</strong></td><td className="px-5 py-4 text-right"><button disabled={!canRestock} onClick={() => openRestock(alert)} className={`${primaryButton} disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`} title={canRestock ? "Réapprovisionner" : "Permission REAPPROVISIONNER_STOCK requise"}><PackagePlus size={14} /> Réapprovisionner</button></td></tr>)}</tbody></table>}</div>
        {!loading && filtered.length === 0 && <div className="py-14 flex flex-col items-center text-center"><CheckCircle2 size={28} className="text-emerald-500" /><p className="text-sm font-bold text-slate-800 mt-3">Aucune alerte correspondante</p><p className="text-xs text-slate-400 mt-1">Le stock est sous contrôle pour cette recherche.</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} alerte(s)</div>
      </div>

      <InventoryModal open={restockOpen} onClose={() => !saving && setRestockOpen(false)} title="Réapprovisionner le produit" subtitle={selected ? `${selected.nom} · stock actuel ${selected.stock} ${selected.unite}` : ""} notice={formError ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{formError}</div> : undefined} footer={<><button disabled={saving} onClick={() => setRestockOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={restock} className={primaryButton}>{saving ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />} Confirmer l’entrée</button></>}><div className="space-y-4"><div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"><div><p className="text-[10px] uppercase font-bold text-slate-400">Seuil minimum</p><p className="text-lg font-black mt-1">{selected?.seuilAlerte || 0}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Stock après entrée</p><p className="text-lg font-black text-emerald-600 mt-1">{(selected?.stock || 0) + (Number(quantity) || 0)}</p></div></div><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Quantité à ajouter</span><input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} /></label><label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Bon de livraison / référence (facultatif)</span><input value={reference} onChange={(event) => setReference(event.target.value)} className={fieldClass} placeholder="Ex: BL-2026-0042" /></label></div></InventoryModal>
    </div>
  );
}
