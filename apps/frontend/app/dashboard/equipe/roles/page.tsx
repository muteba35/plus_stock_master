"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Eye, Edit2, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle, SlidersHorizontal, AlertTriangle, FileSpreadsheet, Download, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RoleModal from "./components/RoleModal";
import TeamPagination from "../TeamPagination";
import TeamCsvImportModal, { type TeamCsvRow } from "../TeamCsvImportModal";
import ModalPortal from "../../components/ModalPortal";
import { exportXlsxWorkbook } from "../../components/export-xlsx";
import { exportPdfTable } from "../../components/export-pdf";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

export default function RolesPage() {
  const { ui: du } = useDashboardLanguage();
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
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
      setDeleting(true);
      const response = await fetch(`${API_URL}/roles/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setRoles(roles.filter((role) => role.id !== id));
        showToast("success", data.message || "Le rôle a été supprimé avec succès.");
        window.dispatchEvent(new Event("userProfileUpdated"));
        setRoleToDelete(null);
      } else {
        showToast("error", data.message || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Erreur suppression :", error);
      showToast("error", "Impossible de joindre le serveur backend.");
    } finally { setDeleting(false); }
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

  const importRoles = async (rows: TeamCsvRow[]) => {
    const permissionsResponse = await fetch(`${API_URL}/roles/permissions`, { headers: getAuthHeaders() });
    const permissionsData = await permissionsResponse.json();
    if (!permissionsResponse.ok || !permissionsData.success) throw new Error(permissionsData.message || "Impossible de charger les permissions.");
    const available = (permissionsData.permissions || []) as PermissionObj[];
    for (const row of rows) {
      const codes = row.permissions.split("|").map((code) => code.trim().toLowerCase()).filter(Boolean);
      const permissionIds = codes.map((code) => available.find((permission) => (permission.nom || permission.code || "").toLowerCase() === code)?._id).filter(Boolean) as string[];
      if (permissionIds.length !== codes.length) throw new Error(`Ligne ${row.line} : une permission est inconnue. Utilisez les codes exacts séparés par |.`);
      const response = await fetch(`${API_URL}/roles`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ nom: row.nom, description: row.description, permissions: permissionIds }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(`Ligne ${row.line} : ${data.message || "Import impossible."}`);
    }
    await fetchRoles();
    showToast("success", `${rows.length} rôle(s) importé(s).`);
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
  const exportColumns = ["Role", "Description", "Permissions", "Utilisateurs", "Statut"];
  const exportRows = filteredRoles.map((role) => [role.name, role.description, role.permissions.map((p) => p.nom || p.code).join(" | "), role.employeesCount, role.status]);
  const exportRolesXlsx = () => exportXlsxWorkbook("roles.xlsx", [{ name: "Roles", columns: exportColumns, rows: exportRows }]);
  const exportRolesPdf = () => exportPdfTable("Roles", exportColumns, exportRows);

  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredRoles.length / pageSize)));
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                {du(toast.message)}
              </div>
            ) : (
              <div className="p-3 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2 shadow-sm">
                <XCircle size={14} className="text-rose-500" />
                {du(toast.message)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{du("m97ada5dc4b8c")}</h1>
          <p className="text-xs text-slate-400 font-medium">{du("mff49713776ae")}</p>
        </div>
        
        {/* BOUTON DE CRÉATION PROTÉGÉ */}
        {canCreate && <div className="flex flex-wrap justify-end gap-2"><button onClick={exportRolesPdf} className="flex items-center gap-2 border border-slate-200 bg-white hover:border-indigo-300 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl"><FileText size={14} /> {du("m1d393b0081b6")}</button><button onClick={exportRolesXlsx} className="flex items-center gap-2 border border-slate-200 bg-white hover:border-indigo-300 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl"><Download size={14} /> {du("m48d53635551c")}</button><button onClick={() => setIsImportOpen(true)} className="flex items-center gap-2 border border-slate-200 bg-white hover:border-indigo-300 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl"><FileSpreadsheet size={14} /> {du("m9f7aa20c451d")}</button><button onClick={handleOpenCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"><Plus size={14} /> {du("me8723e90b0b9")}</button></div>}
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div ref={filterMenuRef} className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder={du("m093670afc7b4")}
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
            title={du("m6e2287796c72")}
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
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{du("mdee377cfd8cd")}</span>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">{du("md2bbf4fe69be")}</option>
                      <option value="Actif">{du("m9eaa2a1e77de")}</option>
                      <option value="Suspendu">{du("m2f81bc24f1eb")}</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{du("m23d3938b5ef0")}</span>
                    <select value={usageFilter} onChange={(e) => { setUsageFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">{du("m7819b9a2f6c7")}</option>
                      <option value="used">{du("m570d597373d0")}</option>
                      <option value="empty">{du("mf02d976ae0bd")}</option>
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
              <span className="text-xs font-medium">{du("m64f6c3c2a813")}</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{du("ma1fc967c5587")}</th>
                  <th className="px-6 py-4">{du("m526e0087cc3f")}</th>
                  <th className="px-6 py-4">{du("mabccc78cc93c")}</th>
                  <th className="px-6 py-4">{du("m23d3938b5ef0")}</th>
                  <th className="px-6 py-4">{du("mdee377cfd8cd")}</th>
                  <th className="px-6 py-4 text-right">{du("mff8059dc6752")}</th>
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
                        <p className="text-xs font-bold text-slate-700">{du("m739c6b4172c9")}</p>
                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                          {du("m5e4fcb497e4a")}{" "}</p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => {
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
                                title={du(p.description || p.nom || p.code)}
                                className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap cursor-help"
                              >
                                {du(p.nom || p.code)}
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
                            {role.employeesCount} {role.employeesCount > 1 ? du("m909bcc421d54") : du("m6a60387e44a3")}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-md font-bold ${
                            role.status === "Actif" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {du(role.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* LE BOUTON CONSULTER RESTE TOUJOURS VISIBLE */}
                            <button 
                              onClick={() => handleOpenView(role)}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 transition-colors"
                              title={du("m2cf9926224a3")}
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
                                title={du("m42e37604b638")}
                              >
                                <Edit2 size={15} />
                              </button>
                            )}

                            {/* BOUTON SUPPRIMER PROTÉGÉ */}
                            {canDelete && (
                              <button 
                                onClick={() => setRoleToDelete(role)}
                                disabled={isAdmin}
                                className={`p-1.5 transition-colors ${
                                  isAdmin ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-rose-600"
                                }`}
                                title={du("m5e5d0216ce0b")}
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
        <TeamPagination page={currentPage} totalItems={filteredRoles.length} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <ModalPortal>
      <AnimatePresence>
        {roleToDelete && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"><motion.button type="button" aria-label={du("m711e5f2e198d")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setRoleToDelete(null)} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" /><motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"><div className="p-5 border-b border-slate-100 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle size={19} /></div><div><h3 className="text-sm font-bold text-slate-900">{du("m12e4dee05980")}</h3><p className="text-[11px] text-slate-400 mt-0.5">{du("mad52a732c8a2")}</p></div></div><div className="p-5 text-xs text-slate-600 leading-relaxed">{du("mcade0bc66328")}{" "}<strong className="text-slate-900">{roleToDelete.name}</strong> {du("mf5cca358b212")}</div><div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={() => setRoleToDelete(null)} className="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-200">{du("m46ad3916f6a0")}</button><button type="button" disabled={deleting} onClick={() => void handleDeleteRole(roleToDelete.id)} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-2 disabled:opacity-50">{deleting && <Loader2 size={14} className="animate-spin" />} {du("m5e5d0216ce0b")}</button></div></motion.div></div>}
      </AnimatePresence>
      </ModalPortal>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={selectedRole}
        mode={modalMode}
        onSave={handleSaveRole}
        apiHeaders={getAuthHeaders()}
        apiUrl={API_URL}
      />
      <TeamCsvImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} title={du("m3efe0ac9d7d3")} columns={[{ key: "nom", label: "nom", required: true }, { key: "description", label: "description", required: true }, { key: "permissions", label: "permissions", required: true }]} example={{ nom: "Gestionnaire stock", description: "Gère les produits et mouvements", permissions: "VOIR_LISTE_PRODUITS|CREER_ENTREE_STOCK" }} onImport={importRoles} />
    </div>
  );
}


