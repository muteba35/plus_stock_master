"use client";

import React from "react";
import { Briefcase, Edit2, Trash2 } from "lucide-react";

interface Department {
  _id: string;
  nom: string;
  description: string;
  employeeCount?: number;
  createdAt: string;
}

interface DeptTableProps {
  departments: Department[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function DeptTable({ departments, onEdit, onDelete }: DeptTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-[500px]">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Département</th>
              <th className="px-6 py-4">Membres</th>
              <th className="px-6 py-4">Date de création</th>
              {(onEdit || onDelete) && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.length > 0 ? (
              departments.map((dept) => {
                // Optimisation : On extrait le compteur pour éviter les répétitions
                const count = dept.employeeCount || 0;

                return (
                  <tr key={dept._id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Nom & Description du département */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-100/50">
                          <Briefcase size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{dept.nom}</span>
                          {dept.description ? (
                            <span className="text-[11px] text-slate-400 font-medium max-w-[250px] truncate" title={dept.description}>
                              {dept.description}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic font-medium">Aucune description</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Nombre de membres */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        count > 0 
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-100/30" 
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {count} {count > 1 ? "collabs." : "collab."}
                      </span>
                    </td>

                    {/* Date de création (Sécurisée contre l'erreur d'hydratation Next.js) */}
                    <td suppressHydrationWarning className="px-6 py-4 text-slate-400 font-medium whitespace-nowrap">
                      {dept.createdAt 
                        ? new Date(dept.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        : "—"
                      }
                    </td>

                    {/* Actions */}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(dept._id)}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 mr-1 rounded-lg transition-all active:scale-95"
                            title="Modifier le pôle d'activité"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => onDelete(dept._id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all active:scale-95"
                            title="Supprimer ce département"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={onEdit || onDelete ? 4 : 3} className="px-6 py-12 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="text-sm font-semibold text-slate-500">Aucun département configuré</span>
                    <p className="text-xs text-slate-400">Cliquez sur Nouveau Département pour commencer.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
