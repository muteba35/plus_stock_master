"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatMoney } from "../inventaire/components/currency";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

export const DATE_FILTERS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "custom", label: "Période personnalisée" },
] as const;

export type DateFilterValue = typeof DATE_FILTERS[number]["value"];

type Metrics = { ventes: number; caHT: number; caTTC: number; tva: number; cout: number; marge: number; tauxMarge: number; retours: number; montantRetours: number; netApresRetours: number };
type SaleDetail = { reference: string; factureReference?: string; clientNom?: string; date: string; caissier: string; paiement: string; produit: string; sku?: string; categorie?: string; quantite: number; prixVente: number; coutAchat: number; margeUnitaire: number; marge: number; montantRetourTTC?: number; margeApresRetour?: number; totalTTC: number; devise?: string };
type ReportRow = { date?: string; caissier?: string; paiement?: string; ventes: number; quantite: number; caHT: number; totalTTC: number; tva: number; cout: number; marge: number; tauxMarge: number };
type FinanceData = { success: boolean; scope: "all" | "own"; devise: string; metrics: Metrics; daily: ReportRow[]; cashiers: ReportRow[]; payments: ReportRow[]; salesDetails: SaleDetail[] };

const emptyMetrics: Metrics = { ventes: 0, caHT: 0, caTTC: 0, tva: 0, cout: 0, marge: 0, tauxMarge: 0, retours: 0, montantRetours: 0, netApresRetours: 0 };
const emptyData: FinanceData = { success: true, scope: "own", devise: "USD ($)", metrics: emptyMetrics, daily: [], cashiers: [], payments: [], salesDetails: [] };

export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
export const compactMoney = (value: number, devise: string) => Math.abs(value || 0) < 1000000 ? formatMoney(value, devise) : new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 }).format(value) + " " + devise.replace(/.*\((.*)\).*/, "$1");

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", dateFilter);
    if (dateFilter === "custom") {
      if (customStart) params.set("startDate", customStart);
      if (customEnd) params.set("endDate", customEnd);
    }
    return params.toString();
  }, [customEnd, customStart, dateFilter]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/caisse/rapports?" + queryString, { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les données financières.");
      setData({ ...emptyData, ...result, salesDetails: result.salesDetails || [] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, fetchData, dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd };
}

export function FinanceDateFilters({ dateFilter, onDateFilterChange, customStart, customEnd, onCustomStartChange, onCustomEndChange }: { dateFilter: DateFilterValue; onDateFilterChange: (value: DateFilterValue) => void; customStart: string; customEnd: string; onCustomStartChange: (value: string) => void; onCustomEndChange: (value: string) => void }) {
  return <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Période d'analyse</p>
      <p className="text-xs text-slate-500 mt-1">Filtre les cartes et les tableaux financiers.</p>
    </div>
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <div className="flex items-center bg-[#f9fafd] border border-slate-200 rounded-xl p-1 overflow-x-auto">
        {DATE_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => onDateFilterChange(filter.value)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${dateFilter === filter.value ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{filter.label}</button>)}
      </div>
      {dateFilter === "custom" && <div className="flex items-center gap-2">
        <input type="date" value={customStart} onChange={(event) => onCustomStartChange(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-500" />
        <input type="date" value={customEnd} onChange={(event) => onCustomEndChange(event.target.value)} className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 outline-none focus:border-indigo-500" />
      </div>}
    </div>
  </div>;
}

export function StateBlock({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="py-20 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={26} className="animate-spin text-indigo-500" /><span className="text-xs font-medium">Calcul des données financières...</span></div>;
  if (error) return <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"><AlertCircle size={15} />{error}</div>;
  return null;
}

export function FinanceShell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">{children}</div>;
}
