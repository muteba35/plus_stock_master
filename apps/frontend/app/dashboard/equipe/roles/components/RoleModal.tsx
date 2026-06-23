"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "../../../components/ModalPortal";
import { X, Shield, FileText, ShieldCheck, Check, ChevronDown, LucideIcon, Loader2, Search, AlertCircle } from "lucide-react";
import { Role } from "../page"; 

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  mode: "create" | "edit" | "view";
  onSave: (name: string, description: string, permissions: string[]) => void;
  apiHeaders: Record<string, string>;
  apiUrl: string;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

// 1. AJOUT DE LA DESCRIPTION DANS L'INTERFACE BACKEND
interface BackendPermission {
  _id: string;
  nom: string;
  code: string;
  module: string;
  description?: string;
}

// 2. AJOUT DE LA DESCRIPTION DANS LE GROUPE DU FRONT
interface GroupedModule {
  module: string;
  permissions: { id: string; label: string; code: string; description?: string }[];
}

export default function RoleModal({ isOpen, onClose, role, mode, onSave, apiHeaders, apiUrl }: RoleModalProps) {
  return (
    <ModalPortal>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <RoleModalContent
            key={role?.id || "new-role"}
            role={role}
            mode={mode}
            onSave={onSave}
            onClose={onClose}
            apiHeaders={apiHeaders}
            apiUrl={apiUrl}
          />
        </div>
      )}
      </AnimatePresence>
    </ModalPortal>
  );
}

