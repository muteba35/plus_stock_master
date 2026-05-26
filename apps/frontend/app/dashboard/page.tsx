"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Coins
} from "lucide-react";

// Importation des composants graphiques Recharts
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar 
} from "recharts";

// Données fictives pour les graphiques (Inspirées du look Falcon)
const salesData = [
  { name: "Lun", ventes: 120000, benefices: 45000 },
  { name: "Mar", ventes: 185000, benefices: 72000 },
  { name: "Mer", ventes: 150000, benefices: 50000 },
  { name: "Jeu", ventes: 240000, benefices: 95000 },
  { name: "Ven", ventes: 290000, benefices: 115000 },
  { name: "Sam", ventes: 350000, benefices: 140000 },
  { name: "Dim", ventes: 210000, benefices: 80000 },
];

const topProducts = [
  { name: "Ciment CPJ45", stock: 120 },
  { name: "Fer à béton 12mm", stock: 45 },
  { name: "Tôle Ondulée G28", stock: 18 },
  { name: "Peinture Vinyle 20L", stock: 85 },
];

// Liste de l'équipe / Membres actifs de la boutique
const activeUsers = [
  { name: "Junior Muteba", role: "Propriétaire", status: "online", email: "junior@boutique.cd" },
  { name: "Emma Watson", role: "Gérant Principal", status: "online", email: "emma.w@boutique.cd" },
  { name: "Antony Hopkins", role: "Caissier Jour", status: "offline", email: "antony.h@boutique.cd" },
  { name: "Anna Karinina", role: "Gestionnaire Stock", status: "online", email: "anna.k@boutique.cd" },
  { name: "John Lee", role: "Caissier Soir", status: "offline", email: "john.l@boutique.cd" },
];

// Dernières ventes rattachées au gérant/caissier qui a validé l'opération
const recentSales = [
  { id: "TX-1042", gerant: "Emma Watson", methode: "Espèces", montant: "145 000 FC", statut: "Complété", date: "Il y a 5 min" },
  { id: "TX-1041", gerant: "Junior Muteba", methode: "Mobile Money", montant: "85 000 FC", statut: "Complété", date: "Il y a 12 min" },
  { id: "TX-1040", gerant: "Antony Hopkins", methode: "Espèces", montant: "12 500 FC", statut: "Remboursé", date: "Il y a 45 min" },
  { id: "TX-1039", gerant: "Emma Watson", methode: "Virement", montant: "1 250 000 FC", statut: "En attente", date: "Il y a 1 heure" },
];

