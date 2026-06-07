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
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmployeModal from "./components/EmployeModal";

// ================= DÉCLARATION DES TYPES INTERNES =================

export interface Employe {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId?: string | null;
  departementId?: string | null;
  role: string;
  department: string;
  status: "Actif" | "Suspendu";
  avatarUrl?: string | null;
}

interface SelectOption {
  id: string;
  name: string;
}

interface EditInterfaceProps {
  employe: Employe;
  roles: SelectOption[];
  departements: SelectOption[];
  onClose: () => void;
  onSave: (updatedEmp: Employe) => void;
}

interface ResetInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onReset: (id: string) => Promise<string>;
  copyToClipboard: (text: string) => void;
  copied: boolean;
}

interface StatusInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onConfirm: () => void;
}

interface DeleteInterfaceProps {
  employe: Employe;
  onClose: () => void;
  onConfirm: () => void;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ================= COMPOSANT PRINCIPAL =================

export default function EmployesPage() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [departements, setDepartements] = useState<SelectOption[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<"edit" | "reset" | "status" | "delete" | null>(null);
  const [copied, setCopied] = useState(false);

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

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Impossible de charger les employés.");
    }

    setEmployes(data.employes || []);
  }, [getAuthHeaders]);

  const fetchReferences = useCallback(async () => {
    const [rolesResponse, departementsResponse] = await Promise.all([
      fetch(`${API_URL}/roles`, {
        method: "GET",
        headers: getAuthHeaders(),
      }),
      fetch(`${API_URL}/departements`, {
        method: "GET",
        headers: getAuthHeaders(),
      }),
    ]);

    const rolesData = await rolesResponse.json();
    const departementsData = await departementsResponse.json();

    if (!rolesResponse.ok || !rolesData.success) {
      throw new Error(rolesData.message || "Impossible de charger les rôles.");
    }

    if (!departementsResponse.ok || !departementsData.success) {
      throw new Error(departementsData.message || "Impossible de charger les départements.");
    }

    setRoles(
      (rolesData.roles || []).map((role: { _id: string; nom: string }) => ({
        id: role._id,
        name: role.nom,
      }))
    );

    setDepartements(
      (departementsData.data || []).map((dept: { _id: string; nom: string }) => ({
        id: dept._id,
        name: dept.nom,
      }))
    );
  }, [getAuthHeaders]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setGlobalError("");
        await Promise.all([fetchEmployes(), fetchReferences()]);
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Erreur de chargement.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchEmployes, fetchReferences]);

  const filteredEmployes = employes.filter((emp) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone.includes(searchQuery)
  );

  const handleCreateEmploye = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    roleId: string;
    departementId: string;
    password: string;
    avatar?: string;
  }) => {
    const response = await fetch(`${API_URL}/employes`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Impossible de créer l'employé.");
    }

    await fetchEmployes();
  };

  const handleUpdateEmploye = async (updatedEmp: Employe) => {
    const response = await fetch(`${API_URL}/employes/${updatedEmp.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        firstName: updatedEmp.firstName,
        lastName: updatedEmp.lastName,
        email: updatedEmp.email,
        phone: updatedEmp.phone,
        roleId: updatedEmp.roleId,
        departementId: updatedEmp.departementId,
        avatar: updatedEmp.avatarUrl || "",
      }),
    });

    const data = await response.json();

    if (data.success) {
      await fetchEmployes();
    }

    setActiveActionModal(null);
  };

  const handleToggleStatus = async (id: string) => {
    const response = await fetch(`${API_URL}/employes/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (data.success) {
      await fetchEmployes();
    }

    setActiveActionModal(null);
  };

  const handleResetPassword = async (id: string) => {
    const response = await fetch(`${API_URL}/employes/${id}/reset-password`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Impossible de réinitialiser le mot de passe.");
    }

    return data.temporaryPassword || "";
  };

  const handleDeleteEmploye = async (id: string) => {
    const response = await fetch(`${API_URL}/employes/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (data.success) {
      await fetchEmployes();
    }

    setActiveActionModal(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {globalError && (
        <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-semibold">
          {globalError}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barre de recherche principale */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Employé</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Département</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium bg-slate-50/30">
                    Chargement des employés...
                  </td>
                </tr>
              ) : filteredEmployes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium bg-slate-50/30">
                    Aucun élément trouvé
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
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md font-bold ${emp.status === "Actif" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedEmploye(emp); setActiveActionModal("edit"); }}
                        className="text-slate-400 hover:text-indigo-600 p-1.5 mr-1 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Modifier le profil"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setSelectedEmploye(emp); setActiveActionModal("reset"); }}
                        className="text-slate-400 hover:text-amber-600 p-1.5 mr-1 bg-slate-50 hover:bg-amber-50 rounded-lg transition-all"
                        title="Réinitialiser les accès"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => { setSelectedEmploye(emp); setActiveActionModal("status"); }}
                        className={`p-1.5 mr-1 rounded-lg transition-all bg-slate-50 ${emp.status === "Actif" ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                        title="Changer le statut"
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => { setSelectedEmploye(emp); setActiveActionModal("delete"); }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg transition-all"
                        title="Supprimer l'utilisateur"
                      >
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
        onCreate={handleCreateEmploye}
      />

      {/* SYSTEME DE MODAL D'ACTION SÉCURISÉ */}
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
                  onClose={() => setActiveActionModal(null)}
                  onSave={handleUpdateEmploye}
                />
              )}

              {activeActionModal === "reset" && (
                <ResetInterface
                  employe={selectedEmploye}
                  onClose={() => setActiveActionModal(null)}
                  onReset={handleResetPassword}
                  copyToClipboard={copyToClipboard}
                  copied={copied}
                />
              )}

              {activeActionModal === "status" && (
                <StatusInterface
                  employe={selectedEmploye}
                  onClose={() => setActiveActionModal(null)}
                  onConfirm={() => handleToggleStatus(selectedEmploye.id)}
                />
              )}

              {activeActionModal === "delete" && (
                <DeleteInterface
                  employe={selectedEmploye}
                  onClose={() => setActiveActionModal(null)}
                  onConfirm={() => handleDeleteEmploye(selectedEmploye.id)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================
   COMPOSANT : FORM INPUT UTILITAIRE
   ======================================================== */
const FormInput: React.FC<FormInputProps> = ({ label, icon: Icon, ...props }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
        <input
          {...props}
          className="w-full text-xs font-medium pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors bg-white text-slate-800"
        />
      </div>
    </div>
  );
};

/* ========================================================
   INTERFACE DE MODIFICATION
   ======================================================== */
function EditInterface({ employe, roles, departements, onClose, onSave }: EditInterfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(employe.avatarUrl || null);

  // States de recherche internes
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  const [formData, setFormData] = useState<Employe>({ ...employe });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const avatar = String(reader.result || "");
        setAvatarPreview(avatar);
        setFormData({ ...formData, avatarUrl: avatar });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredDepartments = departements.filter((dept) =>
    dept.name.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <>
      {/* HEADER */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe] shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Modifier l`Employé</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mise à jour globale de la fiche d`identité</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>
      
      {/* SCROLLABLE BODY */}
      <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-130px)]">
        
        {/* ZONE AVATAR */}
        <div className="flex flex-col items-center justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden group relative"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="font-bold text-indigo-600 text-lg uppercase">{formData.firstName?.[0]}{formData.lastName?.[0]}</div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-3">Photo de profil</p>
        </div>

        {/* GRILLE FORMULAIRE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormInput label="Prénom" name="firstName" icon={User} value={formData.firstName} onChange={handleChange} required />
          <FormInput label="Nom de famille" name="lastName" icon={User} value={formData.lastName} onChange={handleChange} required />
          <FormInput label="Adresse Email" name="email" type="email" icon={Mail} value={formData.email} onChange={handleChange} required />
          <FormInput label="Numéro de Téléphone" name="phone" type="tel" icon={Phone} value={formData.phone} onChange={handleChange} required />

          {/* SÉLECTEUR DE RÔLE */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck size={12} /> Rôle d`exploitation
            </label>
            <div
              onClick={() => { setShowRoleDropdown(!showRoleDropdown); setShowDeptDropdown(false); }}
              className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl bg-white flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
            >
              <span className="text-slate-800">{formData.role}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showRoleDropdown ? "rotate-180" : ""}`} />
            </div>
            <AnimatePresence>
              {showRoleDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[220px] overflow-y-auto">
                  {/* Barre de recherche rôle */}
                  <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {filteredRoles.length === 0 ? (
                      <div className="text-xs font-medium px-2.5 py-3 text-slate-400 text-center">
                        Aucun élément trouvé
                      </div>
                    ) : (
                      filteredRoles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => {
                            setFormData({ ...formData, role: role.name, roleId: role.id });
                            setShowRoleDropdown(false);
                            setRoleSearch("");
                          }}
                          className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer flex justify-between items-center ${formData.roleId === role.id ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                        >
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

          {/* SÉLECTEUR DE DÉPARTEMENT */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Briefcase size={12} /> Département
            </label>
            <div
              onClick={() => { setShowDeptDropdown(!showDeptDropdown); setShowRoleDropdown(false); }}
              className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl bg-white flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
            >
              <span className="text-slate-800">{formData.department}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDeptDropdown ? "rotate-180" : ""}`} />
            </div>
            <AnimatePresence>
              {showDeptDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[220px] overflow-y-auto">
                  {/* Barre de recherche département */}
                  <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium transition-all bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {filteredDepartments.length === 0 ? (
                      <div className="text-xs font-medium px-2.5 py-3 text-slate-400 text-center">
                        Aucun élément trouvé
                      </div>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <div
                          key={dept.id}
                          onClick={() => {
                            setFormData({ ...formData, department: dept.name, departementId: dept.id });
                            setShowDeptDropdown(false);
                            setDeptSearch("");
                          }}
                          className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer flex justify-between items-center ${formData.departementId === dept.id ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                        >
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

      {/* FOOTER */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
        <button onClick={onClose} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors">Annuler</button>
        <button onClick={() => onSave(formData)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition-colors">Appliquer les changements</button>
      </div>
    </>
  );
}

/* ========================================================
   INTERFACE : REINITIALISER LES ACCÈS
   ======================================================== */
function ResetInterface({ employe, onClose, onReset, copyToClipboard, copied }: ResetInterfaceProps) {
  const [generatedTempPassword, setGeneratedTempPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError("");
      const temporaryPassword = await onReset(employe.id);
      setGeneratedTempPassword(temporaryPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
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
            <h3 className="font-bold text-slate-900 text-sm">Identifiants & Sécurité</h3>
            <p className="text-[11px] text-slate-400">Réinitialiser les accès de l`utilisateur.</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-4 text-xs">
        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">Cette action déconnectera immédiatement la session de <strong>{employe.firstName} {employe.lastName}</strong>.</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-slate-500 font-semibold">Mot de passe temporaire généré</label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono text-slate-700 justify-between">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-slate-400" />
              <span className="font-bold tracking-wide">{generatedTempPassword || "Cliquez sur réinitialiser"}</span>
            </div>
            {generatedTempPassword && (
              <button onClick={() => copyToClipboard(generatedTempPassword)} className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 font-sans ${copied ? "bg-emerald-100 text-emerald-700" : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-500"}`}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span className="text-[10px] font-bold">{copied ? "Copié" : "Copier"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={handleReset} disabled={isResetting} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-60">
          <RefreshCw size={12} /> {isResetting ? "Réinitialisation..." : "Réinitialiser"}
        </button>
      </div>
    </>
  );
}

/* ========================================================
   INTERFACE : STATUT (SUSPENDRE / ACTIVER)
   ======================================================== */
function StatusInterface({ employe, onClose, onConfirm }: StatusInterfaceProps) {
  const isCurrentlyActive = employe.status === "Actif";

  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${isCurrentlyActive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"} rounded-lg`}><Power size={16} /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Changer le statut</h3>
            <p className="text-[11px] text-slate-400">Modifier l`état opérationnel.</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X size={16} /></button>
      </div>

      <div className="p-5 text-center space-y-4 text-xs">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-slate-100">
          <User size={24} className="text-slate-500" />
        </div>
        <div>
          <p className="text-slate-600 text-sm font-medium">
            Voulez-vous vraiment {isCurrentlyActive ? "suspendre" : "activer"} le collaborateur{" "}
            <span className="font-bold text-slate-900">{employe.firstName} {employe.lastName}</span> ?
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors">Annuler</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl font-bold text-[11px] transition-colors shadow-sm">
          Confirmer
        </button>
      </div>
    </>
  );
}

/* ========================================================
   INTERFACE : SUPPRESSION
   ======================================================== */
function DeleteInterface({ employe, onClose, onConfirm }: DeleteInterfaceProps) {
  return (
    <>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Trash2 size={16} /></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Supprimer définitivement</h3>
            <p className="text-[11px] text-slate-400">Retirer l`accès et détruire la fiche.</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X size={16} /></button>
      </div>

      <div className="p-5 text-center space-y-4 text-xs">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="text-slate-600 text-sm font-medium">
            Êtes-vous sûr de vouloir supprimer définitivement le collaborateur{" "}
            <span className="font-bold text-slate-900">{employe.firstName} {employe.lastName}</span> ?
          </p>
          <p className="text-slate-400 text-[10px] mt-1 font-medium">Cette action est irréversible et annulera immédiatement toutes ses autorisations.</p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors">Annuler</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl font-bold text-[11px] transition-colors shadow-sm">
          Supprimer
        </button>
      </div>
    </>
  );
}