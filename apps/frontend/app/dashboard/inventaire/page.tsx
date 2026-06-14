"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  ArrowRightLeft,
  Tags,
  Plus,
  Activity,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  Boxes
} from "lucide-react";

// Types basés sur ce que renvoie ton backend
interface Produit {
  id: number;
  nom: string;
  sku: string;
  categorie: string;
  prix: number;
  stock: number;
}

interface InventaireData {
  totalProduits: number;
  alertes: number;
  mouvementsAujourdhui: number;
  categoriesActives: number;
  produits: Produit[];
}

interface DistributionItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const distributionColors = [
  "bg-indigo-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
];

// Activités statiques (à remplacer par des données API plus tard)
const activities = [
  { id: "1", user: "Junior Muteba", action: "a ajouté un nouveau produit 'MacBook Pro M2'", time: "Il y a 10 min", type: "success" },
  { id: "2", user: "Sarah Mwamba", action: "a signalé une rupture imminente sur 'Clavier Mécanique'", time: "Il y a 45 min", type: "warning" },
  { id: "3", user: "Alain Mpunga", action: "a réceptionné une livraison de 50 unités (Catégorie: Électronique)", time: "Il y a 2 heures", type: "info" },
];

export default function InventaireVueGlobale() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<InventaireData | null>(null);

  useEffect(() => {
    const fetchInventaire = async () => {
      try {
        // Remplacer par ta vraie route avec le token si besoin
        const response = await fetch(`${API_URL}/inventaire`);
        const result = await response.json();
        
        if (response.ok && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Erreur de chargement de l'inventaire", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventaire();
  }, []);

  // Calcul simulé pour la répartition par catégorie
  const categoriesDistribution: DistributionItem[] = [
    { id: "1", name: "Électronique", count: 850, percentage: 68, color: distributionColors[0] },
    { id: "2", name: "Périphériques", count: 245, percentage: 20, color: distributionColors[1] },
    { id: "3", name: "Accessoires", count: 150, percentage: 12, color: distributionColors[2] },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f9fafd]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Chargement de l'inventaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      
      {/* EN-TÊTE DE LA PAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vue d'ensemble du Stock</h1>
          <p className="text-xs text-slate-400 font-medium">
            Supervisez la valeur, les mouvements et les alertes de votre inventaire en temps réel.
          </p>
        </div>
        <Link
          href="/dashboard/inventaire/produits"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Plus size={14} /> Nouveau Produit
        </Link>
      </div>

      {/* CARTES DE STATISTIQUES (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 : Total Produits */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Produits</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data?.totalProduits || 0}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Références actives</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package size={22} />
          </div>
        </div>

        {/* KPI 2 : Alertes Rupture */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alertes Rupture</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data?.alertes || 0}</h3>
              {data && data.alertes > 0 && (
                <span className="flex h-2 w-2 relative mb-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block">
              Nécessite action
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* KPI 3 : Mouvements */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mouvements J.</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">+{data?.mouvementsAujourdhui || 0}</h3>
            <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Aujourd'hui
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ArrowRightLeft size={22} />
          </div>
        </div>

        {/* KPI 4 : Catégories */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catégories</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{data?.categoriesActives || 0}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Familles de produits</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Tags size={22} />
          </div>
        </div>
      </div>

      {/* BLOCS PRINCIPAUX (RÉPARTITION ET ACTIVITÉS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BLOC RÉPARTITION CATÉGORIES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 bg-[#fcfdfe]">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Répartition par Catégorie</h3>
              <p className="text-[11px] text-slate-400 font-medium">Volume de produits par famille</p>
            </div>

            <div className="p-6 space-y-5">
              {categoriesDistribution.map((item) => (
                <DistributionRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/dashboard/inventaire/categories"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-all"
            >
              Gérer les catégories <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* BLOC JOURNAL OPÉRATIONNEL */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#fcfdfe]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={15} className="text-indigo-600" /> Flux Logistique Récent
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Dernières entrées et sorties de stock</p>
            </div>
            <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Temps Réel
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[310px] overflow-y-auto">
            {activities.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      log.type === "success" ? "bg-emerald-500" : log.type === "warning" ? "bg-rose-500" : "bg-indigo-500"
                    }`}
                  />

                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      <span className="font-bold text-slate-900">{log.user}</span>{" "}
                      {log.action}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock size={11} />
                      <span>{log.time}</span>
                    </div>
                  </div>
                </div>

                <button className="text-slate-300 hover:text-slate-500 transition-colors p-1 self-center">
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour les barres de progression
function DistributionRow({ item }: { item: DistributionItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold gap-3">
        <span className="text-slate-700 font-medium truncate">{item.name}</span>
        <span className="text-slate-900 shrink-0">
          {item.count} ({item.percentage}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`${item.color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${item.percentage}%` }}
        />
      </div>
    </div>
  );
}