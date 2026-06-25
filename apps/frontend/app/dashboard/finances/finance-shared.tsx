"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, FileText, Loader2, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { formatMoney } from "../inventaire/components/currency";
import { CashHeader, CashMetric, CashPagination, CashSearch, secondaryButton } from "../caisse/components/cashier-ui";
import { exportXlsxWorkbook } from "../components/export-xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 10;

type Metrics = { ventes: number; caHT: number; caTTC: number; tva: number; cout: number; marge: number; tauxMarge: number; retours: number; montantRetours: number; netApresRetours: number };
type SaleDetail = { reference: string; factureReference?: string; clientNom?: string; date: string; caissier: string; paiement: string; produit: string; sku?: string; categorie?: string; quantite: number; prixVente: number; coutAchat: number; margeUnitaire: number; marge: number; totalTTC: number; devise?: string };
type ReportRow = { date?: string; caissier?: string; paiement?: string; ventes: number; quantite: number; caHT: number; totalTTC: number; tva: number; cout: number; marge: number; tauxMarge: number };
type FinanceData = { success: boolean; scope: "all" | "own"; devise: string; metrics: Metrics; daily: ReportRow[]; cashiers: ReportRow[]; payments: ReportRow[]; salesDetails: SaleDetail[] };

const emptyMetrics: Metrics = { ventes: 0, caHT: 0, caTTC: 0, tva: 0, cout: 0, marge: 0, tauxMarge: 0, retours: 0, montantRetours: 0, netApresRetours: 0 };
const emptyData: FinanceData = { success: true, scope: "own", devise: "USD ($)", metrics: emptyMetrics, daily: [], cashiers: [], payments: [], salesDetails: [] };
export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
export const compactMoney = (value: number, devise: string) => Math.abs(value || 0) < 1000000 ? formatMoney(value, devise) : new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 }).format(value) + " " + devise.replace(/.*\\((.*)\\).*/, "$1");

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/caisse/rapports?period=month", { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les donnees financieres.");
      setData({ ...emptyData, ...result, salesDetails: result.salesDetails || [] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, fetchData };
}

export function StateBlock({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="py-20 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={26} className="animate-spin text-indigo-500" /><span className="text-xs font-medium">Calcul des donnees financieres...</span></div>;
  if (error) return <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"><AlertCircle size={15} />{error}</div>;
  return null;
}

export function FinanceShell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">{children}</div>;
}
