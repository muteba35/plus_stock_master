"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, X, Building, AlertTriangle, FileText, Loader2, CheckCircle2 } from "lucide-react";
import DeptModal from "./components/DeptModal";
import DeptTable from "./components/DeptTable";

interface Department {
  _id: string;
  nom: string;
  description: string;
  employeeCount?: number;
  createdAt: string;
}

// OPTIMISATION ESLINT : Sortir l'URL constante du composant pour éviter de la recréer à chaque rendu
const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/departements` 
  : "http://localhost:5000/api/departements";

export default function DepartementsPage() {
  // 1. ÉTATS DES DONNÉES
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 2. ÉTATS DES PERMISSIONS
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  // Modals d'ouverture
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isEditOpen, setIsEditOpen] = useState(false);   
  const [isDeleteOpen, setIsDeleteOpen] = useState(false); 

  // États pour la modification / suppression active avec gestion des messages
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Fonction pour charger la liste depuis le Back-End (Mémorisée avec useCallback)
  const fetchDepartments = useCallback(async () => {
    setGlobalError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(backendBaseUrl, {
        method: "GET",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        }
      });
      const data = await response.json();
      if (data.status === "success") {
        setDepartments(data.data || []);
      } else {
        setGlobalError(data.message || "Erreur lors de la récupération des pôles.");
      }
    } catch (error) {
      console.error("Erreur de fetch :", error); // Utilisation de la variable 'error'
      setGlobalError("Impossible de se connecter au serveur backend. Vérifiez que votre API est bien lancée sur le port 5000.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Plus d'avertissement ESLint ici

  // Charger les données ET les permissions au démarrage
  useEffect(() => {
    fetchDepartments();
    
    // Récupération sécurisée des permissions stockées au login
    try {
      const storedPermissions = JSON.parse(localStorage.getItem("user_permissions") || "[]");
      setUserPermissions(storedPermissions);
    } catch (error) {
      console.error("Erreur de parsing des permissions :", error); // Utilisation de la variable 'error'
      setUserPermissions([]);
    }
  }, [fetchDepartments]); // Ajout de la dépendance manquante exigée par ESLint

  // 3. VÉRIFICATIONS DYNAMIQUES DES DROITS D'ACCÈS
  const canCreate = userPermissions.includes("CREER_DEPARTEMENT");
  const canEdit = userPermissions.includes("MODIFIER_DEPARTEMENT");
  const canDelete = userPermissions.includes("SUPPRIMER_DEPARTEMENT");

  // Filtrage
  const filteredDepartments = departments.filter((dept) =>
    (dept.nom || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Déclencheur Modification
  const handleEditInit = (id: string) => {
    const target = departments.find((d) => d._id === id);
    if (target) {
      setSelectedDeptId(id);
      setEditNom(target.nom);
      setEditDescription(target.description || "");
      setActionError("");
      setActionSuccess("");
      setIsEditOpen(true);
    }
  };

  // Soumission de la modification (PUT)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId) return;
    setIsActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendBaseUrl}/${selectedDeptId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ nom: editNom, description: editDescription }),
      });
      const data = await response.json();

      if (data.status === "success") {
        setActionSuccess("Département mis à jour avec succès !");
        fetchDepartments();
        setTimeout(() => {
          setIsEditOpen(false);
          setSelectedDeptId(null);
        }, 1500);
      } else {
        setActionError(data.message || "Erreur lors de la mise à jour.");
      }
    } catch (error) {
      console.error("Erreur lors de la modification :", error); // Utilisation de la variable 'error'
      setActionError("Erreur réseau ou serveur inaccessible.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Déclencheur Suppression
  const handleDeleteInit = (id: string) => {
    setSelectedDeptId(id);
    setActionError("");
    setActionSuccess("");
    setIsDeleteOpen(true);
  };

  // Confirmation de la suppression (DELETE)
  const handleConfirmDelete = async () => {
    if (!selectedDeptId) return;
    setIsActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendBaseUrl}/${selectedDeptId}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        }
      });
      const data = await response.json();

      if (data.status === "success") {
        setActionSuccess("Le département a été supprimé.");
        fetchDepartments();
        setTimeout(() => {
          setIsDeleteOpen(false);
          setSelectedDeptId(null);
        }, 1500);
      } else {
        setActionError(data.message || "Erreur de suppression.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression :", error); // Utilisation de la variable 'error'
      setActionError("Erreur réseau ou serveur inaccessible.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion des Départements</h1>
          <p className="text-xs text-slate-400 font-medium">Configurez les pôles d`activité.</p>
        </div>
        
        {/* BOUTON D'AJOUT : Masqué si l'utilisateur n'a pas la permission de créer */}
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
          >
            <Plus size={14} /> Nouveau Département
          </button>
        )}
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text"
          placeholder="Rechercher un département..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white shadow-sm transition-all" 
        />
      </div>

      {/* MESSAGES D'ERREURS SYSTÈME (GLOBAL) */}
      {globalError && (
        <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-semibold animate-in fade-in duration-200">
          {globalError}
        </div>
      )}

      {/* CHARGEMENT / TABLEAU */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <Loader2 className="text-indigo-600 animate-spin mb-2" size={24} />
          <p className="text-xs text-slate-400 font-medium">Récupération des données sécurisées...</p>
        </div>
      ) : (
        <DeptTable 
          departments={filteredDepartments} 
          onEdit={canEdit ? handleEditInit : undefined}
          onDelete={canDelete ? handleDeleteInit : undefined}
        />
      )}

      {/* MODAL CRÉATION (Protégé également pour éviter l'affichage forcé) */}
      {canCreate && (
        <DeptModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchDepartments} />
      )}

      {/* MODAL MODIFICATION */}
      {isEditOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div 
            onClick={() => { if (!isActionLoading && !actionSuccess) setIsEditOpen(false); }} 
            className="absolute inset-0" 
          />
          <div className="relative z-10 bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200/60 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                  <Building size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Modifier le Département</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mettez à jour les informations du pôle.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)} 
                disabled={isActionLoading || !!actionSuccess} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                    {actionError}
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {actionSuccess}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Building size={12} /> Nom du département
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isActionLoading || !!actionSuccess}
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all bg-white text-slate-800 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText size={12} /> Description (Optionnel)
                  </label>
                  <textarea
                    rows={3}
                    disabled={isActionLoading || !!actionSuccess}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Objectifs ou périmètre..."
                    className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white text-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)} 
                  disabled={isActionLoading || !!actionSuccess}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !!actionSuccess}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:bg-indigo-400 shadow-sm"
                >
                  {isActionLoading && <Loader2 size={12} className="animate-spin" />}
                  {actionSuccess ? "Mis à jour !" : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {isDeleteOpen && canDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div 
            onClick={() => { if (!isActionLoading && !actionSuccess) setIsDeleteOpen(false); }} 
            className="absolute inset-0" 
          />
          <div className="relative z-10 bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Confirmer la suppression</h3>
            </div>
            
            {actionError && (
              <div className="p-3 mb-3 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 mb-3 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {actionSuccess}
              </div>
            )}

            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir retirer ce département ? Cette action est irréversible et supprimera le pôle de votre boutique active.
            </p>
            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => setIsDeleteOpen(false)}
                disabled={isActionLoading || !!actionSuccess}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isActionLoading || !!actionSuccess}
                className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isActionLoading && <Loader2 size={12} className="animate-spin" />}
                {actionSuccess ? "Supprimé !" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}