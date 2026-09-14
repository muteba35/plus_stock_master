"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { RefreshCw } from "lucide-react";
import { CashHeader, CashPagination, CashSearch, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function FinanceSalesAnalysisPage() {
  const { ui: du } = useDashboardLanguage();
  const { data, loading, error, fetchData } = useFinanceData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => data.salesDetails.filter((row) => [row.reference, row.produit, row.caissier, row.paiement, row.categorie].join(" ").toLowerCase().includes(search.toLowerCase())), [data.salesDetails, search]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <FinanceShell>
    <CashHeader title={du("mbf7ff1668f29")} subtitle={du("m2db81bbe1b39")} action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}</button>} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100"><CashSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={du("mba3ef51e77a5")} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("mee19f8d8fffd")}</th><th className="px-5 py-4">{du("ma0d3db2f0803")}</th><th className="px-5 py-4">{du("mbe0e77f22f53")}</th><th className="px-5 py-4">{du("me51377cc0622")}</th><th className="px-5 py-4">{du("m7324c6571082")}</th><th className="px-5 py-4">{du("m5d9e9e44e18a")}</th><th className="px-5 py-4">{du("m99c40ab40592")}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.reference + row.produit + index}><td className="px-5 py-4 font-bold">{row.reference}</td><td className="px-5 py-4">{row.produit}</td><td className="px-5 py-4">{row.caissier}</td><td className="px-5 py-4 font-black">{row.quantite}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className="px-5 py-4">{du(row.paiement)}</td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td></tr>)}</tbody></table></div>
      <CashPagination page={currentPage} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </section>}
  </FinanceShell>;
}
