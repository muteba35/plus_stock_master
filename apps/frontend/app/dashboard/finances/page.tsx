"use client";

import { BarChart3, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { CashHeader, CashMetric, secondaryButton } from "../caisse/components/cashier-ui";
import { formatMoney } from "../inventaire/components/currency";
import { FinanceShell, StateBlock, compactMoney, useFinanceData } from "./finance-shared";

export default function FinanceDashboardPage() {
  const { data, loading, error, fetchData } = useFinanceData();
  const profitTone = data.metrics.marge >= 0 ? "emerald" : "rose";
  return <FinanceShell>
    <CashHeader title="Finances" subtitle="Synthese financiere consolidee sur le mois en cours." action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Chiffre d'affaires TTC" value={compactMoney(data.metrics.caTTC, data.devise)} detail={data.metrics.ventes + " vente(s)"} icon={WalletCards} tone="emerald" />
        <CashMetric label="TVA collectee" value={compactMoney(data.metrics.tva, data.devise)} detail="Montant fiscal du mois" icon={BarChart3} tone="indigo" />
        <CashMetric label="Cout sorti" value={compactMoney(data.metrics.cout, data.devise)} detail="Prix d'achat des produits vendus" icon={TrendingDown} tone="amber" />
        <CashMetric label={data.metrics.marge >= 0 ? "Benefice brut" : "Perte brute"} value={formatMoney(data.metrics.marge, data.devise)} detail={data.metrics.tauxMarge + "% de marge"} icon={TrendingUp} tone={profitTone} />
      </div>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900">Lecture rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <Info label="Net apres retours" value={formatMoney(data.metrics.netApresRetours, data.devise)} />
          <Info label="Retours rembourses" value={formatMoney(data.metrics.montantRetours, data.devise)} />
          <Info label="Devise de reference" value={data.devise} />
        </div>
      </section>
    </>}
  </FinanceShell>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-2 text-base font-black text-slate-900">{value}</p></div>;
}
