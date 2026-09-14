"use client";
import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../src/components/LanguageRuntime";


import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = { page: number; pageSize?: number; totalItems: number; onPageChange: (page: number) => void };

export default function TeamPagination({ page, pageSize = 10, totalItems, onPageChange }: Props) {
  const { ui: du } = useDashboardLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white"><p className="text-[11px] font-medium text-slate-400">{du("m0a30a815d67d")}{" "}{page} {du("mc89b6c3d164a")}{" "}{totalPages} · {totalItems} {du("m7a1571cc3c3d")}</p><div className="flex items-center gap-1"><button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} title={du("m0301d410db18")} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={15} /></button>{pages.map((item) => <button type="button" key={item} onClick={() => onPageChange(item)} className={`w-8 h-8 rounded-lg text-[11px] font-bold border ${item === page ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"}`}>{item}</button>)}<button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} title={du("m10733e78ff61")} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={15} /></button></div></div>;
}
