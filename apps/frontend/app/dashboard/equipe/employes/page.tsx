"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  Power,
  User,
  X,
  Mail,
  Phone,
  Lock,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  Camera,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Store,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmployeModal, { EmployeOption } from "./components/EmployeModal";

export interface Employe {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "Actif" | "Suspendu";
  avatarUrl?: string | null;
  roleId?: string | null;
  departementId?: string | null;
  boutiqueId?: string | null;
  boutique?: string;
  temporaryAccess?: {
    temporaryPassword?: string;
  } | null;
}

interface EditInterfaceProps {
  employe: Employe;
  roles: EmployeOption[];
  departements: EmployeOption[];
  boutiques: EmployeOption[];
  onBoutiqueChange: (boutiqueId: string) => void | Promise<void>;
  onClose: () => void;
  onSave: (updatedEmp: Employe) => Promise<void>;
}

interface ResetInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onReset: (id: string) => Promise<{ temporaryPassword: string }>;
  copyToClipboard: (text: string) => void;
  copied: boolean;
}

interface StatusInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

interface DeleteInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface ApiRole {
  _id: string;
  nom: string;
}

interface ApiDepartement {
  _id: string;
  nom: string;
}

interface ApiBoutique {
  id: string;
  _id?: string;
  nom: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{9}$/;

const readApiMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return { data, message: data?.message || fallback };
  } catch {
    return { data: null, message: fallback };
  }
};

const validateEmployeeForm = ({
  firstName,
  lastName,
  email,
  phone,
  roleId,
  departementId,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId?: string | null;
  departementId?: string | null;
}) => {
  if (!NAME_REGEX.test(firstName.trim())) {
    return "Le prenom doit contenir uniquement des lettres et au moins 2 caracteres.";
  }

  if (!NAME_REGEX.test(lastName.trim())) {
    return "Le nom doit contenir uniquement des lettres et au moins 2 caracteres.";
  }

  if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return "Veuillez saisir une adresse email valide.";
  }

  if (!PHONE_REGEX.test(phone.trim())) {
    return "Le numero de telephone doit contenir exactement 9 chiffres.";
  }

  if (!roleId) {
    return "Veuillez choisir un role.";
  }

  if (!departementId) {
    return "Veuillez choisir un departement.";
  }

  return "";
};

