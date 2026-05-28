"use client";

import React, { useState } from "react";
import { UserPlus, Search, MoreVertical, Edit2, KeyRound, Power, User } from "lucide-react";
import EmployeModal from "./components/EmployeModal";

// Données statiques pour le prototype
const MOCK_EMPLOYES = [
  { id: "1", firstName: "Jean-Marc", lastName: "Kabeya", email: "jm.kabeya@shop.com", phone: "0812345678", role: "Caissier", status: "Actif" },
  { id: "2", firstName: "Sarah", lastName: "Mwamba", email: "s.mwamba@shop.com", phone: "0823456789", role: "Gestionnaire", status: "Suspendu" },
];

export default function EmployesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Annuaire du Personnel</h1>
          <p className="text-xs text-slate-400 font-medium">Gérez les accès et le statut de vos collaborateurs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={14} /> Nouvel Employé
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input placeholder="Rechercher un employé..." className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Employé</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Rôle</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_EMPLOYES.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <span className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">{emp.email}<br/><span className="text-[10px]">{emp.phone}</span></td>
                <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-bold">{emp.role}</span></td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md font-bold ${emp.status === 'Actif' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={16} /></button>
                  <button className="text-slate-400 hover:text-amber-600 p-1"><KeyRound size={16} /></button>
                  <button className="text-slate-400 hover:text-rose-600 p-1"><Power size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EmployeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}