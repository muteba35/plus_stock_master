"use client";
import React from "react";

export default function DashboardPage() {
  // Données fictives pour la structure visuelle avant connexion à l'API
  const stats = [
    { title: "Chiffre d'Affaires", value: "0,00 $", icon: "💰", color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Ventes Réalisées", value: "0", icon: "🛒", color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Articles en Stock", value: "0", icon: "📦", color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Alertes Rupture", value: "0", icon: "🚨", color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Message de Bienvenue */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Ravi de vous revoir ! 👋</h1>
        <p className="text-sm text-slate-500 mt-1">Voici l'état actuel de votre activité pour aujourd'hui.</p>
      </div>

      {/* Grille des Cartes de Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.title}</p>
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center text-xl shadow-inner`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Grille Principale (Graphiques & Activités Récentes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Zone Graphique Évolution (Prend 2 colonnes) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px] flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Évolution des ventes</h3>
            <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-medium">7 derniers jours</span>
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
            Le graphique s'affichera dès vos premières ventes enregistrées.
          </div>
        </div>

        {/* Zone Dernières Ventes / Alertes (Prend 1 colonne) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px] flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Activités récentes</h3>
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic text-center p-4">
            Aucune opération récente sur cette boutique.
          </div>
        </div>
      </div>
    </div>
  );
}