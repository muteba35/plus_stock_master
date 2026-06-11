"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Eye,
  Loader2,
  Plus,
  Search,
  Store,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Boutique {
  id: string;
  nom: string;
  secteurActivite: string;
  deviseParDefaut: string;
  tailleBusiness: string;
  plan: string;
  statutPaiement: string;
  trialExpiresAt?: string;
  isActive: boolean;
  createdAt?: string;
}

interface BoutiqueForm {
  nom: string;
  secteurActivite: string;
  deviseParDefaut: string;
  tailleBusiness: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const SECTEURS = [
  "Commerce Général",
  "Supermarché",
  "Pharmacie",
  "Restaurant",
  "Fast-food",
  "Bar",
  "Café",
  "Boutique de vêtements",
  "Salon de coiffure",
  "Quincaillerie",
  "Autre",
];

const DEVISES = ["USD ($)", "CDF (FC)", "EUR (€)"];
const TAILLES = ["1-2 employés", "3-10 employés", "10+ employés"];

const DEFAULT_FORM: BoutiqueForm = {
  nom: "",
  secteurActivite: "Commerce Général",
  deviseParDefaut: "USD ($)",
  tailleBusiness: "1-2 employés",
};

const readApiMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return { data, message: data?.message || fallback };
  } catch {
    return { data: null, message: fallback };
  }
};

const formatDate = (date?: string) => {
  if (!date) return "Non defini";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Non defini";
  }
};

