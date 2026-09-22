"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../../src/components/LanguageRuntime";


import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "../../../components/ModalPortal";
import { X, Shield, FileText, ShieldCheck, Check, ChevronDown, LucideIcon, Loader2, Search, AlertCircle, Layers3 } from "lucide-react";
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

interface BackendPermission {
  _id: string;
  nom: string;
  code: string;
  module: string;
  description?: string;
}

interface PermissionItem {
  id: string;
  label: string;
  code: string;
  description?: string;
}

interface GroupedModule {
  module: string;
  permissions: PermissionItem[];
}

export default function RoleModal({ isOpen, onClose, role, mode, onSave, apiHeaders, apiUrl }: RoleModalProps) {
  const { ui: du } = useDashboardLanguage();
  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
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
  const { ui: du } = useDashboardLanguage();
  const [showPermissions, setShowPermissions] = useState(mode !== "view");
  const [availableModules, setAvailableModules] = useState<GroupedModule[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permSearchTerm, setPermSearchTerm] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: role && (mode === "edit" || mode === "view") ? role.name : "",
    description: role && (mode === "edit" || mode === "view") ? role.description : "",
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role && (mode === "edit" || mode === "view") ? role.permissions.map((p) => p._id) : []
  );

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user_permissions") || "[]");
      setUserPermissions(stored);
    } catch {
      setUserPermissions([]);
    }
  }, []);

  const canSave = mode === "create"
    ? userPermissions.includes("CREER_ROLE")
    : userPermissions.includes("MODIFIER_ROLE");

  useEffect(() => {
    const fetchAvailablePermissions = async () => {
      try {
        setLoadingPermissions(true);
        const res = await fetch(`${apiUrl}/roles/permissions`, { method: "GET", headers: apiHeaders });
        const data = await res.json();

        if (data.success && data.permissions) {
          const grouped = data.permissions.reduce((acc: GroupedModule[], current: BackendPermission) => {
            const moduleName = current.module || "Système";
            const existingGroup = acc.find((g) => g.module === moduleName);
            const permData: PermissionItem = {
              id: current._id,
              label: current.nom,
              code: current.code,
              description: current.description,
            };

            if (existingGroup) existingGroup.permissions.push(permData);
            else acc.push({ module: moduleName, permissions: [permData] });
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

  const allPermissionIds = useMemo(
    () => availableModules.flatMap((group) => group.permissions.map((permission) => permission.id)),
    [availableModules]
  );

  const selectedPermissionDetails = useMemo(() => {
    const selected = new Set(selectedPermissions);
    return availableModules
      .map((group) => ({ ...group, permissions: group.permissions.filter((permission) => selected.has(permission.id)) }))
      .filter((group) => group.permissions.length > 0);
  }, [availableModules, selectedPermissions]);

  const filteredModules = useMemo(() => {
    const query = permSearchTerm.toLowerCase().trim();
    return availableModules
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((p) =>
          !query ||
          du(p.label || "").toLowerCase().includes(query) ||
          (p.code || "").toLowerCase().includes(query) ||
          du(p.description || "").toLowerCase().includes(query) ||
          du(group.module || "").toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [availableModules, permSearchTerm, du]);

  const areAllPermissionsSelected = allPermissionIds.length > 0 && allPermissionIds.every((id) => selectedPermissions.includes(id));

  const modalTitle = mode === "create" ? "Nouveau rôle" : mode === "edit" ? "Modifier le rôle" : "Détails du rôle";
  const modalSubtitle = mode === "create"
    ? "Configurez un groupe d'autorisations clair et réutilisable."
    : mode === "edit"
      ? "Ajustez les informations et les permissions attribuées."
      : "Consultez les informations du rôle et toute sa matrice de permissions.";
  const submitButtonText = mode === "create" ? "Créer le rôle" : "Enregistrer les modifications";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTogglePermission = (id: string) => {
    if (mode === "view") return;
    setSelectedPermissions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

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
      const match = group.permissions.find((p) => p.id === id);
      if (match) return match.label || match.code;
    }
    return id;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={du(modalTitle)}
      className="relative z-10 w-full max-w-5xl bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
    >
      <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-start bg-[#fcfdfe] shrink-0">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">{du(modalTitle)}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{du(modalSubtitle)}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto">
        <form id="role-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-6">
            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <FileText size={13} /> {du("m815cc5db9ee8")}{" "}</div>
                <FormInput
                  label={du("m07ddf0695e68")}
                  name="name"
                  icon={Shield}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={du("mcb3964e9f497")}
                  disabled={mode === "view" || !canSave}
                  required
                />
                <FormInput
                  label={du("m526e0087cc3f")}
                  name="description"
                  icon={FileText}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={du("m958f1b2bea53")}
                  disabled={mode === "view" || !canSave}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{du("mabccc78cc93c")}</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{selectedPermissions.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m76c86c4c3243")}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{selectedPermissionDetails.length}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck size={12} /> {du("me5912c77e7a1")}{" "}<span className="text-rose-500">*</span>
                </label>
                {mode !== "view" && (
                  <button type="button" onClick={() => setShowPermissions((value) => !value)} className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    {showPermissions ? du("m2896a21cf475") : du("me5adbe81e8aa")} <ChevronDown size={13} className={showPermissions ? "rotate-180" : ""} />
                  </button>
                )}
              </div>

              {mode === "view" ? (
                <PermissionViewer loading={loadingPermissions} groups={selectedPermissionDetails} />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div
                    onClick={() => !loadingPermissions && setShowPermissions(!showPermissions)}
                    className="min-h-[48px] px-4 py-3 cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                      {loadingPermissions ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <Loader2 size={12} className="animate-spin text-indigo-500" /> {du("m80404b7dca36")}{" "}</div>
                      ) : selectedPermissions.length === 0 ? (
                        <span className="text-xs text-slate-400 font-medium">{du("mf6caed7cb592")}</span>
                      ) : (
                        selectedPermissions.slice(0, 5).map((permId) => (
                          <span key={permId} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-100">
                            {du(getPermissionLabel(permId))}
                          </span>
                        ))
                      )}
                      {selectedPermissions.length > 5 && <span className="text-[10px] font-black text-slate-400 px-2 py-1">+{selectedPermissions.length - 5}</span>}
                    </div>
                    <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${showPermissions ? "rotate-180" : ""}`} />
                  </div>

                  <AnimatePresence initial={false}>
                    {showPermissions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="border-t border-slate-100 overflow-hidden"
                      >
                        <div className="p-4 space-y-4 max-h-[52vh] overflow-y-auto">
                          <div className="sticky top-0 bg-white pt-1 pb-3 z-10 border-b border-slate-100 space-y-2.5">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input
                                type="text"
                                placeholder={du("m1765e298f73a")}
                                value={permSearchTerm}
                                onChange={(e) => setPermSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleToggleAllPermissions}
                              disabled={!canSave || allPermissionIds.length === 0}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${areAllPermissionsSelected ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200 hover:border-indigo-200"} disabled:cursor-default disabled:opacity-60`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <CheckBox checked={areAllPermissionsSelected} />
                                <span className="text-xs font-bold text-slate-700">{du("m28ac791b0d52")}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{selectedPermissions.length}/{allPermissionIds.length}</span>
                            </button>
                          </div>

                          {filteredModules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-2">
                              <AlertCircle size={18} className="text-slate-300" />
                              <span className="text-xs font-bold text-slate-600">{du("m739c6b4172c9")}</span>
                              <p className="text-[10px] text-slate-400 max-w-[280px]">{du("mf44a85003683")}</p>
                            </div>
                          ) : (
                            filteredModules.map((group) => {
                              const moduleIds = availableModules.find((item) => item.module === group.module)?.permissions.map((permission) => permission.id) || [];
                              const moduleChecked = moduleIds.length > 0 && moduleIds.every((id) => selectedPermissions.includes(id));
                              return (
                                <div key={group.module} className="space-y-2.5">
                                  <button type="button" disabled={!canSave} onClick={() => handleToggleModule(group.module)} className="w-full flex items-center justify-between gap-3 border-b border-slate-100 pb-2 disabled:cursor-default">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layers3 size={12} />{du(group.module)}</span>
                                    <span className="flex items-center gap-2 text-[10px] font-bold text-indigo-600"><CheckBox checked={moduleChecked} />{du("m5b6fef95fb92")}</span>
                                  </button>
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                    {group.permissions.map((p) => {
                                      const isChecked = selectedPermissions.includes(p.id);
                                      return (
                                        <PermissionCard key={p.id} permission={p} checked={isChecked} disabled={!canSave} onClick={() => handleTogglePermission(p.id)} />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {mode !== "view" && selectedPermissions.length === 0 && <p className="text-[10px] font-semibold text-rose-500">{du("m1e55b93e8ee5")}</p>}
            </section>
          </div>
        </form>
      </div>

      <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] shrink-0 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          {mode === "view" ? du("m711e5f2e198d") : du("m46ad3916f6a0")}
        </button>

        {mode !== "view" && (
          <button
            type="submit"
            form="role-form"
            disabled={!canSave || selectedPermissions.length === 0}
            className={`px-6 py-2 text-xs font-bold rounded-xl transition-colors shadow-sm ${canSave && selectedPermissions.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-95" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          >
            {du(submitButtonText)}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PermissionViewer({ loading, groups }: { loading: boolean; groups: GroupedModule[] }) {
  const { ui: du } = useDashboardLanguage();
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
        <Loader2 size={16} className="animate-spin text-indigo-500" /> {du("mb3ac48e80e50")}{" "}</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex flex-col items-center justify-center gap-2 text-center">
        <AlertCircle size={20} className="text-slate-300" />
        <p className="text-xs font-black text-slate-700">{du("mfec7f6e05845")}</p>
        <p className="text-[11px] text-slate-400">{du("m4cfb71778efd")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 max-h-[58vh] overflow-y-auto space-y-5">
      {groups.map((group) => (
        <div key={group.module} className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layers3 size={12} />{du(group.module)}</span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">{group.permissions.length} {du("m206d60145c45")}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {group.permissions.map((permission) => (
              <PermissionCard key={permission.id} permission={permission} checked disabled />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionCard({ permission, checked, disabled, onClick }: { permission: PermissionItem; checked: boolean; disabled?: boolean; onClick?: () => void }) {
  const { ui: du } = useDashboardLanguage();
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`flex items-start gap-3 px-3 py-3 rounded-xl border select-none transition-all ${disabled ? "cursor-default" : "cursor-pointer hover:bg-slate-50"} ${checked ? "bg-indigo-50/60 border-indigo-200" : "border-slate-100 bg-white"}`}
    >
      <CheckBox checked={checked} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`text-xs font-bold leading-snug ${checked ? "text-indigo-700" : "text-slate-700"}`}>{du(permission.label || permission.code)}</span>
        {permission.description ? (
          <span className="text-[10px] text-slate-500 font-medium leading-snug">{du(permission.description)}</span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">{du("m1a30b5685264")}</span>
        )}
      </div>
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  const { ui: du } = useDashboardLanguage();
  return (
    <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${checked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>
      {checked && <Check size={10} strokeWidth={3} />}
    </span>
  );
}

function FormInput({ label, icon: Icon, ...props }: FormInputProps) {
  const { ui: du } = useDashboardLanguage();
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {du(label)} {props.required && <span className="text-rose-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  );
}
