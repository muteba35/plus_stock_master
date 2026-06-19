"use client";

import React from "react";
import { Search, X, type LucideIcon } from "lucide-react";

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  threshold: number;
  status: "Disponible" | "Stock faible" | "Rupture";
};

export type Movement = {
  id: number;
  reference: string;
  product: string;
  type: "Entrée" | "Sortie" | "Ajustement";
  quantity: number;
  date: string;
  author: string;
};

export const products: Product[] = [
  { id: 1, name: "MacBook Pro M2", sku: "LAP-MBP-001", category: "Électronique", price: 1299, stock: 45, threshold: 10, status: "Disponible" },
  { id: 2, name: "Clavier mécanique", sku: "ACC-KEY-002", category: "Périphériques", price: 89, stock: 12, threshold: 15, status: "Stock faible" },
  { id: 3, name: "Souris sans fil", sku: "ACC-MOU-003", category: "Périphériques", price: 35, stock: 0, threshold: 8, status: "Rupture" },
  { id: 4, name: "Écran 27 pouces", sku: "MON-027-004", category: "Électronique", price: 320, stock: 18, threshold: 5, status: "Disponible" },
  { id: 5, name: "Casque Bluetooth", sku: "AUD-BT-005", category: "Audio", price: 79, stock: 6, threshold: 10, status: "Stock faible" },
];

export const movements: Movement[] = [
  { id: 1, reference: "MVT-2401", product: "MacBook Pro M2", type: "Entrée", quantity: 20, date: "Aujourd’hui, 09:42", author: "Junior Muteba" },
  { id: 2, reference: "MVT-2402", product: "Clavier mécanique", type: "Sortie", quantity: 4, date: "Aujourd’hui, 10:18", author: "Kendrick Kabeya" },
  { id: 3, reference: "MVT-2403", product: "Souris sans fil", type: "Ajustement", quantity: -2, date: "Hier, 16:04", author: "Junior Muteba" },
  { id: 4, reference: "MVT-2404", product: "Écran 27 pouces", type: "Entrée", quantity: 8, date: "Hier, 14:25", author: "Sarah Mbala" },
  { id: 5, reference: "MVT-2405", product: "Casque Bluetooth", type: "Sortie", quantity: 3, date: "12 juin, 11:30", author: "Kendrick Kabeya" },
];

export const categories = [
  { id: 1, name: "Électronique", description: "Ordinateurs, écrans et équipements", products: 28, value: 48350, color: "bg-indigo-500" },
  { id: 2, name: "Périphériques", description: "Accessoires et périphériques informatiques", products: 42, value: 12480, color: "bg-cyan-500" },
  { id: 3, name: "Audio", description: "Casques, enceintes et microphones", products: 17, value: 8960, color: "bg-amber-500" },
  { id: 4, name: "Mobilier", description: "Bureaux, sièges et rangements", products: 12, value: 15200, color: "bg-emerald-500" },
];

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

export function MetricCard({ label, value, detail, icon: Icon, tone = "indigo" }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "indigo" | "emerald" | "amber" | "rose" }) {
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
          <p className="text-2xl font-black text-slate-900 mt-2 truncate">{value}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{detail}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={18} /></div>
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

export function StatusBadge({ status }: { status: Product["status"] }) {
  const style = status === "Disponible" ? "bg-emerald-50 text-emerald-600" : status === "Stock faible" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600";
  return <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${style}`}>{status}</span>;
}

export function InventoryModal({ title, subtitle, open, onClose, children, footer }: { title: string; subtitle: string; open: boolean; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[2px] p-3 sm:p-6 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-full max-w-xl max-h-[92dvh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" onMouseDown={(event) => event.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div><h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h2><p className="text-[11px] text-slate-400 mt-1">{subtitle}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" title="Fermer"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export const fieldClass = "w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500";
export const primaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap";
export const secondaryButton = "inline-flex items-center justify-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors whitespace-nowrap";
