"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserCheck, 
  Shield, 
  Activity, 
  ArrowUpRight, 
  UserPlus, 
  Clock,
  ChevronRight
} from "lucide-react";

// Interfaces pour typer proprement nos données statiques (prêtes pour le backend)
interface TeamStats {
  totalEmployees: number;
  activeNow: number;
  totalRoles: number;
}

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  action: string;
  time: string;
  type: "success" | "info" | "warning";
}

interface RoleDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export default function TeamOverviewPage() {
  const [isLoading, setIsLoading] = useState(false);

  // DONNÉES STATIQUES (Simulations des futurs retours API)
  const stats: TeamStats = {
    totalEmployees: 12,
    activeNow: 4,
    totalRoles: 3
  };

  const distributions: RoleDistribution[] = [
    { name: "Caissier / Vendeur", count: 6, percentage: 50, color: "bg-indigo-600" },
    { name: "Gestionnaire de Stock", count: 4, percentage: 33.3, color: "bg-emerald-500" },
    { name: "Comptable & Finance", count: 2, percentage: 16.7, color: "bg-amber-500" },
  ];

  const activities: ActivityLog[] = [
    {
      id: "1",
      user: "Jean-Marc Kabeya",
      role: "Caissier",
      action: "a clôturé la caisse principale avec un écart de 0 FC",
      time: "Il y a 10 min",
      type: "success"
    },
    {
      id: "2",
      user: "Sarah Mwamba",
      role: "Gestionnaire",
      action: "a ajusté le stock du produit 'Huile de table 5L' (+20 unités)",
      time: "Il y a 45 min",
      type: "info"
    },
    {
      id: "3",
      user: "Junior Muteba",
      role: "Propriétaire",
      action: "a modifié les permissions du rôle 'Gestionnaire de Stock'",
      time: "Il y a 2 heures",
      type: "warning"
    },
    {
      id: "4",
      user: "Alain Mpunga",
      role: "Caissier",
      action: "a imprimé la facture globale pour la commande #24098",
      time: "Il y a 3 heures",
      type: "success"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f9fafd]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Chargement de la vue d'ensemble...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      
      {/* EN-TÊTE DE LA PAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vue d'ensemble de l'Équipe</h1>
          <p className="text-xs text-slate-400 font-medium">
            Supervisez les performances, la répartition et les activités récentes de votre personnel.
          </p>
        </div>
        <button 
          type="button"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={14} /> Ajouter un employé
        </button>
      </div>

      {/* SECTION 1 : CARTES DE STATISTIQUES (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* CARTE 1 : TOTAL PERSONNEL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Effectif Total</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalEmployees}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Employés enregistrés</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users size={22} />
          </div>
        </div>

        {/* CARTE 2 : ACTIFS ACTUELLEMENT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actifs en Caisse</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.activeNow}</h3>
              <span className="flex h-2 w-2 relative mb-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Connectés en ce moment
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={22} />
          </div>
        </div>

        {/* CARTE 3 : RÔLES CONFIGURÉS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Structures d'Accès</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalRoles}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Rôles personnalisés actifs</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Shield size={22} />
          </div>
        </div>

      </div>

      {/* BLOCS PRINCIPAUX (RÉPARTITION ET ACTIVITÉS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE : RÉPARTITION DES RÔLES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 bg-[#fcfdfe]">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Répartition par Métier</h3>
              <p className="text-[11px] text-slate-400 font-medium">Structure du personnel par rôle</p>
            </div>
            
            <div className="p-6 space-y-5">
              {distributions.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 font-medium">{item.name}</span>
                    <span className="text-slate-900">{item.count} ({item.percentage}%)</span>
                  </div>
                  {/* Barre de progression codée à la main */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-all">
              Ajuster la matrice des rôles <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* COLONNE DROITE : JOURNAL D'ACTIVITÉS (Prend 2 colonnes sur grand écran) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#fcfdfe]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={15} className="text-indigo-600" /> Journal Opérationnel
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Historique en temps réel des actions de l'équipe</p>
            </div>
            <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Aujourd'hui
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[310px] overflow-y-auto">
            {activities.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Point de couleur dynamique indiquant le type d'activité */}
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    log.type === "success" ? "bg-emerald-500" : log.type === "warning" ? "bg-amber-500" : "bg-indigo-500"
                  }`} />
                  
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      <span className="font-bold text-slate-900">{log.user}</span>{" "}
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded uppercase tracking-wide mr-1.5">
                        {log.role}
                      </span>
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