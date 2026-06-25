"use client";

import { Download, RefreshCw } from "lucide-react";
import { CashHeader, secondaryButton } from "../../caisse/components/cashier-ui";
import { FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

export default function FinanceReportsPage() {
  const { data, loading, error, fetchData } = useFinanceData();
  const exportReport = () => exportXlsxWorkbook("rapport-financier.xlsx", [
    { name: "Resume", columns: ["Indicateur", "Valeur"], rows: [["CA TTC", data.metrics.caTTC], ["TVA", data.metrics.tva], ["Cout sorti", data.metrics.cout], ["Marge", data.metrics.marge], ["Retours", data.metrics.montantRetours]] },
    { name: "Ventes", columns: ["Reference", "Produit", "Caissier", "Qte", "Total TTC", "Date"], rows: data.salesDetails.map((row) => [row.reference, row.produit, row.caissier, row.quantite, row.totalTTC, formatDate(row.date)]) },
    { name: "Paiements", columns: ["Paiement", "Ventes", "Total TTC"], rows: data.payments.map((row) => [row.paiement || "-", row.ventes, row.totalTTC]) },
  ]);
  return <FinanceShell>
    <CashHeader title="Rapports d'activite" subtitle="Preparation des rapports financiers exportables." action={<div className="flex flex-wrap gap-2"><button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button><button onClick={exportReport} disabled={loading} className={secondaryButton}><Download size={14} /> Export XLSX</button></div>} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900">Rapport pret</h2><p className="text-xs text-slate-500 mt-2">Le fichier Excel contient un resume, les ventes detaillees et les paiements.</p></section>}
  </FinanceShell>;
}
