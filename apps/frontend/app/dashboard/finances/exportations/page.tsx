"use client";

import { Download, FileText } from "lucide-react";
import { CashHeader, secondaryButton } from "../../caisse/components/cashier-ui";
import { FinanceShell } from "../finance-shared";

export default function FinanceExportsPage() {
  return <FinanceShell>
    <CashHeader title="Exportations" subtitle="Centre des exports financiers disponibles." />
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ExportCard title="Rapports Caisse" text="Export detaille avec resume, ventes, paiements, caissiers et retours." href="/dashboard/caisse/rapports" />
      <ExportCard title="Rapport financier" text="Export financier consolide depuis le sous-menu Rapports d'activite." href="/dashboard/finances/rapports" />
    </section>
  </FinanceShell>;
}

function ExportCard({ title, text, href }: { title: string; text: string; href: string }) {
  return <a href={href} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText size={18} /></div><h2 className="text-sm font-bold text-slate-900 mt-4">{title}</h2><p className="text-xs text-slate-500 mt-2 leading-relaxed">{text}</p><span className={secondaryButton + " mt-4 inline-flex"}><Download size={14} /> Ouvrir</span></a>;
}
