"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Eye, Edit2, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RoleModal from "./components/RoleModal";

export interface PermissionObj {
  _id: string;
  nom: string;
  code: string;
  module: string;
  description?: string; // Ajout de la description ici
}

export interface Role {
  id: string;
  name: string;
  description: string;
  employeesCount: number;
  permissions: PermissionObj[];
  status: "Actif" | "Suspendu";
}

interface APIRole {
  _id: string;
  nom: string;
  description?: string;
  employeesCount?: number;
  permissions?: PermissionObj[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ÉTAT DES PERMISSIONS LOCALE
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFilterOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Stabilisation de showToast
  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Stabilisation de getAuthHeaders
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    };
  }, []);

  // Stabilisation de fetchRoles avec ses dépendances
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/roles`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success && data.roles) {
        const mappedRoles: Role[] = data.roles.map((r: APIRole) => ({
          id: r._id,
          name: r.nom,
          description: r.description || "Aucune description spécifiée.",
          employeesCount: r.employeesCount || 0,
          status: "Actif",
          permissions: r.permissions || [], 
        }));
        setRoles(mappedRoles);
      } else {
        showToast("error", data.message || "Impossible de charger les rôles.");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des rôles :", error);
      showToast("error", "Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  // Inclusion sécurisée de fetchRoles dans le tableau des dépendances et récupération des permissions
  useEffect(() => {
    fetchRoles();

    // Récupération sécurisée des permissions stockées au login
    try {
      const storedPermissions = JSON.parse(localStorage.getItem("user_permissions") || "[]");
      setUserPermissions(storedPermissions);
    } catch (error) {
      console.error("Erreur de parsing des permissions :", error);
      setUserPermissions([]);
    }
  }, [fetchRoles]);

  // VÉRIFICATIONS DYNAMIQUES DES DROITS D'ACCÈS
  const canCreate = userPermissions.includes("CREER_ROLE");
  const canEdit = userPermissions.includes("MODIFIER_ROLE");
  const canDelete = userPermissions.includes("SUPPRIMER_ROLE");

  const handleDeleteRole = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setRoles(roles.filter((role) => role.id !== id));
        showToast("success", data.message || "Le rôle a été supprimé avec succès.");
        window.dispatchEvent(new Event("userProfileUpdated"));
      } else {
        showToast("error", data.message || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Erreur suppression :", error);
      showToast("error", "Impossible de joindre le serveur backend.");
    }
  };

  const handleSaveRole = async (name: string, description: string, permissionsIds: string[]) => {
    try {
      const payload = {
        nom: name,
        description, 
        permissions: permissionsIds
      };

      let response;
      if (modalMode === "edit" && selectedRole) {
        response = await fetch(`${API_URL}/roles/${selectedRole.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_URL}/roles`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (data.success) {
        showToast("success", data.message || "Configuration enregistrée avec succès !");
        fetchRoles();
        window.dispatchEvent(new Event("userProfileUpdated"));
        setIsModalOpen(false);
      } else {
        showToast("error", data.message || "Une erreur est survenue lors de l'enregistrement.");
      }
    } catch (error) {
      console.error("Erreur sauvegarde rôle :", error);
      showToast("error", "Erreur de connexion réseau.");
    }
  };

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setSelectedRole(role);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleOpenView = (role: Role) => {
    setSelectedRole(role);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const filteredRoles = roles.filter((role) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (role.name || "").toLowerCase().includes(query) ||
      (role.description || "").toLowerCase().includes(query) ||
      role.permissions.some((permission) =>
        `${permission.nom || ""} ${permission.code || ""} ${permission.module || ""}`.toLowerCase().includes(query)
      ) ||
      String(role.employeesCount).includes(searchTerm);
    const matchesStatus = statusFilter === "all" || role.status === statusFilter;
    const matchesUsage =
      usageFilter === "all" ||
      (usageFilter === "used" && role.employeesCount > 0) ||
      (usageFilter === "empty" && role.employeesCount === 0);

    return matchesSearch && matchesStatus && matchesUsage;
  });

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800 relative overflow-hidden">
      
      {/* BANNIÈRE DE NOTIFICATION TOAST SIMPLE ET ÉLÉGANTE */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 right-6 z-[100] max-w-md"
          >
            {toast.type === "success" ? (
              <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {toast.message}
              </div>
            ) : (
              <div className="p-3 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2 shadow-sm">
                <XCircle size={14} className="text-rose-500" />
                {toast.message}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion des Rôles &amp; Autorisations</h1>
          <p className="text-xs text-slate-400 font-medium">Définissez la matrice de sécurité d`accès aux modules.</p>
        </div>
        
        {/* BOUTON DE CRÉATION PROTÉGÉ */}
        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
          >
            <Plus size={14} /> Créer un rôle
          </button>
        )}
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div ref={filterMenuRef} className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher un role, une permission ou un module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white" 
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
              isFilterOpen ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500 hover:text-indigo-600"
            }`}
            title="Filtres"
          >
            <SlidersHorizontal size={16} />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute right-4 top-full mt-2 z-50 w-[min(calc(100vw-4rem),360px)] origin-top-right rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 ring-1 ring-slate-900/5"
              >
                <div className="grid grid-cols-1 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Statut</span>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les statuts</option>
                      <option value="Actif">Actifs</option>
                      <option value="Suspendu">Suspendus</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Utilisateurs</span>
                    <select value={usageFilter} onChange={(e) => { setUsageFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les roles</option>
                      <option value="used">Avec utilisateurs</option>
                      <option value="empty">Sans utilisateur</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-400">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <span className="text-xs font-medium">Connexion à StockMaster en cours...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Permissions</th>
                  <th className="px-6 py-4">Utilisateurs</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto"
                      >
                        <div className="p-3 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                          <AlertCircle size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Aucun élément trouvé</p>
                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                          Aucun rôle ne correspond aux critères entrés dans la barre de recherche principale. Re-vérifiez l`orthographe.
                        </p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const isAdmin = role.name.toLowerCase() === "admin général" || role.name.toLowerCase() === "superadmin";

                    return (
                      <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                              {role.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900">{role.name}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                          {role.description}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 max-w-xs overflow-hidden">
                            {role.permissions.slice(0, 2).map((p) => (
                              <span 
                                key={p._id} 
                                title={p.description || p.nom || p.code} // Ajout du Tooltip ici !
                                className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-help"
                              >
                                {p.nom || p.code}
                              </span>
                            ))}
                            {role.permissions.length > 2 && (
                              <span className="text-slate-400 text-[10px] font-bold pl-0.5 whitespace-nowrap">
                                +{role.permissions.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-bold">
                            {role.employeesCount} {role.employeesCount > 1 ? "Employés" : "Employé"}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-md font-bold ${
                            role.status === "Actif" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {role.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* LE BOUTON CONSULTER RESTE TOUJOURS VISIBLE */}
                            <button 
                              onClick={() => handleOpenView(role)}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 transition-colors"
                              title="Consulter"
                            >
                              <Eye size={15} />
                            </button>

                            {/* BOUTON MODIFIER PROTÉGÉ */}
                            {canEdit && (
                              <button 
                                onClick={() => handleOpenEdit(role)}
                                disabled={isAdmin}
                                className={`p-1.5 transition-colors ${
                                  isAdmin ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-amber-600"
                                }`}
                                title="Modifier"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}

                            {/* BOUTON SUPPRIMER PROTÉGÉ */}
                            {canDelete && (
                              <button 
                                onClick={() => {
                                  if(confirm(`Supprimer définitivement le rôle "${role.name}" ?`)) {
                                    handleDeleteRole(role.id);
                                  }
                                }}
                                disabled={isAdmin}
                                className={`p-1.5 transition-colors ${
                                  isAdmin ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-rose-600"
                                }`}
                                title="Supprimer"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={selectedRole}
        mode={modalMode}
        onSave={handleSaveRole}
        apiHeaders={getAuthHeaders()}
        apiUrl={API_URL}
      />
    </div>
  );
}
