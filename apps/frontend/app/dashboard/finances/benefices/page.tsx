"use client";

import { RefreshCw } from "lucide-react";
import { CashHeader, CashPagination, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function FinanceProfitLossPage() {
  const { data, loading, error, fetchData } = useFinanceData();
  const [page, setPage] = useState(1);
  const rows = useMemo(() => data.salesDetails.map((row) => ({ ...row, coutTotal: row.coutAchat * row.quantite })).sort((a, b) => b.marge - a.marge), [data.salesDetails]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <FinanceShell>
    <CashHeader title="Benefices & Pertes" subtitle="Marge generee par produit vendu sur le mois en cours." action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Qte</th><th className="px-5 py-4">Cout achat</th><th className="px-5 py-4">Prix vente</th><th className="px-5 py-4">Marge</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row, index) => <tr key={row.reference + row.produit + index}><td className="px-5 py-4 font-bold">{row.produit}</td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td><td className="px-5 py-4">{row.quantite}</td><td className="px-5 py-4">{formatMoney(row.coutTotal, data.devise)}</td><td className="px-5 py-4">{formatMoney(row.totalTTC, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td></tr>)}</tbody></table></div>
      <CashPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
    </section>}
  </FinanceShell>;
}
