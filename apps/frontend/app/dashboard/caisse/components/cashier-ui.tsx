"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";
import ModalPortal from "../../components/ModalPortal";

export const fieldClass = "w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500";
export const primaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
export const secondaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export function CashHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-xl font-bold text-slate-900">{title}</h1><p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p></div>{action}</div>;
}

export function CashMetric({ label, value, detail, icon: Icon, tone = "indigo", onInspect }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "indigo" | "emerald" | "amber" | "rose"; onInspect?: () => void }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", amber: "bg-amber-50 text-amber-600 border-amber-100", rose: "bg-rose-50 text-rose-600 border-rose-100" };
  return <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm min-w-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 leading-tight whitespace-normal break-words">{value}</p><p className="text-[11px] text-slate-400 mt-1">{detail}</p></div><div className="flex flex-col items-end gap-2 shrink-0"><div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}><Icon size={18} /></div>{onInspect && <button type="button" onClick={onInspect} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-[11px] font-black" title="Voir le montant complet">i</button>}</div></div></div>;
}

export function CashSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative flex-1 min-w-0"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full h-10 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500" /></div>;
}

export function CashBadge({ status }: { status: string }) {
  const value = status.toLowerCase();
  const style = value.includes("pay") || value.includes("valid") || value.includes("rembours") ? "bg-emerald-50 text-emerald-700" : value.includes("annul") || value.includes("refus") ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${style}`}>{status}</span>;
}

export function CashModal({ open, title, subtitle, onClose, children, footer }: { open: boolean; title: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  if (!open) return null;
  return <ModalPortal><div className="fixed inset-0 z-[200] bg-slate-950/45 backdrop-blur-[2px] p-3 sm:p-6 flex items-center justify-center" onMouseDown={onClose}><div className="w-full max-w-xl max-h-[92dvh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" onMouseDown={(event) => event.stopPropagation()}><div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50"><div><h2 className="text-sm font-bold text-slate-900 uppercase">{title}</h2><p className="text-[11px] text-slate-400 mt-1">{subtitle}</p></div><button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button></div><div className="p-5 overflow-y-auto">{children}</div><div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2">{footer}</div></div></div></ModalPortal>;
}

export function CashPagination({ page, pageSize, totalItems, onPageChange }: { page: number; pageSize: number; totalItems: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100"><span className="text-[10px] text-slate-400">Page {page} sur {totalPages}</span><div className="flex gap-1"><button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30"><ChevronLeft size={14} /></button><button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30"><ChevronRight size={14} /></button></div></div>;
}