export default function OverviewPage() {
  const [timeRange, setTimeRange] = useState("7");

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen">
      
      {/* HEADER DE LA PAGE VUE D'ENSEMBLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tableau de bord</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Performances globales et monitoring de l`équipe commerciale.
          </p>
        </div>
        
        {/* Filtres de temps style Falcon */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f9fafd] border border-slate-200 rounded-xl p-1">
            <button 
              onClick={() => setTimeRange("7")}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${timeRange === "7" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              7 Jours
            </button>
            <button 
              onClick={() => setTimeRange("30")}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${timeRange === "30" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Mois
            </button>
          </div>
          <button className="p-2.5 bg-[#f9fafd] border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ZONE DES STATS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1 : CHIFFRE D'AFFAIRES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chiffre d`affaires</span>
              <h3 className="text-xl font-black text-slate-900">1 545 000 FC</h3>
            </div>
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/10">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <ArrowUpRight size={12} className="mr-0.5" /> +12.5%
            </span>
            <span className="text-[10px] font-medium text-slate-400">vs semaine dernière</span>
          </div>
        </div>

        {/* CARD 2 : COMPTEUR DE VENTES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ventes réalisées</span>
              <h3 className="text-xl font-black text-slate-900">142 Paniers</h3>
            </div>
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/10">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <ArrowUpRight size={12} className="mr-0.5" /> +8.2%
            </span>
            <span className="text-[10px] font-medium text-slate-400">depuis hier</span>
          </div>
        </div>

        {/* CARD 3 : VALEUR STOCK */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume Stock</span>
              <h3 className="text-xl font-black text-slate-900">3 840 Réf.</h3>
            </div>
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/10">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
              <ArrowDownRight size={12} className="mr-0.5" /> -2.4%
            </span>
            <span className="text-[10px] font-medium text-slate-400">42 articles alertes</span>
          </div>
        </div>

        {/* CARD 4 : BÉNÉFICES NETS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marge Bénéficiaire</span>
              <h3 className="text-xl font-black text-slate-900">597 000 FC</h3>
            </div>
            <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 border border-violet-500/10">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              <ArrowUpRight size={12} className="mr-0.5" /> +14.1%
            </span>
            <span className="text-[10px] font-medium text-slate-400">Stable à 38%</span>
          </div>
        </div>

      </div>

      {/* GRAPHIQUES DE PERFORMANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPHIQUE PRINCIPAL AREA CHART */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Analyse des flux financiers</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Évolution comparative ventes vs bénéfices</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wide">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span className="text-slate-600">Ventes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
                <span className="text-slate-600">Bénéfices</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBenefs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" />
                <YAxis axisLine={false} tickLine={false} stroke="#94A3B8" />
                <Tooltip />
                <Area type="monotone" dataKey="ventes" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorVentes)" />
                <Area type="monotone" dataKey="benefices" stroke="#2DD4BF" strokeWidth={2} fillOpacity={1} fill="url(#colorBenefs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MOUVEMENTS DE STOCK */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Mouvements de Stock</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-6">Articles à surveiller prioritairement</p>
            
            <div className="space-y-4">
              {topProducts.map((prod) => (
                <div key={prod.name} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Quantité restante</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    prod.stock < 20 
                      ? "text-rose-500 bg-rose-500/10" 
                      : prod.stock < 50 
                      ? "text-amber-500 bg-amber-500/10" 
                      : "text-indigo-500 bg-indigo-500/10"
                  }`}>
                    {prod.stock} Pcs
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-24 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <Bar dataKey="stock" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECTION MIXTE : VENTES DE CAISSE ET MEMBRES ACTIFS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABLEAU DES DERNIÈRES OPÉRATIONS (Prend 2/3 de l'espace) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Activité de caisse récente</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Traces des encaissements par opérateur de vente</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9fafd] text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-6">ID Vente</th>
                    <th className="py-3 px-6">Gérant d`Achat</th>
                    <th className="py-3 px-6">Règlement</th>
                    <th className="py-3 px-6">Montant total</th>
                    <th className="py-3 px-6 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentSales.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#f9fafd]/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-400">{tx.id}</td>
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{tx.gerant}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                          {tx.methode === "Espèces" ? <Coins size={13} className="text-amber-500" /> : <CreditCard size={13} className="text-indigo-400" />}
                          {tx.methode}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900">{tx.montant}</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          tx.statut === "Complété" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : tx.statut === "En attente"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {tx.statut === "Complété" && <CheckCircle2 size={12} />}
                          {tx.statut === "En attente" && <AlertTriangle size={12} />}
                          {tx.statut === "Remboursé" && <XCircle size={12} />}
                          {tx.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION COMPOSANTE : MEMBRES DE LA BOUTIQUE (Prend 1/3 de l'espace) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Équipe Active</h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                {activeUsers.filter(u => u.status === "online").length} En ligne
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeUsers.map((user) => (
                <div key={user.email} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {/* Indicateur de statut en point d'ancrage */}
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-200">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        user.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                    </div>
                  </div>

                  {/* Badge de rôle style Falcon */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    user.role === "Propriétaire" || user.role === "Gérant Principal"
                      ? "text-indigo-600 bg-indigo-500/10"
                      : "text-slate-600 bg-slate-100"
                  }`}>
                    {user.role === "Propriétaire" ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}