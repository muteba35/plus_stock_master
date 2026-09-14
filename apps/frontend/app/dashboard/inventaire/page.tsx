"use client";
import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Loader2, PackageCheck, PackagePlus, Tags, XCircle } from "lucide-react";
import { InventoryModal, MetricCard, PageHeader, primaryButton, secondaryButton } from "./components/inventory-ui";
import { formatMoney, getActiveBoutiqueCurrency } from "./components/currency";

type Movement = {
  _id: string;
  reference: string;
  produitId: { nom: string; sku: string; unite: string } | null;
  utilisateurId: { nom: string; prenom: string } | null;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT";
  variation: number;
  createdAt: string;
};
type PriorityProduct = {
  _id: string;
  nom: string;
  sku: string;
  stock: number;
  seuilAlerte: number;
  unite: string;
  severity: "RUPTURE" | "FAIBLE";
};
type OverviewData = {
  metrics: { totalProducts: number; stockValues: Array<{ devise: string; value: number }>; movementsToday: number; categoriesActive: number; totalUnits: number; valuationType: "achat" | "vente" };
  health: { available: number; lowStock: number; outOfStock: number; alertCount: number };
  recentMovements: Movement[];
  priorityProducts: PriorityProduct[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const EMPTY_DATA: OverviewData = {
  metrics: { totalProducts: 0, stockValues: [], movementsToday: 0, categoriesActive: 0, totalUnits: 0, valuationType: "vente" },
  health: { available: 0, lowStock: 0, outOfStock: 0, alertCount: 0 },
  recentMovements: [],
  priorityProducts: [],
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch { return { permissions: [] as string[], isOwner: false }; }
};

export default function InventairePage() {
  const { ui: du } = useDashboardLanguage();
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD ($)");
  const [metricDetail, setMetricDetail] = useState<{ title: string; value: string; detail: string } | null>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const hasPermission = (permission: string) => isOwner || permissions.includes(permission);
  const canCreateProduct = hasPermission("AJOUTER_PRODUIT");
  const canViewProducts = hasPermission("VOIR_LISTE_PRODUITS");
  const canViewCategories = hasPermission("VOIR_CATEGORIES");
  const canViewMovements = hasPermission("VOIR_MOUVEMENTS_STOCK");
  const canViewAlerts = hasPermission("VOIR_ALERTES_STOCK");

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/inventaire`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger la vue globale.");
      setData(result.data || EMPTY_DATA);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion au serveur.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const syncCurrency = () => setCurrency(getActiveBoutiqueCurrency());
    syncCurrency();
    window.addEventListener("userProfileUpdated", syncCurrency);
    return () => window.removeEventListener("userProfileUpdated", syncCurrency);
  }, []);
  useEffect(() => { void fetchOverview(); }, [fetchOverview]);

  const totalProducts = data.metrics.totalProducts;
  const healthRate = totalProducts > 0 ? Math.round((data.health.available / totalProducts) * 100) : 100;
  const formatDate = (value: string) => new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  const movementLabel = (type: Movement["type"]) => type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajustement";
  const compactNumber = (value: number) => Math.abs(value) < 1000000 ? value.toLocaleString(dashboardLocale()) : new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(value);
  const compactMoney = (value: number, devise: string) => {
    if (Math.abs(value) < 1000000) return formatMoney(value, devise);
    const symbol = devise.includes("(") ? devise.replace(/^.*\((.*)\).*$/, "$1") : devise;
    return `${new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(value)} ${symbol}`;
  };
  const stockValueFull = data.metrics.stockValues.length ? data.metrics.stockValues.map((amount) => formatMoney(amount.value, amount.devise)).join(" · ") : formatMoney(0, currency);
  const stockValueCompact = data.metrics.stockValues.length ? data.metrics.stockValues.map((amount) => compactMoney(amount.value, amount.devise)).join(" · ") : formatMoney(0, currency);

  if (loading) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400"><Loader2 size={28} className="animate-spin text-indigo-500" /><p className="text-xs font-medium">{du("mebd5cd62ab06")}</p></div>;
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title={du("m107b6d5f3014")} subtitle={du("meb6aae88b6b7")} action={canCreateProduct ? <Link href="/dashboard/inventaire/produits?new=1" className={primaryButton}><PackagePlus size={15} /> {du("maa42c3027789")}</Link> : undefined} />
      {error && <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-xs font-semibold"><XCircle size={15} />{du(error)}<button onClick={() => void fetchOverview()} className="ml-auto font-bold underline">{du("maf273d956b5b")}</button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label={du("m6f91e6231487")} value={compactNumber(data.metrics.totalProducts)} detail={du("mb9b933700bea", {p0: data.metrics.categoriesActive})} icon={Boxes} onInspect={() => setMetricDetail({ title: "Produits actifs", value: data.metrics.totalProducts.toLocaleString(dashboardLocale()), detail: "Nombre exact de produits actifs" })} />
        <MetricCard label={du("m5a5f49d217bd")} value={stockValueCompact} detail={du("m248caa3f32d4", {p0: data.metrics.valuationType})} icon={CircleDollarSign} tone="emerald" onInspect={() => setMetricDetail({ title: "Valeur du stock", value: stockValueFull, detail: `Valorisation exacte au prix de ${data.metrics.valuationType}` })} />
        <MetricCard label={du("ma04ac09064bd")} value={compactNumber(data.health.alertCount)} detail={du("m091d4962e005", {p0: data.health.outOfStock})} icon={AlertTriangle} tone="amber" onInspect={() => setMetricDetail({ title: "Alertes actives", value: data.health.alertCount.toLocaleString(dashboardLocale()), detail: `${data.health.outOfStock} rupture(s), ${data.health.lowStock} stock(s) faible(s)` })} />
        <MetricCard label={du("m3c8704de37bb")} value={compactNumber(data.metrics.movementsToday)} detail={du("me4eaa3070a33", {p0: compactNumber(data.metrics.totalUnits)})} icon={PackageCheck} tone="rose" onInspect={() => setMetricDetail({ title: "Mouvements du jour", value: data.metrics.movementsToday.toLocaleString(dashboardLocale()), detail: `${data.metrics.totalUnits.toLocaleString(dashboardLocale())} unité(s) en stock` })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-5">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">{du("m2df597d58a25")}</h2><p className="text-[11px] text-slate-400 mt-1">{du("mc297510ba7f2")}</p></div>{canViewMovements && <Link href="/dashboard/inventaire/stock" className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">{du("mff8a99c5c6f6")}{" "}<ArrowRight size={13} /></Link>}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">{du("ma0d3db2f0803")}</th><th className="px-5 py-3">{du("mbaaddf70fb5d")}</th><th className="px-5 py-3">{du("m8dc605f468e5")}</th><th className="px-5 py-3">{du("m99c40ab40592")}</th><th className="px-5 py-3">{du("m5880e59e0c06")}</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentMovements.map((movement) => <tr key={movement._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-800">{movement.produitId?.nom || du("m4bdb5f1b9014")}</p><p className="text-[10px] text-slate-400 mt-0.5">{movement.reference}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "ENTREE" ? "text-emerald-600" : movement.type === "SORTIE" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "ENTREE" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{du(movementLabel(movement.type))}</span></td><td className={`px-5 py-4 font-black ${movement.variation > 0 ? "text-emerald-600" : movement.variation < 0 ? "text-rose-600" : "text-slate-500"}`}>{movement.variation > 0 ? "+" : ""}{movement.variation}</td><td className="px-5 py-4 text-slate-500">{formatDate(movement.createdAt)}</td><td className="px-5 py-4 text-slate-500">{movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : du("m1abaf88d08a5")}</td></tr>)}</tbody></table></div>
          {data.recentMovements.length === 0 && <div className="py-12 text-center text-xs text-slate-400">{du("m95f0c7acd823")}</div>}
        </section>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">{du("m1f2d5fbcfdb3")}</h2><p className="text-[11px] text-slate-400 mt-1">{du("md92b229ba76b")}</p></div><span className="text-xl font-black text-emerald-600">{healthRate}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-5"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${healthRate}%` }} /></div><div className="grid grid-cols-3 gap-2 mt-5 text-center"><div><p className="text-sm font-black text-emerald-600">{data.health.available}</p><p className="text-[9px] text-slate-400 uppercase mt-1">{du("m5d4171b75a05")}</p></div><div><p className="text-sm font-black text-amber-600">{data.health.lowStock}</p><p className="text-[9px] text-slate-400 uppercase mt-1">{du("m4c473589e4e0")}</p></div><div><p className="text-sm font-black text-rose-600">{data.health.outOfStock}</p><p className="text-[9px] text-slate-400 uppercase mt-1">{du("mbecd31a4c41b")}</p></div></div></section>
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-slate-900">{du("m1a9a292c78f9")}</h2>{canViewAlerts && <Link href="/dashboard/inventaire/alertes" className="text-[11px] font-bold text-indigo-600">{du("m5c3eed0878a0")}</Link>}</div><div className="space-y-3">{data.priorityProducts.map((product) => <div key={product._id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{product.nom}</p><p className="text-[10px] text-slate-400">{product.stock} {du(product.unite)} {du("m084b87944ce6")}{" "}{product.seuilAlerte}</p></div><span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${product.severity === "RUPTURE" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{product.severity === "RUPTURE" ? du("m45ab2e3f28dc") : du("m3b15f1aae6ac")}</span></div>)}{data.priorityProducts.length === 0 && <div className="py-5 text-center"><CheckCircleIcon /><p className="text-xs text-slate-400 mt-2">{du("m326d487c5c3d")}</p></div>}</div></section>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canViewProducts && <QuickLink href="/dashboard/inventaire/produits" icon={PackagePlus} title={du("me04c8590196b")} text="Créer et modifier le catalogue" />}
        {canViewCategories && <QuickLink href="/dashboard/inventaire/categories" icon={Tags} title={du("m5d9c1ff640ba")} text="Structurer les familles d’articles" />}
        {canViewMovements && <QuickLink href="/dashboard/inventaire/stock" icon={Boxes} title={du("me167506d2a9e")} text="Suivre les entrées et les sorties" />}
      </section>
      <InventoryModal open={Boolean(metricDetail)} onClose={() => setMetricDetail(null)} title={metricDetail?.title || du("m3175df75860e")} subtitle={du(metricDetail?.detail) || du("mf8d9845cc98c")} footer={<button onClick={() => setMetricDetail(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("mf8d9845cc98c")}</p><p className="text-2xl font-black text-slate-900 mt-2 break-words">{metricDetail?.value}</p><p className="text-xs text-slate-500 mt-2">{du(metricDetail?.detail)}</p></div></InventoryModal>
    </div>
  );
}

function CheckCircleIcon() {
  const { ui: du } = useDashboardLanguage();
  return <PackageCheck size={24} className="mx-auto text-emerald-500" />;
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: typeof Boxes; title: string; text: string }) {
  const { ui: du } = useDashboardLanguage();
  return <Link href={href} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all"><span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon size={18} /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{du(title)}</span><span className="block text-[10px] text-slate-400 mt-1">{du(text)}</span></span></Link>;
}
