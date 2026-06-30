"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  CreditCard,
  DollarSign,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

type PeriodValue = "today" | "7" | "month" | "30" | "custom";

type DashboardData = {
  success: boolean;
  devise: string;
  period: { period: PeriodValue; label: string; startDate?: string | null; endDate?: string | null; chartFallback?: boolean };
  metrics: {
    caTTC: number;
    caTrend: number;
    ventes: number;
    ventesTrend: number;
    totalProducts: number;
    totalUnits: number;
    stockValue: number;
    alertCount: number;
    marge: number;
    margeTrend: number;
    tauxMarge: number;
    tva: number;
    retours: number;
    mouvements: number;
  };
  salesData: { name: string; ventes: number; benefices: number }[];
  topProducts: { name: string; stock: number; threshold: number; unit: string }[];
  recentSales: { id: string; gerant: string; methode: string; montant: number; statut: string; date: string }[];
  activeUsers: { name: string; role: string; status: "online" | "offline"; email: string }[];
};

const emptyData: DashboardData = {
  success: true,
  devise: "USD ($)",
  period: { period: "7", label: "7 derniers jours" },
  metrics: {
    caTTC: 0,
    caTrend: 0,
    ventes: 0,
    ventesTrend: 0,
    totalProducts: 0,
    totalUnits: 0,
    stockValue: 0,
    alertCount: 0,
    marge: 0,
    margeTrend: 0,
    tauxMarge: 0,
    tva: 0,
    retours: 0,
    mouvements: 0,
  },
  salesData: [],
  topProducts: [],
  recentSales: [],
  activeUsers: [],
};

const formatMoney = (value: number, devise: string) => {
  const symbol = devise.includes("(") ? devise.replace(/^.*\((.*)\).*$/, "$1") : devise;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(value || 0)) + " " + symbol;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};

