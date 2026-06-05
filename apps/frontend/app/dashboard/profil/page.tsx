"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  Globe, 
  Hash, 
  Edit2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Camera,
  Check,
  X,
  Lock,
  Building // <-- AJOUT DE L'ICÔNE POUR LE DÉPARTEMENT
} from "lucide-react";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string | null; // null signifie que c'est l'Admin Général (Règle d'Or)
  role: string;          // Libellé dynamique renvoyé par le backend ("Propriétaire", "RH", etc.)
  departementId: string | null; // <-- AJOUT ICI
  departement: string;          // <-- AJOUT ICI (Libellé dynamique ex: "Comptabilité")
  bio: string;
  country: string;
  city: string;
  postalCode: string;
  taxId: string;
  avatar?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d[^A-Za-z0-9]]{8,}$/;
const phoneRegex = /^[0-9]{9}$/;

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = (error) => reject(error);
  });
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState<UserProfile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pwdHasLength = newPassword.length >= 8;
  const pwdHasLower = /[a-z]/.test(newPassword);
  const pwdHasUpper = /[A-Z]/.test(newPassword);
  const pwdHasNumber = /\d/.test(newPassword);
  const pwdHasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  // ÉVALUATION DE LA RÈGLE D'OR : Si pas de roleId, c'est le créateur/propriétaire de la boutique
  const isOwner = userData?.roleId === null;

  useEffect(() => {
    const fetchConnectedUser = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération du profil");
        }

        const data = await response.json();
        setUserData(data);
        setEditFormData(data); 
      } catch (error) {
        console.error("Erreur lors de la récupération du profil :", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectedUser();
  }, []);

  const handleEditClick = () => {
    if (userData) {
      setEditFormData({ ...userData });
      setIsEditing(true);
      setProfileMessage({ type: "", text: "" });
    }
  };

  const handleCancelClick = () => {
    if (userData) {
      setEditFormData({ ...userData });
      setIsEditing(false);
      setSelectedImage(null);
      setPreviewUrl(null);
      setProfileMessage({ type: "", text: "" });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (editFormData) {
      if (isOwner) {
        if (!nameRegex.test(editFormData.firstName)) {
          return setProfileMessage({ type: "error", text: "Le prénom est invalide (minimum 2 lettres)." });
        }
        if (!nameRegex.test(editFormData.lastName)) {
          return setProfileMessage({ type: "error", text: "Le nom est invalide (minimum 2 lettres)." });
        }
        if (!emailRegex.test(editFormData.email)) {
          return setProfileMessage({ type: "error", text: "L'adresse email est invalide." });
        }
      }

      if (!phoneRegex.test(editFormData.phone)) {
        return setProfileMessage({ type: "error", text: "Le numéro de téléphone doit contenir exactement 9 chiffres." });
      }

      setProfileMessage({ type: "", text: "" });

      try {
        const token = localStorage.getItem("token");
        
        let base64Avatar = userData?.avatar || "";
        if (selectedImage) {
          base64Avatar = await convertToBase64(selectedImage);
        }
        
        const payload = {
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          email: editFormData.email,
          phone: editFormData.phone,
          bio: editFormData.bio,
          country: "République Démocratique du Congo",
          city: editFormData.city,
          postalCode: editFormData.postalCode,
          taxId: editFormData.taxId,
          avatar: base64Avatar
        };

        const response = await fetch(`${API_URL}/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de la mise à jour");
        }

        const updatedData = await response.json();
        
        localStorage.setItem("user_profile", JSON.stringify(updatedData));
        window.dispatchEvent(new Event("userProfileUpdated"));
        
        setUserData(updatedData);
        setEditFormData(updatedData);
        
        setIsEditing(false);
        setSelectedImage(null);
        setPreviewUrl(null);
        setProfileMessage({ type: "success", text: "Profil mis à jour avec succès !" });
        setTimeout(() => setProfileMessage({ type: "", text: "" }), 3000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde.";
        setProfileMessage({ type: "error", text: errorMessage });
      }
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Veuillez remplir tous les champs de sécurité." });
      return;
    }
    
    if (!passwordRegex.test(newPassword)) {
      setPasswordMessage({ type: "error", text: "Le nouveau mot de passe ne respecte pas toutes les règles de sécurité." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage({ type: "error", text: data.error || "Erreur lors de la mise à jour du mot de passe." });
        return;
      }

      setPasswordMessage({ type: "success", text: data.message || "Mot de passe mis à jour avec succès !" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordFocused(false);
    } catch (error) {
      console.error("Erreur mot de passe :", error);
      setPasswordMessage({ type: "error", text: "Erreur serveur lors du changement de mot de passe." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f9fafd]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Chargement du profil connecté...</p>
        </div>
      </div>
    );
  }

  if (!userData || !editFormData) {
    return (
      <div className="p-6 text-center text-sm font-semibold text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
        Impossible de charger les informations de l&apos;utilisateur connecté. Veuillez vous reconnecter.
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      
      {/* SECTION 1 : EN-TÊTE DU PROFIL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          
          <div 
            className={`relative group ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={isEditing ? handleAvatarClick : undefined}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Aperçu avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : userData.avatar ? (
              <img 
                src={userData.avatar} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-white shadow-md flex items-center justify-center font-black text-indigo-600 text-3xl uppercase">
                {userData.firstName?.[0]}{userData.lastName?.[0]}
              </div>
            )}

            {isEditing && (
              <button 
                type="button"
                className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white border-2 border-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Camera size={12} />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2 capitalize">
              {userData.firstName} {userData.lastName}
            </h2>
            
            {/* BADGES ALIGNÉS DYNAMIQUEMENT */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <p className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-md">
                {userData.role}
              </p>
              {/* BADGE DEPARTEMENT (S'affiche si présent) */}
              {userData.departement && (
                <p className="text-xs text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Building size={11} /> {userData.departement}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium pt-1">
              <MapPin size={13} className="text-slate-400" />
              <span>{userData.city || "Non spécifié"}, République Démocratique du Congo</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
              <Facebook size={14} />
            </button>
            <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
              <Twitter size={14} />
            </button>
            <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
              <Linkedin size={14} />
            </button>
            <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
              <Instagram size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button 
                onClick={handleCancelClick}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
              >
                <X size={13} /> Annuler
              </button>
            )}
            <button 
              onClick={isEditing ? handleSaveProfile : handleEditClick}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all ${
                isEditing ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isEditing ? (
                <>
                  <Check size={13} /> Enregistrer
                </                >
              ) : (
                <>
                  <Edit2 size={12} /> Éditer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Message de notification Profil */}
      {profileMessage.text && (
        <div className={`p-4 text-sm font-semibold rounded-2xl border ${
          profileMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {profileMessage.text}
        </div>
      )}

      {/* SECTION 2 : INFORMATIONS PERSONNELLES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Informations Personnelles</h3>
            <p className="text-[11px] text-slate-400 font-medium">Vos coordonnées de gestion de la plateforme</p>
          </div>
          {!isEditing && (
            <button onClick={handleEditClick} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
              <Edit2 size={14} />
            </button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <User size={12} /> Prénom {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.firstName || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100 capitalize">{userData.firstName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <User size={12} /> Nom de famille {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.lastName || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100 capitalize">{userData.lastName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Mail size={12} /> Adresse Email {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="email" 
                value={editFormData.email || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Phone size={12} /> Numéro de Téléphone (9 chiffres)
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.phone || ""}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="Ex: 812345678"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.phone}</p>
            )}
          </div>

          {/* CHAMP DÉPARTEMENT EN LECTURE SEULE - SÉCURISÉ PAR CADENAS SI IS_EDITING */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Building size={12} /> Département {isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">
              {userData.departement || "Non spécifié"}
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <FileText size={12} /> Biographie / Rôle d&apos;exploitation {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <textarea 
                rows={3}
                value={editFormData.bio || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-medium leading-relaxed text-slate-600 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3 : ADRESSE ET PARAMÈTRES LÉGAUX */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Adresse & Données Fiscales</h3>
            <p className="text-[11px] text-slate-400 font-medium">Localisation et informations réglementaires de l&apos;entreprise</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Globe size={12} /> Pays
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value="République Démocratique du Congo"
                disabled
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed select-none"
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">République Démocratique du Congo</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <MapPin size={12} /> Ville / Commune {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.city || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.city}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Hash size={12} /> Code Postal {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.postalCode || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, postalCode: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.postalCode}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Briefcase size={12} /> Numéro National Impôt (TAX ID) {!isOwner && isEditing && <Lock size={10} className="text-slate-400 inline" />}
            </label>
            {isEditing ? (
              <input 
                type="text" 
                value={editFormData.taxId || ""}
                disabled={!isOwner}
                onChange={(e) => setEditFormData({...editFormData, taxId: e.target.value})}
                className={`w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 ${!isOwner ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none" : ""}`}
              />
            ) : (
              <p className="text-xs font-bold text-slate-800 bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">{userData.taxId}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4 : SÉCURITÉ & AUTHENTIFICATION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-[#fcfdfe]">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Sécurité & Authentification</h3>
          <p className="text-[11px] text-slate-400 font-medium">Mettez à jour vos identifiants d&apos;accès régulièrement pour protéger la caisse</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5 layout-form max-w-xl">
          {passwordMessage.text && (
            <div className={`p-3 text-xs font-semibold rounded-xl border ${
              passwordMessage.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Lock size={12} /> Mot de passe actuel
            </label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Lock size={12} /> Nouveau mot de passe
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => {
                  if (!newPassword) setIsPasswordFocused(false);
                }}
                placeholder="Nouveau mot de passe"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50/30"
              />
              
              {(isPasswordFocused || newPassword.length > 0) && (
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 transition-all">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Exigences :</p>
                  <div className={`flex items-center gap-2 text-xs font-medium ${pwdHasLength ? "text-emerald-600" : "text-rose-500"}`}>
                    {pwdHasLength ? <Check size={14} /> : <X size={14} />} 8 caractères minimum
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${pwdHasUpper ? "text-emerald-600" : "text-rose-500"}`}>
                    {pwdHasUpper ? <Check size={14} /> : <X size={14} />} 1 majuscule
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${pwdHasLower ? "text-emerald-600" : "text-rose-500"}`}>
                    {pwdHasLower ? <Check size={14} /> : <X size={14} />} 1 minuscule
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${pwdHasNumber ? "text-emerald-600" : "text-rose-500"}`}>
                    {pwdHasNumber ? <Check size={14} /> : <X size={14} />} 1 chiffre
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${pwdHasSpecial ? "text-emerald-600" : "text-rose-500"}`}>
                    {pwdHasSpecial ? <Check size={14} /> : <X size={14} />} 1 caractère spécial (@$!%*?&#-_...)
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Lock size={12} /> Confirmer le mot de passe
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répéter le mot de passe"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-slate-50/30"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <button 
              type="submit"
              className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl border border-slate-900 hover:bg-slate-800 shadow-sm transition-all flex items-center gap-1.5"
            >
              Mettre à jour le mot de passe
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}