function RoleModalContent({ role, mode, onSave, onClose, apiHeaders, apiUrl }: Omit<RoleModalProps, "isOpen">) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [availableModules, setAvailableModules] = useState<GroupedModule[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permSearchTerm, setPermSearchTerm] = useState("");
  
  // ÉTAT DES PERMISSIONS UTILISATEUR LOCALE
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: role && (mode === "edit" || mode === "view") ? role.name : "",
    description: role && (mode === "edit" || mode === "view") ? role.description : "",
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role && (mode === "edit" || mode === "view") ? role.permissions.map((p) => p._id) : []
  );

  // Récupération des permissions du Front-End (RBAC)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user_permissions") || "[]");
      setUserPermissions(stored);
    } catch (error) {
      setUserPermissions([]);
    }
  }, []);

  // Définir si l'utilisateur a le droit de sauvegarder
  const canSave = mode === "create" 
    ? userPermissions.includes("CREER_ROLE") 
    : userPermissions.includes("MODIFIER_ROLE");

  useEffect(() => {
    const fetchAvailablePermissions = async () => {
      try {
        setLoadingPermissions(true);
        const res = await fetch(`${apiUrl}/roles/permissions`, {
          method: "GET",
          headers: apiHeaders
        });
        const data = await res.json();
        
        if (data.success && data.permissions) {
          const grouped = data.permissions.reduce((acc: GroupedModule[], current: BackendPermission) => {
            const moduleName = current.module || "Système";
            const existingGroup = acc.find((g) => g.module === moduleName);
            
            // 3. CAPTURE DE LA DESCRIPTION LORS DU MAPPING
            const permData = { 
              id: current._id, 
              label: current.nom, 
              code: current.code,
              description: current.description 
            };

            if (existingGroup) {
              existingGroup.permissions.push(permData);
            } else {
              acc.push({ module: moduleName, permissions: [permData] });
            }
            return acc;
          }, []);

          setAvailableModules(grouped);
        }
      } catch (error) {
        console.error("Erreur chargement permissions modal:", error);
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchAvailablePermissions();
  }, [apiUrl, apiHeaders]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTogglePermission = (id: string) => {
    if (mode === "view") return; 
    setSelectedPermissions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const allPermissionIds = availableModules.flatMap((group) =>
    group.permissions.map((permission) => permission.id)
  );
  const areAllPermissionsSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((id) => selectedPermissions.includes(id));

  const handleToggleAllPermissions = () => {
    if (mode === "view" || !canSave) return;
    setSelectedPermissions(areAllPermissionsSelected ? [] : allPermissionIds);
  };

  const handleToggleModule = (moduleName: string) => {
    if (mode === "view" || !canSave) return;
    const moduleIds = availableModules.find((group) => group.module === moduleName)?.permissions.map((permission) => permission.id) || [];
    const allSelected = moduleIds.length > 0 && moduleIds.every((id) => selectedPermissions.includes(id));
    setSelectedPermissions((current) => allSelected
      ? current.filter((id) => !moduleIds.includes(id))
      : Array.from(new Set([...current, ...moduleIds]))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || selectedPermissions.length === 0) return;
    onSave(formData.name, formData.description, selectedPermissions);
  };

  const getPermissionLabel = (id: string) => {
    for (const group of availableModules) {
      const match = group.permissions.find(p => p.id === id);
      if (match) return match.label || match.code;
    }
    return id;
  };

  // Filtrage intelligent des permissions
  const filteredModules = availableModules.map((group) => {
    const matchedPermissions = group.permissions.filter(
      (p) =>
        (p.label || '').toLowerCase().includes(permSearchTerm.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(permSearchTerm.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(permSearchTerm.toLowerCase()) ||
        (group.module || '').toLowerCase().includes(permSearchTerm.toLowerCase())
    );
    return { ...group, permissions: matchedPermissions };
  }).filter((group) => group.permissions.length > 0);

  const hasFilteredResults = filteredModules.length > 0;

  const modalTitle = mode === "create" ? "Nouveau Rôle" : mode === "edit" ? "Modifier les Permissions" : "Détails du Rôle";
  const modalSubtitle = mode === "create" ? "Configuration d'un groupe d'autorisations" : mode === "edit" ? "Ajustement de la matrice de sécurité" : "Consultation des droits d'accès affectés";
  const submitButtonText = mode === "create" ? "Créer le rôle" : "Enregistrer les modifications";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col max-h-[95vh]"
    >
      {/* HEADER */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe] shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{modalTitle}</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{modalSubtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* BODY */}
      <div className="overflow-y-auto">
        <form id="role-form" onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Nom du Rôle"
              name="name"
              icon={Shield}
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Manager de Caisse"
              disabled={mode === "view" || !canSave}
              required
            />

            <FormInput
              label="Description"
              name="description"
              icon={FileText}
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Gestion des encaissements"
              disabled={mode === "view" || !canSave}
              required
            />
          </div>

          {/* PERMISSIONS SÉLECTEUR */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck size={12} /> Droits &amp; Permissions d`accès <span className="text-rose-500">*</span>
            </label>

            <div
              onClick={() => !loadingPermissions && setShowPermissions(!showPermissions)}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl cursor-pointer flex justify-between items-center bg-white hover:border-indigo-500 transition-colors"
            >
              <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                {loadingPermissions ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Loader2 size={12} className="animate-spin text-indigo-500" /> Chargement de la matrice...
                  </div>
                ) : selectedPermissions.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium">Aucun droit attribué...</span>
                ) : (
                  selectedPermissions.map((permId) => (
                    <span
                      key={permId}
                      className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1"
                    >
                      {getPermissionLabel(permId)}
                    </span>
                  ))
                )}
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showPermissions ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {showPermissions && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute w-full mt-1.5 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-4 space-y-4 max-h-[400px] overflow-y-auto flex flex-col"
                >
                  <div className="sticky top-0 bg-white pt-1 pb-3 z-10 border-b border-slate-100 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Rechercher par nom, module ou description..." 
                        value={permSearchTerm}
                        onChange={(e) => setPermSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white" 
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAllPermissions}
                      disabled={mode === "view" || !canSave || allPermissionIds.length === 0}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        areAllPermissionsSelected
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-slate-50 border-slate-200 hover:border-indigo-200"
                      } disabled:cursor-default disabled:opacity-60`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          areAllPermissionsSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}>
                          {areAllPermissionsSelected && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Sélectionner toutes les permissions
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        {selectedPermissions.length}/{allPermissionIds.length}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-5 overflow-y-auto flex-1 pr-1">
                    {!hasFilteredResults ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 gap-2">
                        <AlertCircle size={18} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-600">Aucun élément trouvé</span>
                        <p className="text-[10px] text-slate-400 max-w-[280px]">Aucun droit d`accès ne correspond à votre terme de recherche.</p>
                      </div>
                    ) : (
                      filteredModules.map((group) => (
                        <div key={group.module} className="space-y-2.5">
                          <button type="button" disabled={mode === "view" || !canSave} onClick={() => handleToggleModule(group.module)} className="w-full flex items-center justify-between gap-3 border-b border-slate-100 pb-2 disabled:cursor-default">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.module}</span>
                            <span className="flex items-center gap-2 text-[10px] font-bold text-indigo-600"><span className={`w-4 h-4 rounded flex items-center justify-center border ${availableModules.find((item) => item.module === group.module)?.permissions.every((permission) => selectedPermissions.includes(permission.id)) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"}`}>{availableModules.find((item) => item.module === group.module)?.permissions.every((permission) => selectedPermissions.includes(permission.id)) && <Check size={10} strokeWidth={3} />}</span>Tout sélectionner</span>
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.permissions.map((p) => {
                              const isChecked = selectedPermissions.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (mode !== "view" && canSave) {
                                      handleTogglePermission(p.id);
                                    }
                                  }}
                                  className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border select-none transition-all ${
                                    mode === "view" || !canSave ? "cursor-default" : "cursor-pointer hover:bg-slate-50"
                                  } ${
                                    isChecked ? 'bg-indigo-50/60 border-indigo-200' : 'border-slate-100 bg-white'
                                  }`}
                                >
                                  {/* Checkbox Custom */}
                                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                    {isChecked && <Check size={10} strokeWidth={3} />}
                                  </div>
                                  
                                  {/* 4. AFFICHAGE DE LA DESCRIPTION ET DU NOM */}
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`text-xs font-bold ${isChecked ? 'text-indigo-700' : 'text-slate-700'}`}>
                                      {p.label || p.code}
                                    </span>
                                    {p.description ? (
                                      <span className="text-[10px] text-slate-500 font-medium leading-snug">
                                        {p.description}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Aucune description.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {mode !== "view" && selectedPermissions.length === 0 && <p className="text-[10px] font-semibold text-rose-500">Sélectionnez au moins une permission.</p>}
          </div>
        </form>
      </div>

      {/* FOOTER */}
      <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] shrink-0 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {mode === "view" ? "Fermer" : "Annuler"}
        </button>
        
        {mode !== "view" && (
          <button
            type="submit"
            form="role-form"
            disabled={!canSave || selectedPermissions.length === 0}
            className={`px-6 py-2 text-xs font-bold rounded-xl transition-colors shadow-sm ${
              canSave && selectedPermissions.length > 0
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-95" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitButtonText}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Définition du composant FormInput
function FormInput({ label, icon: Icon, ...props }: FormInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label} {props.required && <span className="text-rose-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  );
}