export default function BoutiquePage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BoutiqueForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const syncSession = useCallback((data: { token?: string; permissions?: string[]; boutique?: Boutique }) => {
    if (data.token) {
      localStorage.setItem("token", data.token);
      document.cookie = `stockmaster_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }

    if (Array.isArray(data.permissions)) {
      localStorage.setItem("user_permissions", JSON.stringify(data.permissions));
    }

    if (data.boutique) {
      const currentProfile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      localStorage.setItem(
        "user_profile",
        JSON.stringify({
          ...currentProfile,
          boutiqueActive: data.boutique.id,
          boutique: data.boutique,
        })
      );
    }

    window.dispatchEvent(new Event("userProfileUpdated"));
  }, []);

  const fetchBoutiques = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/boutiques`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Impossible de charger les boutiques.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      setBoutiques(data.boutiques || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de communication avec le serveur.";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchBoutiques();
  }, [fetchBoutiques]);

  const filteredBoutiques = useMemo(
    () =>
      boutiques.filter(
        (boutique) =>
          boutique.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          boutique.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase()) ||
          boutique.deviseParDefaut.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [boutiques, searchTerm]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const handleOpenCreate = () => {
    setFormData(DEFAULT_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCreateBoutique = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!formData.nom.trim()) {
      setFormError("Le nom de la boutique est requis.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/boutiques`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          nom: formData.nom.trim(),
        }),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la creation de la boutique.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      syncSession(data);
      await fetchBoutiques();
      setIsModalOpen(false);
      showToast("success", data.message || "Boutique creee avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la creation de la boutique.";
      setFormError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateBoutique = async (boutique: Boutique) => {
    if (boutique.isActive) return;

    try {
      setActivatingId(boutique.id);
      const response = await fetch(`${API_URL}/boutiques/${boutique.id}/active`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors du changement de boutique.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      syncSession(data);
      setBoutiques((current) =>
        current.map((item) => ({
          ...item,
          isActive: item.id === boutique.id,
        }))
      );
      showToast("success", data.message || "Boutique active changee avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de changer de boutique active.";
      showToast("error", message);
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800 relative overflow-hidden">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 right-6 z-[100] max-w-md"
          >
            <div
              className={`p-3 text-xs font-semibold rounded-xl border flex items-center gap-2 shadow-sm ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestion des Boutiques</h1>
          <p className="text-xs text-slate-400 font-medium">
            Creez vos points de vente et choisissez la boutique active de votre session.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
        >
          <Plus size={14} /> Nouvelle boutique
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Boutiques" value={boutiques.length} icon={Store} tone="indigo" />
        <SummaryCard label="Active" value={boutiques.filter((item) => item.isActive).length} icon={UserCheck} tone="emerald" />
        <SummaryCard label="Plans essai" value={boutiques.filter((item) => item.statutPaiement === "Essai").length} icon={Users} tone="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher une boutique, un secteur ou une devise..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-12 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-400">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <span className="text-xs font-medium">Chargement de vos boutiques...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Boutique</th>
                  <th className="px-6 py-4">Secteur</th>
                  <th className="px-6 py-4">Devise</th>
                  <th className="px-6 py-4">Taille</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBoutiques.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-medium">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto"
                      >
                        <div className="p-3 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                          <AlertCircle size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Aucune boutique trouvee</p>
                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                          Aucune boutique ne correspond a votre recherche. Vous pouvez creer un nouveau point de vente.
                        </p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  filteredBoutiques.map((boutique) => (
                    <tr key={boutique.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                            {boutique.nom.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{boutique.nom}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Creee le {formatDate(boutique.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{boutique.secteurActivite}</td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold">
                          {boutique.deviseParDefaut}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{boutique.tailleBusiness}</td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-bold">
                          {boutique.plan || "Free"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-md font-bold ${
                            boutique.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {boutique.isActive ? "Active" : boutique.statutPaiement || "Disponible"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-indigo-600 p-1.5 transition-colors"
                            title="Consulter"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActivateBoutique(boutique)}
                            disabled={boutique.isActive || activatingId === boutique.id}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors inline-flex items-center gap-1.5 ${
                              boutique.isActive
                                ? "bg-emerald-50 text-emerald-600 cursor-default"
                                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            } disabled:opacity-70`}
                          >
                            {activatingId === boutique.id && <Loader2 size={12} className="animate-spin" />}
                            {boutique.isActive ? "Selectionnee" : "Activer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BoutiqueModal
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        formData={formData}
        error={formError}
        onChange={handleChange}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        onSubmit={handleCreateBoutique}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size: number }>;
  tone: "indigo" | "emerald" | "amber";
}) {
  const tones = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{value}</h3>
      </div>
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

function BoutiqueModal({
  isOpen,
  isSubmitting,
  formData,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  formData: BoutiqueForm;
  error: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nouvelle Boutique</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Creation d&apos;un point de vente lie a votre compte.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-5">
              {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput
                  label="Nom de la boutique"
                  name="nom"
                  icon={Store}
                  value={formData.nom}
                  onChange={onChange}
                  placeholder="Ex: StockMaster Kinshasa"
                  disabled={isSubmitting}
                  required
                />

                <SelectInput
                  label="Secteur d'activite"
                  name="secteurActivite"
                  icon={Building2}
                  value={formData.secteurActivite}
                  onChange={onChange}
                  disabled={isSubmitting}
                  options={SECTEURS}
                />

                <SelectInput
                  label="Devise par defaut"
                  name="deviseParDefaut"
                  icon={Coins}
                  value={formData.deviseParDefaut}
                  onChange={onChange}
                  disabled={isSubmitting}
                  options={DEVISES}
                />

                <SelectInput
                  label="Taille business"
                  name="tailleBusiness"
                  icon={Users}
                  value={formData.tailleBusiness}
                  onChange={onChange}
                  disabled={isSubmitting}
                  options={TAILLES}
                />
              </div>

              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold leading-relaxed">
                Cette boutique deviendra automatiquement la boutique active. Les nouveaux roles, departements,
                employes et futures donnees seront rattaches a cette boutique active.
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:bg-slate-400"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Creer la boutique
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TextInput({
  label,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>
      <input
        {...props}
        className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
      />
    </div>
  );
}

function SelectInput({
  label,
  icon: Icon,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>
      <div className="relative">
        <select
          {...props}
          className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white appearance-none cursor-pointer"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
