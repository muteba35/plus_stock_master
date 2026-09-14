"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { RefreshCw, Trophy } from "lucide-react";
import { CashHeader, CashMetric, CashPagination, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceDateFilters, FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function FinanceProfitLossPage() {
  const { ui: du } = useDashboardLanguage();
  const { data, loading, error, fetchData, dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd } = useFinanceData();
  const [page, setPage] = useState(1);

  const rows = useMemo(() => data.salesDetails.map((row) => ({ ...row, coutTotal: row.coutAchat * row.quantite, margeApresRetour: row.margeApresRetour ?? row.marge })).sort((a, b) => b.margeApresRetour - a.margeApresRetour), [data.salesDetails]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const topProducts = useMemo(() => {
    const map = new Map<string, { produit: string; quantite: number; totalTTC: number; marge: number }>();
    data.salesDetails.forEach((row) => {
      const current = map.get(row.produit) || { produit: row.produit, quantite: 0, totalTTC: 0, marge: 0 };
      current.quantite += Number(row.quantite || 0);
      current.totalTTC += Number(row.totalTTC || 0);
      current.marge += Number(row.margeApresRetour ?? row.marge ?? 0);
      map.set(row.produit, current);
    });
    return Array.from(map.values()).sort((a, b) => b.quantite - a.quantite).slice(0, 5);
  }, [data.salesDetails]);

  const topCategories = useMemo(() => {
    const map = new Map<string, { categorie: string; quantite: number; totalTTC: number; marge: number }>();
    data.salesDetails.forEach((row) => {
      const name = row.categorie || "Sans categorie";
      const current = map.get(name) || { categorie: name, quantite: 0, totalTTC: 0, marge: 0 };
      current.quantite += Number(row.quantite || 0);
      current.totalTTC += Number(row.totalTTC || 0);
      current.marge += Number(row.margeApresRetour ?? row.marge ?? 0);
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.totalTTC - a.totalTTC).slice(0, 5);
  }, [data.salesDetails]);

  return <FinanceShell>
    <CashHeader title={du("m0ee2948fd4ce")} subtitle={du("m6c8d01bed2a0")} action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}</button>} />
    <FinanceDateFilters dateFilter={dateFilter} onDateFilterChange={setDateFilter} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label={du("mb9982b198e10")} value={formatMoney(data.metrics.marge, data.devise)} detail={data.metrics.tauxMarge + "% de marge"} icon={Trophy} tone={data.metrics.marge >= 0 ? "emerald" : "rose"} />
        <CashMetric label={du("m763cd6419fc1")} value={formatMoney(data.metrics.netApresRetours, data.devise)} detail={du("me872e418f1c8")} icon={Trophy} tone="indigo" />
        <CashMetric label={du("me44b386d4c1e")} value={formatMoney(data.metrics.montantRetours, data.devise)} detail={data.metrics.retours + " retour(s)"} icon={Trophy} tone="rose" />
        <CashMetric label={du("mf156aedf9898")} value={String(data.metrics.ventes)} detail={du("md3332406e59a")} icon={Trophy} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <TopBox title={du("m0d6bd8c08c18")} rows={topProducts.map((item) => [item.produit, item.quantite + " unite(s)", formatMoney(item.totalTTC, data.devise), formatMoney(item.marge, data.devise)])} />
        <TopBox title={du("m1c42532da5fa")} rows={topCategories.map((item) => [item.categorie, item.quantite + " unite(s)", formatMoney(item.totalTTC, data.devise), formatMoney(item.marge, data.devise)])} />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">{du("m88feffae37c3")}</h2>
          <p className="text-[11px] text-slate-400 mt-1">{du("m97d9e690ed31")}</p>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("ma0d3db2f0803")}</th><th className="px-5 py-4">{du("m99c40ab40592")}</th><th className="px-5 py-4">{du("me51377cc0622")}</th><th className="px-5 py-4">{du("meb04bfa4d762")}</th><th className="px-5 py-4">{du("m5a1bcd077833")}</th><th className="px-5 py-4">{du("m7324c6571082")}</th><th className="px-5 py-4">{du("m18edfe670359")}</th><th className="px-5 py-4">{du("mf1e36b00cbf8")}</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row, index) => <tr key={row.reference + row.produit + index}><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.produit}</p><p className="text-[10px] text-slate-400">{row.categorie || row.sku || "-"}</p></td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td><td className="px-5 py-4">{row.quantite}</td><td className="px-5 py-4">{formatMoney(row.coutTotal, data.devise)}</td><td className="px-5 py-4">{formatMoney(row.prixVente, data.devise)}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td><td className={(row.margeApresRetour >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.margeApresRetour, data.devise)}</td></tr>)}</tbody></table></div>
        <CashPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
      </section>
    </>}
  </FinanceShell>;
}

function TopBox({ title, rows }: { title: string; rows: string[][] }) {
  const { ui: du } = useDashboardLanguage();
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900">{du(title)}</h2><div className="mt-4 space-y-3">{rows.length === 0 && <p className="text-xs text-slate-400">{du("mb4c8eb0bc52b")}</p>}{rows.map((row, index) => <div key={row[0] + index} className="grid grid-cols-[32px_1fr_auto] gap-3 items-center rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{index + 1}</div><div className="min-w-0"><p className="text-xs font-black text-slate-900 truncate">{row[0]}</p><p className="text-[10px] text-slate-400">{row[1]}</p></div><div className="text-right"><p className="text-xs font-black text-slate-900">{row[2]}</p><p className="text-[10px] font-bold text-emerald-600">{row[3]}</p></div></div>)}</div></section>;
}