const TrendBadge = ({ value }: { value: number }) => {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${positive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>
      <Icon size={12} className="mr-0.5" />
      {positive ? "+" : ""}{value}%
    </span>
  );
};

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [period, setPeriod] = useState<PeriodValue>("7");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }
      const response = await fetch(`${API_URL}/dashboard/overview?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger la vue d'ensemble.");
      setData({ ...emptyData, ...result });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, period]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const onlineUsers = useMemo(() => data.activeUsers.filter((user) => user.status === "online").length, [data.activeUsers]);
  const chartData = useMemo(() => data.salesData.map((item) => ({
    ...item,
    beneficePositif: item.benefices >= 0 ? item.benefices : null,
    perteNegative: item.benefices < 0 ? item.benefices : null,
  })), [data.salesData]);

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tableau de bord</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Performances globales, caisse, stock et équipe de la boutique active.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center bg-[#f9fafd] border border-slate-200 rounded-xl p-1 overflow-x-auto">
            {[
              { value: "today", label: "Aujourd'hui" },
              { value: "7", label: "7 jours" },
              { value: "month", label: "Mois" },
              { value: "30", label: "30 jours" },
              { value: "custom", label: "Période" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setPeriod(item.value as PeriodValue)}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg whitespace-nowrap transition-all ${period === item.value ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-500" />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-500" />
            </div>
          )}
          <button onClick={fetchOverview} disabled={loading} className="p-2.5 bg-[#f9fafd] border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50" title="Actualiser">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {!error && data.metrics.alertCount > 0 && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            data.topProducts.some((product) => product.stock <= 0)
              ? "bg-rose-50 border-rose-100"
              : "bg-amber-50 border-amber-100"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                data.topProducts.some((product) => product.stock <= 0)
                  ? "bg-white text-rose-600 border-rose-100"
                  : "bg-white text-amber-600 border-amber-100"
              }`}>
                <AlertTriangle size={19} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-950 uppercase tracking-wider">
                  {data.metrics.alertCount} alerte{data.metrics.alertCount > 1 ? "s" : ""} de stock
                </p>
                <p className="text-xs text-slate-600 font-semibold mt-1 truncate">
                  {data.topProducts[0]
                    ? `${data.topProducts[0].name}: ${data.topProducts[0].stock} ${data.topProducts[0].unit} restant(s)`
                    : "Des produits necessitent une verification."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.metrics.alertCount > 1 && (
                <button
                  type="button"
                  onClick={() => setShowStockAlertsModal(true)}
                  className="px-3 py-2 rounded-xl bg-white/80 border border-white text-[11px] font-black text-slate-700 hover:bg-white transition-colors"
                >
                  +{data.metrics.alertCount - 1} autre{data.metrics.alertCount - 1 > 1 ? "s" : ""}
                </button>
              )}
              <Link href="/dashboard/inventaire/alertes" className="px-3 py-2 rounded-xl bg-slate-950 text-white text-[11px] font-black">
                Voir les alertes
              </Link>
            </div>
          </div>
        </div>
      )}

      {showStockAlertsModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setShowStockAlertsModal(false)} aria-label="Fermer les alertes" />
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950 uppercase tracking-wider">Alertes de stock</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">{data.metrics.alertCount} produit(s) a verifier</p>
              </div>
              <button onClick={() => setShowStockAlertsModal(false)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-black">x</button>
            </div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {data.topProducts.map((product) => (
                <div key={product.name} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{product.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">Seuil minimum: {product.threshold} {product.unit}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap ${
                    product.stock <= 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/inventaire/alertes" className="block p-4 text-center bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase tracking-wider" onClick={() => setShowStockAlertsModal(false)}>
              Ouvrir le module alertes
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chiffre d'affaires TTC</span>
              <h3 className="text-xl font-black text-slate-900 truncate">{formatMoney(data.metrics.caTTC, data.devise)}</h3>
            </div>
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/10"><DollarSign size={18} /></div>
          </div>
          <div className="mt-4 flex items-center gap-1.5"><TrendBadge value={data.metrics.caTrend} /><span className="text-[10px] font-medium text-slate-400">vs période précédente</span></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ventes réalisées</span>
              <h3 className="text-xl font-black text-slate-900">{data.metrics.ventes} panier{data.metrics.ventes > 1 ? "s" : ""}</h3>
            </div>
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/10"><ShoppingCart size={18} /></div>
          </div>
          <div className="mt-4 flex items-center gap-1.5"><TrendBadge value={data.metrics.ventesTrend} /><span className="text-[10px] font-medium text-slate-400">{data.period.label}</span></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume stock</span>
              <h3 className="text-xl font-black text-slate-900 truncate">{data.metrics.totalUnits} unité{data.metrics.totalUnits > 1 ? "s" : ""}</h3>
            </div>
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/10"><Package size={18} /></div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md">{data.metrics.totalProducts} réf.</span>
            <span className="text-[10px] font-medium text-slate-400">{data.metrics.alertCount} alerte{data.metrics.alertCount > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marge brute</span>
              <h3 className="text-xl font-black text-slate-900 truncate">{formatMoney(data.metrics.marge, data.devise)}</h3>
            </div>
            <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 border border-violet-500/10"><TrendingUp size={18} /></div>
          </div>
          <div className="mt-4 flex items-center gap-1.5"><TrendBadge value={data.metrics.margeTrend} /><span className="text-[10px] font-medium text-slate-400">{data.metrics.tauxMarge}% de marge</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center mb-6 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Analyse des flux financiers</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{data.period.chartFallback ? "La période choisie est vide : affichage des dernières ventes enregistrées." : "Évolution réelle des ventes et de la marge brute."}</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wide">
              <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Ventes</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-teal-400" />Bénéfice</span><span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Perte</span>
            </div>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/><stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorBenefs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.15}/><stop offset="95%" stopColor="#2DD4BF" stopOpacity={0}/></linearGradient><linearGradient id="colorPertes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F43F5E" stopOpacity={0.16}/><stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} stroke="#94A3B8" />
                <Tooltip formatter={(value) => formatMoney(Number(value), data.devise)} />
                <Area type="monotone" dataKey="ventes" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorVentes)" />
                <Area type="monotone" dataKey="beneficePositif" name="Bénéfice" stroke="#2DD4BF" strokeWidth={2} fillOpacity={1} fill="url(#colorBenefs)" connectNulls={false} /><Area type="monotone" dataKey="perteNegative" name="Perte" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorPertes)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Stock à surveiller</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-6">Produits proches du seuil ou en rupture.</p>
            <div className="space-y-4">
              {data.topProducts.length === 0 && <p className="text-xs text-slate-400 font-semibold text-center py-8">Aucun produit critique.</p>}
              {data.topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Seuil {product.threshold} {product.unit}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${product.stock <= 0 ? "text-rose-500 bg-rose-500/10" : product.stock <= product.threshold ? "text-amber-500 bg-amber-500/10" : "text-indigo-500 bg-indigo-500/10"}`}>{product.stock} {product.unit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-24 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts}><Bar dataKey="stock" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={30} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Activité de caisse récente</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Derniers encaissements validés par les opérateurs.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-[#f9fafd] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-3 px-6">ID vente</th><th className="py-3 px-6">Caissier</th><th className="py-3 px-6">Règlement</th><th className="py-3 px-6">Montant total</th><th className="py-3 px-6 text-right">Statut</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.recentSales.length === 0 && <tr><td colSpan={5} className="py-10 px-6 text-center text-slate-400 font-semibold">Aucune vente récente.</td></tr>}
                {data.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#f9fafd]/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-400">{sale.id}</td>
                    <td className="py-4 px-6"><p className="font-bold text-slate-800">{sale.gerant}</p><p className="text-[10px] text-slate-400">{formatDate(sale.date)}</p></td>
                    <td className="py-4 px-6"><span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">{sale.methode.toLowerCase().includes("esp") ? <Coins size={13} className="text-amber-500" /> : <CreditCard size={13} className="text-indigo-400" />}{sale.methode}</span></td>
                    <td className="py-4 px-6 font-black text-slate-900">{formatMoney(sale.montant, data.devise)}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${sale.statut === "PAYEE" ? "bg-emerald-500/10 text-emerald-500" : sale.statut === "ANNULEE" ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}`}>
                        {sale.statut === "PAYEE" && <CheckCircle2 size={12} />}
                        {sale.statut === "ANNULEE" && <AlertTriangle size={12} />}
                        {sale.statut === "REMBOURSEE" && <XCircle size={12} />}
                        {sale.statut === "PAYEE" ? "Payée" : sale.statut === "ANNULEE" ? "Annulée" : "Remboursée"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Users size={16} className="text-indigo-500" /><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Équipe active</h3></div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{onlineUsers} actif{onlineUsers > 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.activeUsers.length === 0 && <p className="text-xs text-slate-400 font-semibold text-center py-8">Aucun membre trouvé.</p>}
            {data.activeUsers.map((user) => (
              <div key={user.email} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-200">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${user.status === "online" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{user.name}</p><p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p></div>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${user.role.toLowerCase().includes("proprietaire") || user.role.toLowerCase().includes("admin") ? "text-indigo-600 bg-indigo-500/10" : "text-slate-600 bg-slate-100"}`}>
                  {user.role.toLowerCase().includes("proprietaire") || user.role.toLowerCase().includes("admin") ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