export default function EmployesPage() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [roles, setRoles] = useState<EmployeOption[]>([]);
  const [departements, setDepartements] = useState<EmployeOption[]>([]);
  const [boutiques, setBoutiques] = useState<EmployeOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<"edit" | "reset" | "status" | "delete" | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

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

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []);

  const fetchEmployes = useCallback(async () => {
    const response = await fetch(`${API_URL}/employes`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const { data, message } = await readApiMessage(response, "Impossible de charger les employes.");
    if (!response.ok || !data?.success) {
      throw new Error(message);
    }

    setEmployes(data.employes || []);
  }, [getAuthHeaders]);

  const fetchBoutiques = useCallback(async () => {
    const response = await fetch(`${API_URL}/boutiques`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const { data, message } = await readApiMessage(response, "Impossible de charger les boutiques.");
    if (!response.ok || !data?.success) {
      setBoutiques([]);
      showToast("error", message);
      return;
    }

    setBoutiques(
      (data.boutiques || []).map((boutique: ApiBoutique) => ({
        id: boutique.id || boutique._id || "",
        name: boutique.nom,
      }))
    );
  }, [getAuthHeaders, showToast]);

  const fetchReferences = useCallback(async (boutiqueId?: string) => {
    const query = boutiqueId ? `?boutiqueId=${encodeURIComponent(boutiqueId)}` : "";
    const [rolesResponse, departementsResponse] = await Promise.all([
      fetch(`${API_URL}/roles${query}`, { method: "GET", headers: getAuthHeaders() }),
      fetch(`${API_URL}/departements${query}`, { method: "GET", headers: getAuthHeaders() }),
    ]);

    const rolesResult = await readApiMessage(rolesResponse, "Impossible de charger les roles.");
    const departementsResult = await readApiMessage(departementsResponse, "Impossible de charger les departements.");

    if (rolesResponse.ok && rolesResult.data?.success) {
      setRoles(
        (rolesResult.data.roles || []).map((role: ApiRole) => ({
          id: role._id,
          name: role.nom,
        }))
      );
    } else {
      showToast("error", rolesResult.message);
    }

    if (departementsResponse.ok && departementsResult.data?.success) {
      setDepartements(
        (departementsResult.data.data || []).map((dept: ApiDepartement) => ({
          id: dept._id,
          name: dept.nom,
        }))
      );
    } else {
      showToast("error", departementsResult.message);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([fetchEmployes(), fetchReferences(), fetchBoutiques()]);
      } catch (error) {
        showToast(error instanceof Error ? "error" : "error", error instanceof Error ? error.message : "Erreur de communication avec le serveur.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchBoutiques, fetchEmployes, fetchReferences, showToast]);

  const filteredEmployes = employes.filter((emp) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.phone.includes(searchQuery) ||
      emp.role.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || emp.roleId === roleFilter || emp.role === roleFilter;
    const matchesDepartment = departmentFilter === "all" || emp.departementId === departmentFilter || emp.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const handleCreateEmploye = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    boutiqueId: string;
    roleId: string;
    departementId: string;
    avatar?: string;
  }) => {
    try {
      const response = await fetch(`${API_URL}/employes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la creation de l'employe.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      await fetchEmployes();
      showToast("success", data.message || "Employe cree avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la creation de l'employe.";
      showToast("error", message);
      throw new Error(message);
    }
  };

  const handleUpdateEmploye = async (updatedEmp: Employe) => {
    const validationError = validateEmployeeForm(updatedEmp);
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      const response = await fetch(`${API_URL}/employes/${updatedEmp.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName: updatedEmp.firstName.trim(),
          lastName: updatedEmp.lastName.trim(),
          email: updatedEmp.email.trim().toLowerCase(),
          phone: updatedEmp.phone.trim(),
          roleId: updatedEmp.roleId,
          departementId: updatedEmp.departementId,
          boutiqueId: updatedEmp.boutiqueId,
          avatar: updatedEmp.avatarUrl || "",
        }),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la modification de l'employe.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      await Promise.all([fetchEmployes(), fetchReferences()]);
      setActiveActionModal(null);
      showToast("success", data.message || "Employe mis a jour avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la modification de l'employe.";
      showToast("error", message);
      throw new Error(message);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/employes/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors du changement de statut.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      await fetchEmployes();
      setActiveActionModal(null);
      showToast("success", data.message || "Statut mis a jour avec succes.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Impossible de joindre le serveur backend.");
    }
  };

  const handleDeleteEmploye = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/employes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la suppression de l'employe.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      setEmployes((current) => current.filter((e) => e.id !== id));
      setActiveActionModal(null);
      showToast("success", data.message || "Employe supprime avec succes.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Impossible de joindre le serveur backend.");
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/employes/${id}/reset-password`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la reinitialisation du mot de passe.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      showToast("success", data.message || "Mot de passe reinitialise avec succes.");
      return {
        temporaryPassword: data.temporaryPassword || "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de joindre le serveur backend.";
      showToast("error", message);
      throw new Error(message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 right-6 z-[100] max-w-md"
          >
            <div className={`p-3 text-xs font-semibold rounded-xl border flex items-center gap-2 shadow-sm ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-rose-50 text-rose-600 border-rose-100"
            }`}>
              {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Annuaire du Personnel</h1>
          <p className="text-xs text-slate-400 font-medium">Gerez les acces et le statut de vos collaborateurs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={14} /> Nouvel Employe
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div ref={filterMenuRef} className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Rechercher un employe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all"
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
                className="absolute right-4 top-full mt-2 z-50 w-[min(calc(100vw-4rem),420px)] origin-top-right rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 ring-1 ring-slate-900/5"
              >
                <div className="grid grid-cols-1 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Role</span>
                    <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les roles</option>
                      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Departement</span>
                    <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les departements</option>
                      {departements.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Statut</span>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les statuts</option>
                      <option value="Actif">Actif</option>
                      <option value="Suspendu">Suspendu</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Employe</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Departement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium bg-slate-50/30">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      Chargement des employes...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium bg-slate-50/30">
                    Aucun element trouve
                  </td>
                </tr>
              ) : (
                filteredEmployes.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[11px]">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                      )}
                      <span className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {emp.email}<br />
                      <span className="text-[10px] text-slate-400 font-medium">{emp.phone}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px]">{emp.role}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{emp.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md font-bold ${emp.status === "Actif" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => { setSelectedEmploye(emp); setActiveActionModal("edit"); }} className="text-slate-400 hover:text-indigo-600 p-1.5 mr-1 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all" title="Modifier le profil">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { setSelectedEmploye(emp); setActiveActionModal("reset"); }} className="text-slate-400 hover:text-amber-600 p-1.5 mr-1 bg-slate-50 hover:bg-amber-50 rounded-lg transition-all" title="Reinitialiser les acces">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => { setSelectedEmploye(emp); setActiveActionModal("status"); }} className={`p-1.5 mr-1 rounded-lg transition-all bg-slate-50 ${emp.status === "Actif" ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`} title="Changer le statut">
                        <Power size={14} />
                      </button>
                      <button onClick={() => { setSelectedEmploye(emp); setActiveActionModal("delete"); }} className="text-slate-400 hover:text-rose-600 p-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer l'utilisateur">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roles={roles}
        departements={departements}
        boutiques={boutiques}
        onBoutiqueChange={fetchReferences}
        onCreate={handleCreateEmploye}
      />

      <AnimatePresence>
        {activeActionModal && selectedEmploye && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-800 flex flex-col max-h-[90vh]"
            >
              {activeActionModal === "edit" && (
                <EditInterface
                  employe={selectedEmploye}
                  roles={roles}
                  departements={departements}
                  boutiques={boutiques}
                  onBoutiqueChange={fetchReferences}
                  onClose={() => {
                    setActiveActionModal(null);
                    void fetchReferences();
                  }}
                  onSave={handleUpdateEmploye}
                />
              )}

              {activeActionModal === "reset" && (
                <ResetInterface employe={selectedEmploye} onClose={() => setActiveActionModal(null)} onReset={handleResetPassword} copyToClipboard={copyToClipboard} copied={copied} />
              )}

              {activeActionModal === "status" && (
                <StatusInterface employe={selectedEmploye} onClose={() => setActiveActionModal(null)} onConfirm={() => handleToggleStatus(selectedEmploye.id)} />
              )}

              {activeActionModal === "delete" && (
                <DeleteInterface employe={selectedEmploye} onClose={() => setActiveActionModal(null)} onConfirm={() => handleDeleteEmploye(selectedEmploye.id)} />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FormInput: React.FC<FormInputProps> = ({ label, icon: Icon, ...props }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
        <input {...props} className="w-full text-xs font-medium pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors bg-white text-slate-800" />
      </div>
    </div>
  );
};

function EditInterface({ employe, roles, departements, boutiques, onBoutiqueChange, onClose, onSave }: EditInterfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employe.avatarUrl || null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");
  const [formData, setFormData] = useState<Employe>({ ...employe });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("La photo doit etre au format jpeg, jpg, png, webp ou gif.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = String(reader.result || "");
      setAvatarPreview(avatar);
      setFormData({ ...formData, avatarUrl: avatar });
    };
    reader.readAsDataURL(file);
  };

  const filteredRoles = roles.filter((role) => role.name.toLowerCase().includes(roleSearch.toLowerCase()));
  const filteredDepartments = departements.filter((dept) => dept.name.toLowerCase().includes(deptSearch.toLowerCase()));
  const selectedBoutique = boutiques.find((boutique) => boutique.id === formData.boutiqueId);

  const handleBoutiqueSelect = async (boutique: EmployeOption) => {
    if (isSaving || isLoadingReferences || boutique.id === formData.boutiqueId) return;

    setError("");
    setFormData({
      ...formData,
      boutiqueId: boutique.id,
      boutique: boutique.name,
      role: "",
      roleId: null,
      department: "",
      departementId: null,
    });
    setShowRoleDropdown(false);
    setShowDeptDropdown(false);
    setRoleSearch("");
    setDeptSearch("");

    try {
      setIsLoadingReferences(true);
      await onBoutiqueChange(boutique.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les roles et departements de ce site.");
    } finally {
      setIsLoadingReferences(false);
    }
  };

  const handleSave = async () => {
    if (isLoadingReferences) return;

    setError("");
    const validationError = validateEmployeeForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification de l'employe.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe] shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Modifier l&apos;Employe</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mise a jour globale de la fiche d&apos;identite</p>
        </div>
        <button onClick={onClose} disabled={isSaving} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-130px)]">
        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-600">{error}</div>}

        <div className="flex flex-col items-center justify-center">
          <div onClick={() => !isSaving && fileInputRef.current?.click()} className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden group relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="font-bold text-indigo-600 text-lg uppercase">{formData.firstName?.[0]}{formData.lastName?.[0]}</div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpeg,.jpg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" className="hidden" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-3">Photo de profil</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormInput label="Prenom" name="firstName" icon={User} value={formData.firstName} onChange={handleChange} required disabled={isSaving} />
          <FormInput label="Nom de famille" name="lastName" icon={User} value={formData.lastName} onChange={handleChange} required disabled={isSaving} />
          <FormInput label="Adresse Email" name="email" type="email" icon={Mail} value={formData.email} onChange={handleChange} required disabled={isSaving} />
          <FormInput label="Numero de Telephone" name="phone" type="tel" icon={Phone} value={formData.phone} onChange={handleChange} required disabled={isSaving} />

          {boutiques.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Store size={12} /> Site de rattachement
              </label>
              <div className="flex flex-wrap gap-2">
                {boutiques.map((boutique) => {
                  const isSelected = formData.boutiqueId === boutique.id;

                  return (
                    <button
                      key={boutique.id}
                      type="button"
                      onClick={() => handleBoutiqueSelect(boutique)}
                      disabled={isSaving || isLoadingReferences}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-60 ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
                      }`}
                    >
                      {isLoadingReferences && isSelected ? <Loader2 size={12} className="animate-spin" /> : <Store size={12} />}
                      {boutique.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Site actuel : {selectedBoutique?.name || formData.boutique || "Boutique active"}
              </p>
            </div>
          )}

          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck size={12} /> Role d&apos;exploitation
            </label>
            <div onClick={() => { if (!isSaving && !isLoadingReferences) { setShowRoleDropdown(!showRoleDropdown); setShowDeptDropdown(false); } }} className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl bg-white flex justify-between items-center transition-colors ${isLoadingReferences ? "cursor-wait opacity-70" : "cursor-pointer hover:border-indigo-500"}`}>
              <span className={formData.role ? "text-slate-800" : "text-slate-400"}>{isLoadingReferences ? "Chargement des roles..." : formData.role || "Choisir un role"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showRoleDropdown ? "rotate-180" : ""}`} />
            </div>
            <AnimatePresence>
              {showRoleDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[220px] overflow-y-auto">
                  <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input type="text" placeholder="Rechercher..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all bg-slate-50/50" />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {filteredRoles.length === 0 ? (
                      <div className="text-xs font-medium px-2.5 py-3 text-slate-400 text-center">Aucun element trouve</div>
                    ) : (
                      filteredRoles.map((role) => (
                        <div key={role.id} onClick={() => { setFormData({ ...formData, role: role.name, roleId: role.id }); setShowRoleDropdown(false); setRoleSearch(""); }} className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer flex justify-between items-center ${formData.roleId === role.id ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"}`}>
                          <span>{role.name}</span>
                          {formData.roleId === role.id && <Check size={12} />}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Briefcase size={12} /> Departement
            </label>
            <div onClick={() => { if (!isSaving && !isLoadingReferences) { setShowDeptDropdown(!showDeptDropdown); setShowRoleDropdown(false); } }} className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl bg-white flex justify-between items-center transition-colors ${isLoadingReferences ? "cursor-wait opacity-70" : "cursor-pointer hover:border-indigo-500"}`}>
              <span className={formData.department ? "text-slate-800" : "text-slate-400"}>{isLoadingReferences ? "Chargement des departements..." : formData.department || "Choisir un departement"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDeptDropdown ? "rotate-180" : ""}`} />
            </div>
            <AnimatePresence>
              {showDeptDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[220px] overflow-y-auto">
                  <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input type="text" placeholder="Rechercher..." value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all bg-slate-50/50" />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {filteredDepartments.length === 0 ? (
                      <div className="text-xs font-medium px-2.5 py-3 text-slate-400 text-center">Aucun element trouve</div>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <div key={dept.id} onClick={() => { setFormData({ ...formData, department: dept.name, departementId: dept.id }); setShowDeptDropdown(false); setDeptSearch(""); }} className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer flex justify-between items-center ${formData.departementId === dept.id ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"}`}>
                          <span>{dept.name}</span>
                          {formData.departementId === dept.id && <Check size={12} />}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
        <button onClick={onClose} disabled={isSaving || isLoadingReferences} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors disabled:opacity-40">Annuler</button>
        <button onClick={handleSave} disabled={isSaving || isLoadingReferences} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center gap-2 disabled:bg-slate-400">
          {(isSaving || isLoadingReferences) && <Loader2 size={12} className="animate-spin" />}
          Appliquer les changements
        </button>
      </div>
    </>
  );
}

function ResetInterface({ employe, onClose, onReset, copyToClipboard, copied }: ResetInterfaceProps) {
  const [generatedTempPassword, setGeneratedTempPassword] = useState(employe.temporaryAccess?.temporaryPassword || "");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    try {
      setError("");
      setIsResetting(true);
      const access = await onReset(employe.id);
      setGeneratedTempPassword(access.temporaryPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la reinitialisation.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><KeyRound size={16} /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Identifiants & Securite</h3>
            <p className="text-[11px] text-slate-400">Reinitialiser les acces de l&apos;utilisateur.</p>
          </div>
        </div>
        <button onClick={onClose} disabled={isResetting} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors disabled:opacity-40"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-4 text-xs">
        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-600">{error}</div>}
        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">Cette action deconnectera immediatement la session de <strong>{employe.firstName} {employe.lastName}</strong>.</p>
        </div>

        <div className="space-y-3">
          <AccessValue
            label="Code temporaire initial"
            value={generatedTempPassword || "Cliquez sur reinitialiser"}
            icon={Lock}
            canCopy={Boolean(generatedTempPassword)}
            copied={copied}
            onCopy={() => copyToClipboard(generatedTempPassword)}
          />
          {!generatedTempPassword && (
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Le code initial n&apos;est plus affiche si l&apos;utilisateur a deja change son mot de passe. Vous pouvez generer un nouveau code avec le bouton de reinitialisation.
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={handleReset} disabled={isResetting} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 disabled:bg-slate-400">
          {isResetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {isResetting ? "Reinitialisation..." : "Reinitialiser"}
        </button>
      </div>
    </>
  );
}

function AccessValue({
  label,
  value,
  icon: Icon,
  canCopy,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  canCopy: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-slate-500 font-semibold">{label}</label>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono text-slate-700 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="text-slate-400 shrink-0" />
          <span className="font-bold tracking-wide truncate">{value}</span>
        </div>
        {canCopy && (
          <button onClick={onCopy} className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-sans shrink-0 ${copied ? "bg-emerald-100 text-emerald-700" : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-500"}`}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span className="text-[10px] font-bold">{copied ? "Copie" : "Copier"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function StatusInterface({ employe, onClose, onConfirm }: StatusInterfaceProps) {
  const isCurrentlyActive = employe.status === "Actif";
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${isCurrentlyActive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"} rounded-lg`}><Power size={16} /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Changer le statut</h3>
            <p className="text-[11px] text-slate-400">Modifier l&apos;etat operationnel.</p>
          </div>
        </div>
        <button onClick={onClose} disabled={isProcessing} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors disabled:opacity-40"><X size={16} /></button>
      </div>

      <div className="p-5 text-center space-y-4 text-xs">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-slate-100">
          <User size={24} className="text-slate-500" />
        </div>
        <p className="text-slate-600 text-sm font-medium">
          Voulez-vous vraiment {isCurrentlyActive ? "suspendre" : "activer"} le collaborateur{" "}
          <span className="font-bold text-slate-900">{employe.firstName} {employe.lastName}</span> ?
        </p>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors disabled:opacity-40">Annuler</button>
        <button onClick={handleConfirm} disabled={isProcessing} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl font-bold text-[11px] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60">
          {isProcessing && <Loader2 size={12} className="animate-spin" />}
          Confirmer
        </button>
      </div>
    </>
  );
}

function DeleteInterface({ employe, onClose, onConfirm }: DeleteInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Trash2 size={16} /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Supprimer definitivement</h3>
            <p className="text-[11px] text-slate-400">Retirer l&apos;acces et detruire la fiche.</p>
          </div>
        </div>
        <button onClick={onClose} disabled={isProcessing} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors disabled:opacity-40"><X size={16} /></button>
      </div>

      <div className="p-5 text-center space-y-4 text-xs">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="text-slate-600 text-sm font-medium">
            Etes-vous sur de vouloir supprimer definitivement le collaborateur{" "}
            <span className="font-bold text-slate-900">{employe.firstName} {employe.lastName}</span> ?
          </p>
          <p className="text-slate-400 text-[10px] mt-1 font-medium">Cette action est irreversible et annulera immediatement toutes ses autorisations.</p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors disabled:opacity-40">Annuler</button>
        <button onClick={handleConfirm} disabled={isProcessing} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl font-bold text-[11px] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60">
          {isProcessing && <Loader2 size={12} className="animate-spin" />}
          Supprimer
        </button>
      </div>
    </>
  );
}
