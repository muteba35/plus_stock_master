"use client";

import { RefreshCw } from "lucide-react";
import { CashHeader, CashPagination, CashSearch, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function FinanceSalesAnalysisPage() {
  const { data, loading, error, fetchData } = useFinanceData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => data.salesDetails.filter((row) => [row.reference, row.produit, row.caissier, row.paiement, row.categorie].join(" ").toLowerCase().includes(search.toLowerCase())), [data.salesDetails, search]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <FinanceShell>
    <CashHeader title="Analyse Ventes" subtitle="Detail commercial des produits vendus et des modes de paiement." action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100"><CashSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Rechercher vente, produit, caissier, paiement..." /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Vente</th><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Caissier</th><th className="px-5 py-4">Qte</th><th className="px-5 py-4">Total TTC</th><th className="px-5 py-4">Paiement</th><th className="px-5 py-4">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.reference + row.produit + index}><td className="px-5 py-4 font-bold">{row.reference}</td><td className="px-5 py-4">{row.produit}</td><td className="px-5 py-4">{row.caissier}</td><td className="px-5 py-4 font-black">{row.quantite}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className="px-5 py-4">{row.paiement}</td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td></tr>)}</tbody></table></div>
      <CashPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </section>}
  </FinanceShell>;
}
