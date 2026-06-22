"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Edit2,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import TeamCsvImportModal, { type TeamCsvRow } from "../../equipe/TeamCsvImportModal";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

const SECTEURS = [
  "Commerce GÃƒÂ©nÃƒÂ©ral",
  "SupermarchÃƒÂ©",
  "Pharmacie",
  "Restaurant",
  "Fast-food",
  "Bar",
  "CafÃƒÂ©",
  "Boutique de vÃƒÂªtements",
  "Salon de coiffure",
  "Quincaillerie",
  "Autre",
];

const DEVISES = ["USD ($)", "CDF (FC)", "EUR (Ã¢â€šÂ¬)"];
const TAILLES = ["1-2 employÃƒÂ©s", "3-10 employÃƒÂ©s", "10+ employÃƒÂ©s"];

const DEFAULT_FORM: BoutiqueForm = {
  nom: "",
  secteurActivite: "Commerce GÃƒÂ©nÃƒÂ©ral",
  deviseParDefaut: "USD ($)",
  tailleBusiness: "1-2 employÃƒÂ©s",
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
  const [sectorFilter, setSectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedBoutique, setSelectedBoutique] = useState<Boutique | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [boutiqueToDelete, setBoutiqueToDelete] = useState<Boutique | null>(null);
  const [formData, setFormData] = useState<BoutiqueForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

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
      setUserPermissions(data.permissions);
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

    try {
      setUserPermissions(JSON.parse(localStorage.getItem("user_permissions") || "[]"));
      const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
      setIsOwner(profile.roleId === null || profile.roleId === "");
    } catch {
      setUserPermissions([]);
      setIsOwner(false);
    }
  }, [fetchBoutiques]);

  const canView = isOwner || userPermissions.includes("VOIR_BOUTIQUES");
  const canCreate = isOwner || userPermissions.includes("CREER_BOUTIQUE");
  const canEdit = isOwner || userPermissions.includes("MODIFIER_BOUTIQUE");
  const canDelete = isOwner || userPermissions.includes("SUPPRIMER_BOUTIQUE");
  const canActivate = isOwner || userPermissions.includes("ACTIVER_BOUTIQUE");

  const filteredBoutiques = useMemo(
    () =>
      boutiques.filter((boutique) => {
        const query = searchTerm.toLowerCase();
        const statusLabel = boutique.isActive ? "active" : (boutique.statutPaiement || "disponible").toLowerCase();
        const matchesSearch =
          boutique.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          boutique.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase()) ||
          boutique.deviseParDefaut.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (boutique.plan || "").toLowerCase().includes(query) ||
          statusLabel.includes(query);
        const matchesSector = sectorFilter === "all" || boutique.secteurActivite === sectorFilter;
        const matchesCurrency = currencyFilter === "all" || boutique.deviseParDefaut === currencyFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && boutique.isActive) ||
          (statusFilter === "inactive" && !boutique.isActive);

        return matchesSearch && matchesSector && matchesCurrency && matchesStatus;
      }),
    [boutiques, currencyFilter, searchTerm, sectorFilter, statusFilter]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const handleOpenCreate = () => {
    setSelectedBoutique(null);
    setModalMode("create");
    setFormData(DEFAULT_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (boutique: Boutique) => {
    setSelectedBoutique(boutique);
    setModalMode("edit");
    setFormData({
      nom: boutique.nom,
      secteurActivite: boutique.secteurActivite,
      deviseParDefaut: boutique.deviseParDefaut,
      tailleBusiness: boutique.tailleBusiness,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenView = (boutique: Boutique) => {
    setSelectedBoutique(boutique);
    setModalMode("view");
    setFormData({
      nom: boutique.nom,
      secteurActivite: boutique.secteurActivite,
      deviseParDefaut: boutique.deviseParDefaut,
      tailleBusiness: boutique.tailleBusiness,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmitBoutique = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (modalMode === "view") return;

    if (!formData.nom.trim()) {
      setFormError("Le nom de la boutique est requis.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isEdit = modalMode === "edit" && selectedBoutique;
      const response = await fetch(isEdit ? `${API_URL}/boutiques/${selectedBoutique.id}` : `${API_URL}/boutiques`, {
        method: isEdit ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          nom: formData.nom.trim(),
        }),
      });

      const { data, message } = await readApiMessage(
        response,
        isEdit ? "Erreur lors de la modification de la boutique." : "Erreur lors de la creation de la boutique."
      );

      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      if (data.token || data.permissions || data.boutique?.isActive) {
        syncSession(data);
      }

      await fetchBoutiques();
      setIsModalOpen(false);
      showToast("success", data.message || "Configuration enregistree avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'enregistrement.";
      setFormError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const importBoutiques = async (rows: TeamCsvRow[]) => {
    let imported = 0;

    for (const row of rows) {
      const payload = {
        nom: row.nom?.trim(),
        secteurActivite: row.secteur?.trim() || row.secteurActivite?.trim(),
        deviseParDefaut: row.devise?.trim() || row.deviseParDefaut?.trim(),
        tailleBusiness: row.taille?.trim() || row.tailleBusiness?.trim(),
      };

      const response = await fetch(`${API_URL}/boutiques`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const { data, message } = await readApiMessage(response, `Erreur sur la ligne ${row.line}.`);
      if (!response.ok || !data?.success) {
        throw new Error(`Ligne ${row.line}: ${message}`);
      }

      syncSession(data);
      imported += 1;
    }

    await fetchBoutiques();
    showToast("success", `${imported} boutique(s) importee(s) avec succes.`);
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
      await fetchBoutiques();
      showToast("success", data.message || "Boutique active changee avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de changer de boutique active.";
      showToast("error", message);
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeleteBoutique = async () => {
    if (!boutiqueToDelete) return;

    try {
      setDeletingId(boutiqueToDelete.id);
      const response = await fetch(`${API_URL}/boutiques/${boutiqueToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la suppression de la boutique.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      setBoutiques((current) => current.filter((item) => item.id !== boutiqueToDelete.id));
      setBoutiqueToDelete(null);
      showToast("success", data.message || "Boutique supprimee avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de supprimer cette boutique.";
      showToast("error", message);
    } finally {
      setDeletingId(null);
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

        {canCreate && (
          <div className="flex flex-col min-[420px]:flex-row gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all"
            >
              <FileSpreadsheet size={14} /> Importer Excel
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
            >
              <Plus size={14} /> Nouvelle boutique
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-visible">
        <div ref={filterMenuRef} className="p-4 border-b border-slate-100 flex items-center gap-3 relative">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher une boutique, un secteur, une devise ou un statut..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
                className="absolute right-4 top-full mt-2 z-50 w-[min(calc(100vw-4rem),420px)] origin-top-right rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70 ring-1 ring-slate-900/5"
              >
                <div className="grid grid-cols-1 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Secteur</span>
                    <select value={sectorFilter} onChange={(event) => { setSectorFilter(event.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les secteurs</option>
                      {Array.from(new Set(boutiques.map((boutique) => boutique.secteurActivite))).map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Devise</span>
                    <select value={currencyFilter} onChange={(event) => { setCurrencyFilter(event.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Toutes les devises</option>
                      {Array.from(new Set(boutiques.map((boutique) => boutique.deviseParDefaut))).map((currency) => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Statut</span>
                    <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setIsFilterOpen(false); }} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-indigo-500">
                      <option value="all">Tous les statuts</option>
                      <option value="active">Active</option>
                      <option value="inactive">Non active</option>
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
              <span className="text-xs font-medium">Chargement de vos boutiques...</span>
            </div>
          ) : !canView ? (
            <EmptyState title="Acces restreint" message="Vous n'avez pas la permission de consulter les boutiques." />
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
                    <td colSpan={7}>
                      <EmptyState title="Aucune boutique trouvee" message="Aucune boutique ne correspond a votre recherche." />
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
                            onClick={() => handleOpenView(boutique)}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 transition-colors"
                            title="Consulter"
                          >
                            <Eye size={15} />
                          </button>

                          {canActivate && (
                            <button
                              type="button"
                              onClick={() => handleActivateBoutique(boutique)}
                              disabled={boutique.isActive || activatingId === boutique.id}
                              className={`p-1.5 transition-colors ${
                                boutique.isActive
                                  ? "text-emerald-500 cursor-default"
                                  : "text-slate-400 hover:text-emerald-600"
                              } disabled:opacity-60`}
                              title={boutique.isActive ? "Boutique active" : "Activer la boutique"}
                            >
                              {activatingId === boutique.id ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(boutique)}
                              className="text-slate-400 hover:text-amber-600 p-1.5 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setBoutiqueToDelete(boutique)}
                              disabled={boutique.isActive || deletingId === boutique.id}
                              className={`p-1.5 transition-colors ${
                                boutique.isActive
                                  ? "text-slate-200 cursor-not-allowed"
                                  : "text-slate-400 hover:text-rose-600"
                              }`}
                              title={boutique.isActive ? "Activez une autre boutique avant suppression" : "Supprimer"}
                            >
                              {deletingId === boutique.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          )}
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

      <TeamCsvImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importer des boutiques"
        columns={[
          { key: "nom", label: "nom", required: true },
          { key: "secteur", label: "secteur", required: true },
          { key: "devise", label: "devise", required: true },
          { key: "taille", label: "taille", required: true },
        ]}
        example={{ nom: "Boutique Gombe", secteur: "Commerce Général", devise: "CDF (FC)", taille: "3-10 employés" }}
        onImport={importBoutiques}
      />

      <BoutiqueModal
        isOpen={isModalOpen}
        mode={modalMode}
        isSubmitting={isSubmitting}
        formData={formData}
        error={formError}
        onChange={handleChange}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        onSubmit={handleSubmitBoutique}
      />

      <DeleteBoutiqueModal
        boutique={boutiqueToDelete}
        isDeleting={Boolean(boutiqueToDelete && deletingId === boutiqueToDelete.id)}
        onClose={() => !deletingId && setBoutiqueToDelete(null)}
        onConfirm={handleDeleteBoutique}
      />
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="px-6 py-16 text-center text-slate-400 font-medium">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto"
      >
        <div className="p-3 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
          <AlertCircle size={20} />
        </div>
        <p className="text-xs font-bold text-slate-700">{title}</p>
        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">{message}</p>
      </motion.div>
    </div>
  );
}

function DeleteBoutiqueModal({
  boutique,
  isDeleting,
  onClose,
  onConfirm,
}: {
  boutique: Boutique | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {boutique && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden text-slate-800"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfdfe]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Supprimer la boutique</h3>
                  <p className="text-[11px] text-slate-400">Confirmation requise avant suppression.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 text-center space-y-4 text-xs">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm font-medium">
                  Etes-vous sur de vouloir supprimer definitivement la boutique{" "}
                  <span className="font-bold text-slate-900">{boutique.nom}</span> ?
                </p>
                <p className="text-slate-400 text-[10px] mt-1 font-medium">
                  Cette action est irreversible. La boutique active ne peut pas etre supprimee.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 hover:bg-slate-200/60 rounded-xl font-bold text-slate-500 text-[11px] transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl font-bold text-[11px] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
              >
                {isDeleting && <Loader2 size={12} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function BoutiqueModal({
  isOpen,
  mode,
  isSubmitting,
  formData,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  isSubmitting: boolean;
  formData: BoutiqueForm;
  error: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isView = mode === "view";
  const title = mode === "create" ? "Nouvelle Boutique" : mode === "edit" ? "Modifier la Boutique" : "Detail de la Boutique";

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
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {isView ? "Consultation du point de vente." : "Configuration du point de vente lie a votre compte."}
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
                  disabled={isSubmitting || isView}
                  required
                />

                <SelectInput
                  label="Secteur d'activite"
                  name="secteurActivite"
                  icon={Building2}
                  value={formData.secteurActivite}
                  onChange={onChange}
                  disabled={isSubmitting || isView}
                  options={SECTEURS}
                />

                <SelectInput
                  label="Devise par defaut"
                  name="deviseParDefaut"
                  icon={Coins}
                  value={formData.deviseParDefaut}
                  onChange={onChange}
                  disabled={isSubmitting || isView}
                  options={DEVISES}
                />

                <SelectInput
                  label="Taille business"
                  name="tailleBusiness"
                  icon={Users}
                  value={formData.tailleBusiness}
                  onChange={onChange}
                  disabled={isSubmitting || isView}
                  options={TAILLES}
                />
              </div>

              {!isView && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold leading-relaxed">
                  {mode === "create"
                    ? "Cette boutique deviendra automatiquement la boutique active apres creation."
                    : "La modification conserve les donnees deja rattachees a cette boutique."}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  {isView ? "Fermer" : "Annuler"}
                </button>
                {!isView && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:bg-slate-400"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {mode === "edit" ? "Enregistrer" : "Creer la boutique"}
                  </button>
                )}
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
        className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
          className="w-full text-xs font-medium px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-500"
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
