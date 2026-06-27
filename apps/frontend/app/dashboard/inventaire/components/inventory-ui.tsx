"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";

export type ProductStatus = "Disponible" | "Stock faible" | "Rupture" | "Expire";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "indigo", onInspect }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "indigo" | "emerald" | "amber" | "rose"; onInspect?: () => void }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 leading-tight whitespace-normal break-words">{value}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{detail}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0"><div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}><Icon size={18} /></div>{onInspect && <button type="button" onClick={onInspect} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-[11px] font-black" title="Voir la valeur exacte">i</button>}</div>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full h-10 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500" />
    </div>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const style = status === "Disponible" ? "bg-emerald-50 text-emerald-600" : status === "Stock faible" ? "bg-amber-50 text-amber-700" : status === "Expire" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-600";
  return <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${style}`}>{status}</span>;
}

export function InventoryPagination({ page, pageSize, totalItems, onPageChange }: { page: number; pageSize: number; totalItems: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index).filter((value) => value <= totalPages);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white rounded-b-2xl">
      <span className="text-[10px] font-medium text-slate-400">Page {page} sur {totalPages}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Page précédente"><ChevronLeft size={15} /></button>
        {pages.map((pageNumber) => <button type="button" key={pageNumber} onClick={() => onPageChange(pageNumber)} className={`w-8 h-8 rounded-lg text-[11px] font-bold border ${pageNumber === page ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{pageNumber}</button>)}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed" title="Page suivante"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function InventoryModal({ title, subtitle, open, onClose, children, footer, notice }: { title: string; subtitle: string; open: boolean; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; notice?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[2px] p-3 sm:p-6 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-xl max-h-[92dvh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" onMouseDown={(event) => event.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div><h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h2><p className="text-[11px] text-slate-400 mt-1">{subtitle}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
        </div>
        {notice && <div className="px-5 pt-4 bg-white">{notice}</div>}
        <div className="p-5 overflow-y-auto">{children}</div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export const fieldClass = "w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500";
export const primaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap";
export const secondaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors whitespace-nowrap";
