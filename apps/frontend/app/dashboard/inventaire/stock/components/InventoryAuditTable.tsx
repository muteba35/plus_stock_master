"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../../src/components/LanguageRuntime";


import { History, Loader2 } from "lucide-react";
import { InventoryPagination, SearchInput } from "../../components/inventory-ui";

export type AuditEntry = {
  _id: string;
  action: string;
  entityType: string;
  label: string;
  utilisateurId: { nom: string; prenom: string } | null;
  createdAt: string;
};

type Props = {
  visible: boolean;
  loading: boolean;
  entries: AuditEntry[];
  totalItems: number;
  search: string;
  page: number;
  pageSize: number;
  onSearch: (value: string) => void;
  onPageChange: (page: number) => void;
  formatDate: (value: string) => string;
};

export default function InventoryAuditTable({ visible, loading, entries, totalItems, search, page, pageSize, onSearch, onPageChange, formatDate }: Props) {
  const { ui: du } = useDashboardLanguage();
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${visible ? "block" : "hidden"}`}>
      <div className="p-4 border-b border-slate-100"><SearchInput value={search} onChange={onSearch} placeholder={du("m5815d41f876b")} /></div>
      <div className="overflow-x-auto">
        {loading ? <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-indigo-500" /></div> : (
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("m64cff1319d2f")}</th><th className="px-5 py-4">{du("m494ab22e997c")}</th><th className="px-5 py-4">{du("m526e0087cc3f")}</th><th className="px-5 py-4">{du("m99c40ab40592")}</th><th className="px-5 py-4">{du("m73370806b518")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><span className="inline-flex px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">{du(entry.action.replaceAll("_", " "))}</span></td><td className="px-5 py-4 font-bold text-slate-600">{du(entry.entityType.replaceAll("_", " "))}</td><td className="px-5 py-4 font-medium text-slate-800">{du(entry.label)}</td><td className="px-5 py-4 text-slate-500">{formatDate(entry.createdAt)}</td><td className="px-5 py-4 text-slate-600">{entry.utilisateurId ? `${entry.utilisateurId.prenom} ${entry.utilisateurId.nom}` : du("m1abaf88d08a5")}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      {!loading && totalItems === 0 && <div className="py-14 text-center"><History size={26} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">{du("m83eb838ac881")}</p></div>}
      <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{totalItems} {du("m78ad6052a23c")}</div>
      <InventoryPagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={onPageChange} />
    </div>
  );
}
