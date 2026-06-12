"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Search,
  ChevronDown,
  Check,
  Briefcase,
  LucideIcon,
  Loader2,
  Store,
} from "lucide-react";

export interface EmployeOption {
  id: string;
  name: string;
}

interface EmployeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: EmployeOption[];
  departements: EmployeOption[];
  boutiques?: EmployeOption[];
  onBoutiqueChange?: (boutiqueId: string) => void | Promise<void>;
  onCreate: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    boutiqueId: string;
    roleId: string;
    departementId: string;
    password: string;
    avatar?: string;
  }) => Promise<void>;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  icon: LucideIcon;
  as?: "input" | "select";
  children?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{9}$/;

export default function EmployeModal({
  isOpen,
  onClose,
  roles = [],
  departements = [],
  boutiques = [],
  onBoutiqueChange,
  onCreate,
}: EmployeModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");
  const [showBoutiqueDropdown, setShowBoutiqueDropdown] = useState(false);
  const [boutiqueSearch, setBoutiqueSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    boutiqueId: "",
    roleId: "",
    departementId: "",
    password: "",
  });

  const selectedBoutique = boutiques.find((boutique) => boutique.id === formData.boutiqueId);
  const selectedRole = roles.find((role) => role.id === formData.roleId);
  const selectedDepartment = departements.find((dept) => dept.id === formData.departementId);

  const filteredBoutiques = useMemo(
    () => boutiques.filter((boutique) => boutique.name.toLowerCase().includes(boutiqueSearch.toLowerCase())),
    [boutiques, boutiqueSearch]
  );

  const filteredRoles = useMemo(
    () => roles.filter((role) => role.name.toLowerCase().includes(roleSearch.toLowerCase())),
    [roles, roleSearch]
  );

  const filteredDepartments = useMemo(
    () => departements.filter((dept) => dept.name.toLowerCase().includes(deptSearch.toLowerCase())),
    [departements, deptSearch]
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      boutiqueId: "",
      roleId: "",
      departementId: "",
      password: "",
    });
    setAvatarPreview(null);
    setError("");
    setRoleSearch("");
    setDeptSearch("");
    setBoutiqueSearch("");
    setShowBoutiqueDropdown(false);
  };

  const handleSelectBoutique = async (boutique: EmployeOption) => {
    setFormData((current) => ({
      ...current,
      boutiqueId: boutique.id,
      roleId: "",
      departementId: "",
    }));
    setShowBoutiqueDropdown(false);
    setBoutiqueSearch("");
    setRoleSearch("");
    setDeptSearch("");

    if (!onBoutiqueChange) return;

    try {
      setIsLoadingReferences(true);
      await onBoutiqueChange(boutique.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les roles et departements de cette boutique.");
    } finally {
      setIsLoadingReferences(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
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
    reader.onload = () => setAvatarPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanedForm = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      boutiqueId: formData.boutiqueId,
      roleId: formData.roleId,
      departementId: formData.departementId,
      password: formData.password,
    };

    if (!NAME_REGEX.test(cleanedForm.firstName)) {
      setError("Le prenom doit contenir uniquement des lettres et au moins 2 caracteres.");
      return;
    }

    if (!NAME_REGEX.test(cleanedForm.lastName)) {
      setError("Le nom doit contenir uniquement des lettres et au moins 2 caracteres.");
      return;
    }

    if (!EMAIL_REGEX.test(cleanedForm.email)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    if (!PHONE_REGEX.test(cleanedForm.phone)) {
      setError("Le numero de telephone doit contenir exactement 9 chiffres.");
      return;
    }

    if (boutiques.length > 0 && !cleanedForm.boutiqueId) {
      setError("Veuillez choisir la boutique ou le site de rattachement.");
      return;
    }

    if (!cleanedForm.roleId) {
      setError("Veuillez choisir un role.");
      return;
    }

    if (!cleanedForm.departementId) {
      setError("Veuillez choisir un departement.");
      return;
    }

    if (cleanedForm.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate({
        ...cleanedForm,
        avatar: avatarPreview || "",
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation de l'employe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Nouvel Employe
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Creation d'un profil collaborateur
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar">
              <form id="add-employee-form" onSubmit={handleSubmit} className="p-6">
                {error && (
                  <div className="mb-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                    {error}
                  </div>
                )}

                <div className="mb-8 flex flex-col items-center justify-center">
                  <div
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden group relative"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpeg,.jpg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-3">
                    Photo de profil
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput label="Prenom" name="firstName" icon={User} value={formData.firstName} onChange={handleChange} placeholder="Ex: Junior" disabled={isSubmitting} required />
                  <FormInput label="Nom de famille" name="lastName" icon={User} value={formData.lastName} onChange={handleChange} placeholder="Ex: Muteba" disabled={isSubmitting} required />
                  <FormInput label="Adresse Email" name="email" type="email" icon={Mail} value={formData.email} onChange={handleChange} placeholder="junior@shop.com" disabled={isSubmitting} required />
                  <FormInput label="Numero de Telephone" name="phone" type="tel" icon={Phone} value={formData.phone} onChange={handleChange} placeholder="Ex: 812345678" disabled={isSubmitting} required />

                  {boutiques.length > 0 && (
                    <div className="space-y-1.5 relative md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Store size={12} /> Boutique / Site
                      </label>
                      <div
                        onClick={() => {
                          if (isSubmitting) return;
                          setShowBoutiqueDropdown(!showBoutiqueDropdown);
                          setShowRoleDropdown(false);
                          setShowDeptDropdown(false);
                        }}
                        className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white flex justify-between items-center cursor-pointer select-none hover:border-indigo-500 transition-colors"
                      >
                        <span className={selectedBoutique ? "text-slate-800" : "text-slate-400"}>
                          {selectedBoutique?.name || "Choisir la boutique de rattachement"}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showBoutiqueDropdown ? "rotate-180" : ""}`} />
                      </div>

                      <AnimatePresence>
                        {showBoutiqueDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar"
                          >
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Rechercher une boutique..."
                                value={boutiqueSearch}
                                onChange={(e) => setBoutiqueSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                className="w-full text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                              />
                            </div>

                            <div className="space-y-0.5">
                              {filteredBoutiques.length > 0 ? (
                                filteredBoutiques.map((boutique) => {
                                  const isSelected = formData.boutiqueId === boutique.id;
                                  return (
                                    <div
                                      key={boutique.id}
                                      onClick={() => handleSelectBoutique(boutique)}
                                      className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                        isSelected ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{boutique.name}</span>
                                      {isSelected && <Check size={12} className="text-indigo-600" />}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[11px] text-slate-400 text-center py-3 font-medium">
                                  Aucune boutique trouvee
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck size={12} /> Role d'exploitation
                    </label>
                    <div
                      onClick={() => {
                        if (isSubmitting || isLoadingReferences) return;
                        setShowRoleDropdown(!showRoleDropdown);
                        setShowDeptDropdown(false);
                        setShowBoutiqueDropdown(false);
                      }}
                      className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white flex justify-between items-center select-none transition-colors ${
                        isLoadingReferences ? "cursor-wait opacity-70" : "cursor-pointer hover:border-indigo-500"
                      }`}
                    >
                      <span className={selectedRole ? "text-slate-800" : "text-slate-400"}>
                        {isLoadingReferences ? "Chargement des roles..." : selectedRole?.name || "Choisir un role"}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showRoleDropdown ? "rotate-180" : ""}`} />
                    </div>

                    <AnimatePresence>
                      {showRoleDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar"
                        >
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Rechercher un role..."
                              value={roleSearch}
                              onChange={(e) => setRoleSearch(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                              className="w-full text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div className="space-y-0.5">
                            {filteredRoles.length > 0 ? (
                              filteredRoles.map((role) => {
                                const isSelected = formData.roleId === role.id;
                                return (
                                  <div
                                    key={role.id}
                                    onClick={() => {
                                      setFormData({ ...formData, roleId: role.id });
                                      setShowRoleDropdown(false);
                                      setRoleSearch("");
                                    }}
                                    className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                      isSelected ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>{role.name}</span>
                                    {isSelected && <Check size={12} className="text-indigo-600" />}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-slate-400 text-center py-3 font-medium">
                                Aucun role trouve
                              </p>
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
                    <div
                      onClick={() => {
                        if (isSubmitting || isLoadingReferences) return;
                        setShowDeptDropdown(!showDeptDropdown);
                        setShowRoleDropdown(false);
                        setShowBoutiqueDropdown(false);
                      }}
                      className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white flex justify-between items-center select-none transition-colors ${
                        isLoadingReferences ? "cursor-wait opacity-70" : "cursor-pointer hover:border-indigo-500"
                      }`}
                    >
                      <span className={selectedDepartment ? "text-slate-800" : "text-slate-400"}>
                        {isLoadingReferences ? "Chargement des departements..." : selectedDepartment?.name || "Choisir un departement"}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showDeptDropdown ? "rotate-180" : ""}`} />
                    </div>

                    <AnimatePresence>
                      {showDeptDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-2 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar"
                        >
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Rechercher un departement..."
                              value={deptSearch}
                              onChange={(e) => setDeptSearch(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                              className="w-full text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div className="space-y-0.5">
                            {filteredDepartments.length > 0 ? (
                              filteredDepartments.map((dept) => {
                                const isSelected = formData.departementId === dept.id;
                                return (
                                  <div
                                    key={dept.id}
                                    onClick={() => {
                                      setFormData({ ...formData, departementId: dept.id });
                                      setShowDeptDropdown(false);
                                      setDeptSearch("");
                                    }}
                                    className={`text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                      isSelected ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span>{dept.name}</span>
                                    {isSelected && <Check size={12} className="text-indigo-600" />}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-slate-400 text-center py-3 font-medium">
                                Aucun departement trouve
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <FormInput
                    label="Mot de passe"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 caracteres"
                    disabled={isSubmitting}
                    required
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-indigo-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="add-employee-form"
                disabled={isSubmitting}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:bg-slate-400"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Creer l'employe
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FormInput({ label, icon: Icon, as = "input", children, rightElement, ...props }: FormInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>

      <div className="relative">
        {as === "select" ? (
          <select
            {...props}
            className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white appearance-none cursor-pointer"
          >
            {children}
          </select>
        ) : (
          <input
            {...props}
            className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white ${rightElement ? "pr-10" : ""}`}
          />
        )}

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
