"use client";
import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../src/components/LanguageRuntime";


import { useState } from "react";
import { BarChart3, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { CashHeader, CashMetric, CashModal, secondaryButton } from "../caisse/components/cashier-ui";
import { formatMoney } from "../inventaire/components/currency";
import { FinanceDateFilters, FinanceShell, StateBlock, compactMoney, useFinanceData } from "./finance-shared";

type MetricInfo = { title: string; value: string; detail: string; formula: string; note: string };

export default function FinanceDashboardPage() {
  const { ui: du } = useDashboardLanguage();
  const { data, loading, error, fetchData, dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd } = useFinanceData();
  const [metricInfo, setMetricInfo] = useState<MetricInfo | null>(null);
  const netMinusTax = data.metrics.netApresRetours - data.metrics.tva;
  const finalProfit = netMinusTax - data.metrics.cout;
  const profitTone = data.metrics.marge >= 0 ? "emerald" : "rose";
  const finalProfitTone = finalProfit >= 0 ? "emerald" : "rose";

  const openMetric = (info: MetricInfo) => setMetricInfo(info);

  return <FinanceShell>
    <CashHeader title={du("m614e14f791b0")} subtitle={du("mefd9b08ebdab")} action={<button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}</button>} />
    <FinanceDateFilters dateFilter={dateFilter} onDateFilterChange={setDateFilter} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label={du("m9735bc91d6c0")} value={compactMoney(data.metrics.caTTC, data.devise)} detail={data.metrics.ventes + " vente(s)"} icon={WalletCards} tone="emerald" onInspect={() => openMetric({ title: "Chiffre d'affaires TTC", value: formatMoney(data.metrics.caTTC, data.devise), detail: "Total encaissé toutes taxes comprises.", formula: "CA TTC = somme des totaux TTC des ventes payées.", note: "Cette valeur inclut la TVA et représente le montant facturé aux clients avant déduction des retours." })} />
        <CashMetric label={du("m4a8d154fa9bc")} value={compactMoney(data.metrics.tva, data.devise)} detail={du("m789bbdbe98f3")} icon={BarChart3} tone="indigo" onInspect={() => openMetric({ title: "TVA collectée", value: formatMoney(data.metrics.tva, data.devise), detail: "Part fiscale calculée sur les ventes.", formula: "TVA collectée = somme des montants TVA enregistrés sur chaque vente.", note: "Le taux standard utilisé à la caisse est de 16%, sauf évolution future de la configuration fiscale." })} />
        <CashMetric label={du("mb4e029d1ffdb")} value={compactMoney(data.metrics.cout, data.devise)} detail={du("ma756cf253861")} icon={TrendingDown} tone="amber" onInspect={() => openMetric({ title: "Coût sorti", value: formatMoney(data.metrics.cout, data.devise), detail: "Valeur d'achat des produits sortis du stock.", formula: "Coût sorti = somme des prix d'achat unitaires x quantités vendues.", note: "Cette valeur sert à comparer ce que la vente a rapporté avec ce que les marchandises avaient coûté." })} />
        <CashMetric label={data.metrics.marge >= 0 ? du("m665f9a4c5b3c") : du("m23d621082edd")} value={formatMoney(data.metrics.marge, data.devise)} detail={data.metrics.tauxMarge + "% de marge"} icon={TrendingUp} tone={profitTone} onInspect={() => openMetric({ title: data.metrics.marge >= 0 ? "Bénéfice brut" : "Perte brute", value: formatMoney(data.metrics.marge, data.devise), detail: "Résultat avant prise en compte des retours.", formula: "Bénéfice brut = chiffre d'affaires HT - coût sorti.", note: "Si la valeur est négative, cela indique une perte brute sur les ventes de la période." })} />
      </div>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900">{du("m0f094b1d1e05")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 text-xs">
          <Info label={du("m3c700a1d372c")} value={formatMoney(data.metrics.caTTC, data.devise)} />
          <Info label={du("m4f2f8126843b")} value={"- " + formatMoney(data.metrics.montantRetours, data.devise)} tone={data.metrics.montantRetours > 0 ? "rose" : "slate"} />
          <Info label={du("m2b23183ee6de")} value={formatMoney(data.metrics.netApresRetours, data.devise)} />
          <Info label={du("me0c41880fb6b")} value={formatMoney(netMinusTax, data.devise)} />
          <Info label={finalProfit >= 0 ? du("mccadd971cb5c") : du("md3a58450f4d1")} value={formatMoney(finalProfit, data.devise)} tone={finalProfitTone} />
        </div>
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-indigo-700 font-bold leading-relaxed">
          {du("m232350e1fca6")}{" "}</div>
      </section>
    </>}

    <CashModal open={Boolean(metricInfo)} title={metricInfo?.title || ""} subtitle={du("m29b7a763164c")} onClose={() => setMetricInfo(null)} footer={<button className={secondaryButton} onClick={() => setMetricInfo(null)}>{du("m711e5f2e198d")}</button>}>
      {metricInfo && <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m1115a085b088")}</p><p className="mt-2 text-2xl font-black text-slate-950">{metricInfo.value}</p><p className="mt-1 text-xs text-slate-500">{du(metricInfo.detail)}</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("me7c95542e449")}</p><p className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-bold text-indigo-700">{du(metricInfo.formula)}</p></div>
        <p className="text-xs leading-relaxed text-slate-500">{du(metricInfo.note)}</p>
      </div>}
    </CashModal>
  </FinanceShell>;
}

function Info({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" | "rose" }) {
  const { ui: du } = useDashboardLanguage();
  const color = tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-slate-900";
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 min-w-0"><p className="text-[10px] font-black uppercase text-slate-400">{du(label)}</p><p className={"mt-2 text-sm sm:text-base font-black break-words " + color}>{value}</p></div>;
}
