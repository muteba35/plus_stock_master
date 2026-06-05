"use client";

import React, { useState, useRef } from "react";
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
  Briefcase, // Ajout de l'icône pour le département
  LucideIcon,
} from "lucide-react";

// ================= TYPES =================

interface EmployeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label: string;
  icon: LucideIcon;
  as?: "input" | "select";
  children?: React.ReactNode;
  rightElement?: React.ReactNode;
}

// Listes disponibles pour la recherche
const AVAILABLE_ROLES = ["Caissier", "Gestionnaire", "Administrateur"];
const AVAILABLE_DEPARTMENTS = ["Ventes", "Logistique", "Comptabilité", "Marketing", "Ressources Humaines"];

// ================= COMPONENT =================

export default function EmployeModal({ isOpen, onClose }: EmployeModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States pour le sélecteur de rôle personnalisé
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  // States pour le sélecteur de département personnalisé
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "Caissier",
    department: "Ventes", // Valeur par défaut
    password: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nouvel employé:", formData);
    onClose();
  };

  // Filtrage des rôles selon la saisie
  const filteredRoles = AVAILABLE_ROLES.filter((role) =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  // Filtrage des départements selon la saisie
  const filteredDepartments = AVAILABLE_DEPARTMENTS.filter((dept) =>
    dept.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="
              relative 
              z-10 
              w-full 
              max-w-2xl 
              bg-white 
              rounded-2xl 
              border 
              border-slate-200/80 
              shadow-xl 
              overflow-hidden
              flex
              flex-col
              max-h-[95vh]
            "
          >
            {/* HEADER */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Nouvel Employé
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Création d`un profil collaborateur
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* BODY - Scrollable */}
            <div className="overflow-y-auto custom-scrollbar">
              <form id="add-employee-form" onSubmit={handleSubmit} className="p-6">
                
                {/* SECTION PHOTO */}
                <div className="mb-8 flex flex-col items-center justify-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="
                      w-20 
                      h-20 
                      rounded-full 
                      border border-slate-200 
                      bg-slate-50 
                      flex 
                      items-center 
                      justify-center 
                      cursor-pointer 
                      overflow-hidden
                      group
                      relative
                    "
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
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-3">
                    Photo de profil
                  </p>
                </div>

                {/* GRID FORMULAIRE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <FormInput
                    label="Prénom"
                    name="firstName"
                    icon={User}
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Ex: Junior"
                    required
                  />

                  <FormInput
                    label="Nom de famille"
                    name="lastName"
                    icon={User}
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Ex: Muteba"
                    required
                  />

                  <FormInput
                    label="Adresse Email"
                    name="email"
                    type="email"
                    icon={Mail}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="junior@shop.com"
                    required
                  />

                  <FormInput
                    label="Numéro de Téléphone"
                    name="phone"
                    type="tel"
                    icon={Phone}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Ex: 812345678"
                    required
                  />

                  {/* SÉLECTEUR DE RÔLE PERSONNALISÉ AVEC RECHERCHE */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck size={12} /> Rôle d`exploitation
                    </label>
                    
                    {/* Déclencheur du Dropdown */}
                    <div
                      onClick={() => {
                        setShowRoleDropdown(!showRoleDropdown);
                        setShowDeptDropdown(false); // Ferme l'autre menu s'il est ouvert
                      }}
                      className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white flex justify-between items-center cursor-pointer select-none hover:border-indigo-500 transition-colors"
                    >
                      <span className="text-slate-800">{formData.role}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showRoleDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Menu déroulant de recherche */}
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
                              placeholder="Rechercher un rôle..."
                              value={roleSearch}
                              onChange={(e) => setRoleSearch(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} 
                              className="w-full text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div className="space-y-0.5">
                            {filteredRoles.length > 0 ? (
                              filteredRoles.map((role) => {
                                const isSelected = formData.role === role;
                                return (
                                  <div
                                    key={role}
                                    onClick={() => {
                                      setFormData({ ...formData, role });
                                      setShowRoleDropdown(false);
                                      setRoleSearch("");
                                    }}
                                    className={`
                                      text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between
                                      ${isSelected 
                                        ? 'bg-indigo-50 text-indigo-600 font-bold' 
                                        : 'text-slate-700 hover:bg-slate-50'
                                      }
                                    `}
                                  >
                                    <span>{role}</span>
                                    {isSelected && <Check size={12} className="text-indigo-600" />}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-slate-400 text-center py-3 font-medium">
                                Aucun rôle trouvé
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* NOUVEAU : SÉLECTEUR DE DÉPARTEMENT PERSONNALISÉ AVEC RECHERCHE */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Briefcase size={12} /> Département
                    </label>
                    
                    {/* Déclencheur du Dropdown */}
                    <div
                      onClick={() => {
                        setShowDeptDropdown(!showDeptDropdown);
                        setShowRoleDropdown(false); // Ferme l'autre menu s'il est ouvert
                      }}
                      className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white flex justify-between items-center cursor-pointer select-none hover:border-indigo-500 transition-colors"
                    >
                      <span className="text-slate-800">{formData.department}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showDeptDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Menu déroulant de recherche interne */}
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
                              placeholder="Rechercher un département..."
                              value={deptSearch}
                              onChange={(e) => setDeptSearch(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} 
                              className="w-full text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            />
                          </div>

                          <div className="space-y-0.5">
                            {filteredDepartments.length > 0 ? (
                              filteredDepartments.map((dept) => {
                                const isSelected = formData.department === dept;
                                return (
                                  <div
                                    key={dept}
                                    onClick={() => {
                                      setFormData({ ...formData, department: dept });
                                      setShowDeptDropdown(false);
                                      setDeptSearch("");
                                    }}
                                    className={`
                                      text-xs font-medium px-2.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between
                                      ${isSelected 
                                        ? 'bg-indigo-50 text-indigo-600 font-bold' 
                                        : 'text-slate-700 hover:bg-slate-50'
                                      }
                                    `}
                                  >
                                    <span>{dept}</span>
                                    {isSelected && <Check size={12} className="text-indigo-600" />}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-slate-400 text-center py-3 font-medium">
                                Aucun département trouvé
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
                    placeholder="••••••••"
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

            {/* FOOTER */}
            <div className="p-5 border-t border-slate-100 bg-[#fcfdfe] shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="add-employee-form"
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Créer l`employé
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ================= SOUS-COMPOSANT INPUT =================

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
            className={`w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white ${rightElement ? 'pr-10' : ''}`}
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