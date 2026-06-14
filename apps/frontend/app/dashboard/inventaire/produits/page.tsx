"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Box,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download
} from "lucide-react";

// Types simulés pour le front-end
interface Produit {
  id: string;
  nom: string;
  sku: string;
  categorie: string;
  prix: number;
  stock: number;
  seuilAlerte: number;
}

// Données statiques pour le design
const mockProduits: Produit[] = [
  { id: "1", nom: "MacBook Pro M2", sku: "LAP-MBP-001", categorie: "Électronique", prix: 1299.00, stock: 45, seuilAlerte: 10 },
  { id: "2", nom: "Clavier Mécanique RGB", sku: "ACC-KEY-002", categorie: "Périphériques", prix: 89.00, stock: 8, seuilAlerte: 15 },
  { id: "3", nom: "Souris Sans Fil Logic", sku: "ACC-MOU-003", categorie: "Périphériques", prix: 45.00, stock: 0, seuilAlerte: 5 },
  { id: "4", nom: "Écran 27\" 4K", sku: "SCR-27K-004", categorie: "Électronique", prix: 350.00, stock: 12, seuilAlerte: 10 },
  { id: "5", nom: "Câble HDMI 2m", sku: "CBL-HDM-005", categorie: "Accessoires", prix: 12.50, stock: 120, seuilAlerte: 20 },
  { id: "6", nom: "Disque SSD 1To", sku: "STO-SSD-006", categorie: "Stockage", prix: 110.00, stock: 4, seuilAlerte: 10 },
];

export default function GestionProduitsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fonction pour déterminer le statut visuel du stock
  const getStockStatus = (stock: number, seuil: number) => {
    if (stock === 0) {
      return { label: "Rupture", styles: "bg-rose-50 text-rose-600 border-rose-100" };
    }
    if (stock <= seuil) {
      return { label: "Stock Faible", styles: "bg-amber-50 text-amber-600 border-amber-100" };
    }
    return { label: "En Stock", styles: "bg-emerald-50 text-emerald-600 border-emerald-100" };
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      
      {/* EN-TÊTE DE LA PAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Catalogue Produits</h1>
          <p className="text-xs text-slate-400 font-medium">
            Gérez vos références, mettez à jour les prix et surveillez les niveaux de stock.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm w-full sm:w-auto">
            <Download size={14} /> Exporter
          </button>
          <button className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm w-full sm:w-auto">
            <Plus size={14} /> Ajouter un produit
          </button>
        </div>
      </div>

      {/* ZONE DE FILTRES ET RECHERCHE */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, SKU ou catégorie..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold transition-all">
            <Filter size={14} /> Catégories
          </button>
          <button className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold transition-all">
            <Box size={14} /> État du stock
          </button>
        </div>
      </div>

      {/* TABLEAU DES PRODUITS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#fcfdfe] border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">Produit & SKU</th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                    Catégorie <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                    Prix Unitaire <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockProduits.map((produit) => {
                const status = getStockStatus(produit.stock, produit.seuilAlerte);
                
                return (
                  <tr key={produit.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Box size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{produit.nom}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">{produit.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {produit.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900">${produit.prix.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{produit.stock}</span>
                        <span className="text-[10px] text-slate-400">unités</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${status.styles}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-[#fcfdfe]">
          <p className="text-[11px] font-medium text-slate-500">
            Affichage de <span className="font-bold text-slate-900">1</span> à <span className="font-bold text-slate-900">6</span> sur <span className="font-bold text-slate-900">1,245</span> produits
          </p>
          <div className="flex items-center gap-1">
            <button className="p-1 border border-slate-200 rounded-md text-slate-400 hover:bg-slate-50 disabled:opacity-50" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-md">1</button>
            <button className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md">2</button>
            <button className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md">3</button>
            <span className="px-1 text-slate-400">...</span>
            <button className="p-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}