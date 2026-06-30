"use client";

import { RefreshCw, Trophy } from "lucide-react";
import { CashHeader, CashMetric, CashPagination, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceDateFilters, FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function FinanceProfitLossPage() {
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
    <CashHeader title="Benefices & Pertes" subtitle="Analyse des marges, comparaisons par periode et meilleurs produits vendus." action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>} />
    <FinanceDateFilters dateFilter={dateFilter} onDateFilterChange={setDateFilter} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Marge brute" value={formatMoney(data.metrics.marge, data.devise)} detail={data.metrics.tauxMarge + "% de marge"} icon={Trophy} tone={data.metrics.marge >= 0 ? "emerald" : "rose"} />
        <CashMetric label="Net apres retours" value={formatMoney(data.metrics.netApresRetours, data.devise)} detail="CA TTC - retours" icon={Trophy} tone="indigo" />
        <CashMetric label="Retours clients" value={formatMoney(data.metrics.montantRetours, data.devise)} detail={data.metrics.retours + " retour(s)"} icon={Trophy} tone="rose" />
        <CashMetric label="Ventes analysees" value={String(data.metrics.ventes)} detail="Sur la periode choisie" icon={Trophy} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <TopBox title="Top produits vendus" rows={topProducts.map((item) => [item.produit, item.quantite + " unite(s)", formatMoney(item.totalTTC, data.devise), formatMoney(item.marge, data.devise)])} />
        <TopBox title="Top categories vendues" rows={topCategories.map((item) => [item.categorie, item.quantite + " unite(s)", formatMoney(item.totalTTC, data.devise), formatMoney(item.marge, data.devise)])} />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Details des marges par vente</h2>
          <p className="text-[11px] text-slate-400 mt-1">Permet de voir produit par produit ce qui a rapporte ou cree une perte.</p>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Qte</th><th className="px-5 py-4">Cout achat</th><th className="px-5 py-4">Prix HT</th><th className="px-5 py-4">Total TTC</th><th className="px-5 py-4">Marge</th><th className="px-5 py-4">Marge apres retour</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row, index) => <tr key={row.reference + row.produit + index}><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.produit}</p><p className="text-[10px] text-slate-400">{row.categorie || row.sku || "-"}</p></td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td><td className="px-5 py-4">{row.quantite}</td><td className="px-5 py-4">{formatMoney(row.coutTotal, data.devise)}</td><td className="px-5 py-4">{formatMoney(row.prixVente, data.devise)}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td><td className={(row.margeApresRetour >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.margeApresRetour, data.devise)}</td></tr>)}</tbody></table></div>
        <CashPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
      </section>
    </>}
  </FinanceShell>;
}

function TopBox({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900">{title}</h2><div className="mt-4 space-y-3">{rows.length === 0 && <p className="text-xs text-slate-400">Aucune donnee.</p>}{rows.map((row, index) => <div key={row[0] + index} className="grid grid-cols-[32px_1fr_auto] gap-3 items-center rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{index + 1}</div><div className="min-w-0"><p className="text-xs font-black text-slate-900 truncate">{row[0]}</p><p className="text-[10px] text-slate-400">{row[1]}</p></div><div className="text-right"><p className="text-xs font-black text-slate-900">{row[2]}</p><p className="text-[10px] font-bold text-emerald-600">{row[3]}</p></div></div>)}</div></section>;
}
